import { useEffect, useCallback, useState } from "react"
import { useAuth } from "./useAuth"
import { db } from "../firebase"
import { collection, onSnapshot, doc, setDoc, updateDoc, getDoc } from "firebase/firestore"
import type { ScrapedChat, ChatMetadata } from "../types"

export const useChatScraper = () => {
    const { user } = useAuth()
    const [chats, setChats] = useState<ScrapedChat[]>([])
    const [loading, setLoading] = useState(true)
    const [activeChatId, setActiveChatId] = useState<string | null>(null)

    // 1. Listen to Cloud State (Firestore)
    useEffect(() => {
        if (!user) {
            setChats([])
            setLoading(false)
            return
        }

        const unsubscribe = onSnapshot(collection(db, "users", user.uid, "chats"), (snapshot) => {
            const loadedChats: ScrapedChat[] = []
            snapshot.forEach((doc) => {
                loadedChats.push(doc.data() as ScrapedChat)
            })
            // Sort by timestamp
            loadedChats.sort((a, b) => b.timestamp - a.timestamp)
            setChats(loadedChats)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [user])

    // 2. The "Anti-Gravity" Merge Logic
    const upsertChats = useCallback(async (detectedChats: ScrapedChat[]) => {
        if (!user) return

        // We process each detected chat
        const batchPromises = detectedChats.map(async (nc) => {
            const chatRef = doc(db, "users", user.uid, "chats", nc.id)

            // We need to read current state to decide logic (or use set with merge, but we have specific rules)
            // Optimization: We could use the local 'chats' state as a cache to avoid N reads, 
            // but for strict correctness in a race-prone env, reading is safer. 
            // However, Firestore reads cost money. Let's use the local 'chats' state since it's synced.

            const existing = chats.find(c => c.id === nc.id)

            if (!existing) {
                // New Chat -> Create
                await setDoc(chatRef, nc)
            } else {
                // Exists -> Update only if newer
                // Rule: "Upsert if Gemini has a newer lastInteracted date"
                // Actually, timestamp is the best metric.
                if (nc.timestamp > existing.timestamp) {
                    await updateDoc(chatRef, {
                        title: nc.title, // Update original title from network
                        lastInteracted: nc.lastInteracted,
                        timestamp: nc.timestamp,
                        url: nc.url
                    })
                }
            }
        })

        await Promise.all(batchPromises)
    }, [user, chats])

    // 3. Listen to Network Interceptor
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "GEMINI_CHATS_DETECTED") {
                const detected = event.data.payload as ScrapedChat[]
                upsertChats(detected)
            }

            if (event.data?.type === "GEMINI_URL_CHANGED") {
                const url = event.data.url
                const id = url.split("/app/")[1]?.split("?")[0]
                setActiveChatId(id || null)
            }
        }

        // Handshake
        window.postMessage({ type: "GEMINI_UI_READY" }, "*")

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [upsertChats])

    // 4. URL Tracking (Popstate + Initial Load)
    useEffect(() => {
        const checkUrl = () => {
            const id = window.location.pathname.split("/app/")[1]?.split("?")[0]
            setActiveChatId(id || null)
        }
        checkUrl()
        window.addEventListener("popstate", checkUrl)
        return () => window.removeEventListener("popstate", checkUrl)
    }, [])

    return {
        chats: chats.map(c => ({ ...c, isActive: c.id === activeChatId })), // Computed logic for active
        activeChatId,
        loading
    }
}
