import { useState, useEffect, useCallback, useRef } from "react"
import {
    GoogleAuthProvider,
    signInWithCredential,
    signOut,
    onAuthStateChanged,
    type User
} from "firebase/auth"
import { auth } from "../firebase"
import { logger } from "~utils/logger"

// Global auth state to prevent multiple hooks from conflicting
let globalUser: User | null = null
let globalLoading = true
const listeners = new Set<(user: User | null, loading: boolean) => void>()

const notifyListeners = () => {
    listeners.forEach(listener => listener(globalUser, globalLoading))
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(globalUser)
    const [loading, setLoading] = useState(globalLoading)
    const silentLoginAttempted = useRef(false)
    const userExplicitlyLoggedOut = useRef(false)
    const [logoutFlagLoaded, setLogoutFlagLoaded] = useState(false)

    // Load persisted logout flag from storage on mount
    useEffect(() => {
        chrome.storage.local.get("gemini_folders_logged_out", (result) => {
            userExplicitlyLoggedOut.current = result.gemini_folders_logged_out === true
            setLogoutFlagLoaded(true)
        })
    }, [])

    // Subscribe to global state
    useEffect(() => {
        const listener = (u: User | null, l: boolean) => {
            setUser(u)
            setLoading(l)
        }
        listeners.add(listener)
        return () => { listeners.delete(listener) }
    }, [])

    // 1. Firebase Auth Listener - Single source of truth for auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            globalUser = currentUser
            globalLoading = false
            notifyListeners()
        }, (error) => {
            logger.error("[Auth] Auth state error:", error)
            globalLoading = false
            notifyListeners()
        })
        return unsubscribe
    }, [])

    // Helper: Broadcast to Tabs (Only runs in Popup/Background context)
    const broadcast = useCallback(async (action: "SYNC_LOGIN" | "SYNC_LOGOUT") => {
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
            const tabs = await chrome.tabs.query({ url: "https://gemini.google.com/*" })
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action }).catch(() => { })
                }
            })
        }
    }, [])

    const login = useCallback(async (interactive: boolean = true) => {
        let currentToken: string | undefined;

        // If this is an interactive (manual) login, clear the logout flag
        if (interactive) {
            userExplicitlyLoggedOut.current = false
            chrome.storage.local.remove("gemini_folders_logged_out")
        }

        try {
            if (interactive) logger.log("Requesting Google Token...")

            const response = await chrome.runtime.sendMessage({
                action: "getAuthToken",
                interactive
            })

            if (chrome.runtime.lastError || !response || !response.token) {
                if (interactive) throw new Error(chrome.runtime.lastError?.message || response?.error || "No token")
                return
            }

            currentToken = response.token

            if (!auth.currentUser) {
                const credential = GoogleAuthProvider.credential(null, response.token)
                await signInWithCredential(auth, credential)
            }

            if (interactive) {
                logger.log("Login Successful. Broadcasting...")
                broadcast("SYNC_LOGIN")
            }
        } catch (error: any) {
            if (interactive) {
                console.error("Login failed:", error)

                if (
                    currentToken &&
                    (error.code === "auth/invalid-credential" ||
                        error.code === "auth/invalid-token" ||
                        error.message?.includes("token") ||
                        error.message?.includes("UNREGISTERED_ON_API_CONSOLE"))
                ) {
                    logger.warn("Token invalid or revoked. Clearing cache...", currentToken)
                    await chrome.runtime.sendMessage({
                        action: "removeCachedAuthToken",
                        token: currentToken
                    })
                }

                if (error.code === "auth/duplicate-raw-id") {
                    console.warn("Attempting to auto-fix auth corruption...")
                    await signOut(auth)
                }
            }
        }
    }, [broadcast])

    const logout = useCallback(async (shouldBroadcast: boolean = true) => {
        try {
            // Mark that user explicitly logged out — prevents auto-silent-login
            userExplicitlyLoggedOut.current = true
            chrome.storage.local.set({ gemini_folders_logged_out: true })

            // 1. Tell the background script to wipe the token
            await chrome.runtime.sendMessage({ action: "removeCachedToken" });

            // 2. Sign out of Firebase
            await signOut(auth)
            if (shouldBroadcast) {
                broadcast("SYNC_LOGOUT")
            }
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }, [broadcast])

    // 2. Synchronization Bridge (Listen for Login/Logout from Popup)
    useEffect(() => {
        const handleMsg = (msg: any) => {
            if (msg.action === "SYNC_LOGIN" && !auth.currentUser) {
                logger.log("[Auth] Sync Login Signal Received")
                userExplicitlyLoggedOut.current = false
                chrome.storage.local.remove("gemini_folders_logged_out")
                login(false)
            }
            if (msg.action === "SYNC_LOGOUT" && auth.currentUser) {
                logger.log("[Auth] Sync Logout Signal Received")
                userExplicitlyLoggedOut.current = true
                chrome.storage.local.set({ gemini_folders_logged_out: true })
                logout(false)
            }
        }
        chrome.runtime.onMessage.addListener(handleMsg)
        return () => chrome.runtime.onMessage.removeListener(handleMsg)
    }, [login, logout])

    // 3. Auto-Check on Mount (Silent Login) - Only run once, and only after logout flag is loaded
    useEffect(() => {
        if (!logoutFlagLoaded) return // Wait until we know the persisted logout state
        if (!loading && !user && !silentLoginAttempted.current && !userExplicitlyLoggedOut.current) {
            silentLoginAttempted.current = true
            login(false)
        }
    }, [loading, user, login, logoutFlagLoaded])

    return { user, loading, login, logout }
}