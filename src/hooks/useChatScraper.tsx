import { useEffect, useState, useRef } from "react"
import type { ScrapedChat } from "../types"

// Helper to traverse Shadow DOMs
const deepQuerySelectorAll = (selector: string, root: Node = document): Element[] => {
    const results: Element[] = []
    const walk = (node: Node) => {
        if (node instanceof Element) {
            if (node.matches(selector)) results.push(node)
            if (node.shadowRoot) walk(node.shadowRoot)
        }
        const children = node.childNodes
        for (let i = 0; i < children.length; i++) walk(children[i])
    }
    walk(root)
    return results
}

export const useChatScraper = () => {
    const [chats, setChats] = useState<ScrapedChat[]>([])
    const hasInterceptedRef = useRef(false)

    useEffect(() => {
        // Listener for Intercepted Data
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "GEMINI_URL_CHANGED") {
                const newUrl = event.data.url
                // Robust ID extraction (handles query params if any)
                const newId = newUrl.split("/app/")[1]?.split("?")[0]

                setChats(prev => {
                    const exists = prev.some(chat => chat.id === newId)

                    // If we navigated to a specific chat ID that we don't have yet, add it!
                    if (newId && !exists) {
                        // FIX: Better title cleaning
                        let cleanTitle = document.title.replace(" - Gemini", "").trim()
                        if (!cleanTitle || cleanTitle === "Google Gemini" || cleanTitle === "Gemini") {
                            cleanTitle = "New Chat"
                        }

                        const newChat: ScrapedChat = {
                            id: newId,
                            title: cleanTitle,
                            lastInteracted: "Today",
                            timestamp: Date.now(),
                            url: `/app/${newId}`,
                            isActive: true
                        }

                        // Add new chat to the TOP and set as active
                        return [newChat, ...prev].map(c => ({
                            ...c,
                            isActive: c.id === newId
                        }))
                    }

                    // Otherwise just update the active state
                    return prev.map(chat => ({
                        ...chat,
                        isActive: newUrl.includes(chat.id)
                    }))
                })
            } else if (event.data && event.data.type === "GEMINI_CHATS_INTERCEPTED") {
                const payload = event.data.payload as ScrapedChat[]
                console.log("[Gemini Folders] Received Intercepted Chats:", payload.length)

                hasInterceptedRef.current = true

                const currentPath = window.location.pathname
                const updatedChats = payload.map(chat => ({
                    ...chat,
                    isActive: currentPath.includes(chat.id)
                }))

                setChats(prevChats => {
                    // Merge incoming chats with existing ones
                    const chatMap = new Map(prevChats.map(c => [c.id, c]))
                    const newChats = payload.map(chat => ({
                        ...chat,
                        isActive: currentPath.includes(chat.id)
                    }))
                    newChats.forEach(c => chatMap.set(c.id, c))

                    // Convert back to array and sort by timestamp (descending)
                    return Array.from(chatMap.values())
                        .sort((a, b) => b.timestamp - a.timestamp)
                })
            }
        }

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [])

    // Fallback DOM Scraper (Race Condition Fix)
    useEffect(() => {
        const scrapeDom = () => {
            if (hasInterceptedRef.current) return

            const sideNav = deepQuerySelectorAll('side-navigation-content')[0] ||
                deepQuerySelectorAll('bard-sidenav')[0]
            if (!sideNav) return

            // Simple scraper for fallback
            const candidates = deepQuerySelectorAll('a[href*="/app/"]', sideNav)
            const scraped: ScrapedChat[] = []

            candidates.forEach((el, index) => {
                const text = el.textContent?.trim() || ""
                const href = el.getAttribute('href')
                if (!text || text.length < 2 || !href) return

                // Basic exclusions
                if (["Help", "Settings", "Activity"].some(s => text.includes(s))) return

                const id = href.split('/app/')[1]
                if (id) {
                    scraped.push({
                        id,
                        title: text,
                        lastInteracted: "",
                        timestamp: Date.now(), // Fallback for DOM scraped items
                        url: href,
                        isActive: window.location.pathname.includes(id)
                    })
                }
            })

            if (scraped.length > 0) {
                // Dedup
                const unique = new Map()
                scraped.forEach(c => unique.set(c.id, c))
                setChats(Array.from(unique.values()))
            }
        }

        // Run immediately and periodically until interception
        scrapeDom()
        const interval = setInterval(scrapeDom, 2000)

        return () => clearInterval(interval)
    }, [])

    // Keep active status updated
    useEffect(() => {
        const updateActive = () => {
            setChats(prev => prev.map(chat => ({
                ...chat,
                isActive: window.location.pathname.includes(chat.id)
            })))
        }
        const interval = setInterval(updateActive, 1000)
        window.addEventListener("popstate", updateActive)
        return () => {
            clearInterval(interval)
            window.removeEventListener("popstate", updateActive)
        }
    }, [])

    // FIX: Sync Active Chat Title (Poll sidebar for title updates)
    useEffect(() => {
        const syncTitle = () => {
            setChats(prev => {
                const activeIndex = prev.findIndex(c => c.isActive)
                if (activeIndex === -1) return prev

                const activeChat = prev[activeIndex]

                // Only try to update if the current title is generic
                if (activeChat.title !== "New Chat" && activeChat.title !== "Google Gemini") return prev

                // Try to find the link in the sidebar
                const sideNav = deepQuerySelectorAll('side-navigation-content')[0] || deepQuerySelectorAll('bard-sidenav')[0]
                if (!sideNav) return prev

                // Look for the link corresponding to this chat ID
                const link = deepQuerySelectorAll(`a[href*="${activeChat.id}"]`, sideNav)[0]
                if (!link || !link.textContent) return prev

                const realTitle = link.textContent.trim()

                // If we found a real title that is different, update state
                if (realTitle && realTitle.length > 0 && realTitle !== activeChat.title && realTitle !== "New Chat") {
                    const newChats = [...prev]
                    newChats[activeIndex] = { ...activeChat, title: realTitle }
                    return newChats
                }
                return prev
            })
        }

        // Check every 2 seconds
        const interval = setInterval(syncTitle, 2000)
        return () => clearInterval(interval)
    }, [])

    return {
        chats,
        loadAllChats: async () => { }, // Interceptor handles this
        loadMoreChats: () => {
            // Find the Gemini sidebar scroll container and scroll to bottom
            const scroller = document.querySelector('infinite-scroller') || document.querySelector('.gems-list-container')
            if (scroller) {
                scroller.scrollTop = scroller.scrollHeight;
            }
        },
        scrollToTop: () => {
            const scroller = document.querySelector('infinite-scroller') || document.querySelector('.gems-list-container')
            if (scroller) {
                scroller.scrollTop = 0;
            }
        },
        debugInfo: {
            chatsFound: chats.length,
            usingInterceptor: hasInterceptedRef.current,
            sidebarFound: !!(document.querySelector('infinite-scroller') || document.querySelector('.gems-list-container'))
        }
    }
}
