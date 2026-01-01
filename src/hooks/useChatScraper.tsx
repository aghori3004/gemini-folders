import { useEffect, useCallback } from "react"
import type { ScrapedChat } from "../types"
import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"

const localStorage = new Storage({
    area: "local"
})

export const useChatScraper = () => {
    // 1. Storage: The single source of truth
    const [chats, setChats] = useStorage<ScrapedChat[]>({
        key: "cached-chats",
        instance: localStorage
    }, [])

    // 2. Upsert Logic: Merges Network Data into Storage
    const upsertChats = useCallback((newChats: ScrapedChat[]) => {
        setChats(prev => {
            const chatMap = new Map((prev || []).map(c => [c.id, c]))

            newChats.forEach(nc => {
                const existing = chatMap.get(nc.id)
                chatMap.set(nc.id, {
                    ...existing,
                    ...nc,
                    // Preserve isActive if network data doesn't provide it
                    isActive: nc.isActive ?? existing?.isActive
                })
            })

            // Sort by Timestamp (Newest First)
            return Array.from(chatMap.values()).sort((a, b) => b.timestamp - a.timestamp)
        })
    }, [setChats])

    // 3. Event Listener: Network & URL Changes
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // A. Network Data Arrived
            if (event.data?.type === "GEMINI_CHATS_DETECTED") {
                const detected = event.data.payload as ScrapedChat[]
                upsertChats(detected)
            }

            // B. URL Changed (Optimistic "New Chat")
            if (event.data?.type === "GEMINI_URL_CHANGED") {
                const newUrl = event.data.url
                const newId = newUrl.split("/app/")[1]?.split("?")[0]

                if (!newId) return

                setChats(prev => {
                    const safePrev = prev || []

                    // Update Active State
                    const next = safePrev.map(c => ({
                        ...c,
                        isActive: c.id === newId
                    }))

                    // If ID is completely new, add it optimistically
                    if (!next.some(c => c.id === newId)) {
                        const newChat: ScrapedChat = {
                            id: newId,
                            title: "New Chat", // Will be overwritten by network later
                            lastInteracted: "Today",
                            timestamp: Date.now(),
                            url: `/app/${newId}`,
                            isActive: true
                        }
                        return [newChat, ...next]
                    }
                    return next
                })
            }
        }

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [upsertChats, setChats])

    // 4. Manual Load More (Optional, triggered by UI button)
    const loadMoreChats = useCallback(() => {
        const scroller = document.querySelector('infinite-scroller') || document.querySelector('.gems-list-container')
        if (scroller) scroller.scrollTop += 1000
    }, [])

    const scrollToTop = useCallback(() => {
        const scroller = document.querySelector('infinite-scroller') || document.querySelector('.gems-list-container')
        if (scroller) scroller.scrollTop = 0
    }, [])

    return {
        chats,
        loadMoreChats,
        scrollToTop
    }
}
