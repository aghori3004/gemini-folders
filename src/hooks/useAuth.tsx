import { useState, useEffect } from "react"
import {
    GoogleAuthProvider,
    signInWithCredential,
    signOut,
    onAuthStateChanged,
    type User
} from "firebase/auth"
import { auth } from "../firebase"

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser)
            setLoading(false)
        })
        return unsubscribe
    }, [])

    const login = async () => {
        try {
            console.log("Requesting Google Token from Background Script...")

            // Send message to background.ts
            const response = await chrome.runtime.sendMessage({ action: "getAuthToken" })

            if (response.error || !response.token) {
                throw new Error(response.error || "No token received from background")
            }

            console.log("Token received, signing into Firebase...")

            // Use the token to sign in
            const credential = GoogleAuthProvider.credential(null, response.token)
            await signInWithCredential(auth, credential)

            console.log("Firebase login successful")
        } catch (error) {
            console.error("Login failed:", error)
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
        } catch (error) {
            console.error("Logout failed:", error)
        }
    }

    return { user, loading, login, logout }
}