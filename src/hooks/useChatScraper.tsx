import { useEffect, useCallback, useState, useRef } from "react"
import { useAuth } from "./useAuth"
import { db } from "../firebase"
import { collection, onSnapshot, doc, setDoc, updateDoc, writeBatch } from "firebase/firestore"
import type { ScrapedChat } from "../types"
import { logger } from "~utils/logger"

// Helper to scroll the sidebar
const findSidebarScrollContainer = () => {
    const selectors = [
        'nav',
        'div[role="navigation"]',
        'infinite-scroller',
        'div[class*="scrollbar"]',
        'div[style*="overflow-y"]',
        'div[class*="overflow-auto"]',
        '[data-test-id="chat-list"]',
        '.sidebar-content',
        '.gem-list-container'
    ]

    for (const selector of selectors) {
        const el = document.querySelector(selector)
        if (el) {
            const style = window.getComputedStyle(el)
            const isScrollable = style.overflowY === 'auto' ||
                style.overflowY === 'scroll' ||
                el.scrollHeight > el.clientHeight
            if (isScrollable) return el
        }
    }

    return document.querySelector('nav') || document.querySelector('div[role="navigation"]')
}

export const useChatScraper = () => {
    const { user } = useAuth()
    const [chats, setChats] = useState<ScrapedChat[]>([])
    const [loading, setLoading] = useState(true)
    const [activeChatId, setActiveChatId] = useState<string | null>(null)

    const [interceptorReady, setInterceptorReady] = useState(false)

    // 1. Listen to Cloud State (Firestore)
    useEffect(() => {
        if (!user) {
            setChats([])
            setLoading(false)
            return
        }

        const unsubscribe = onSnapshot(
            collection(db, "users", user.uid, "chats"),
            (snapshot) => {
                const loadedChats: ScrapedChat[] = []
                snapshot.forEach((doc) => {
                    loadedChats.push(doc.data() as ScrapedChat)
                })
                loadedChats.sort((a, b) => b.timestamp - a.timestamp)
                setChats(loadedChats)
                setLoading(false)
            },
            (error) => {
                if (error.code === 'permission-denied') {
                    logger.warn("[ChatScraper] Firestore permission denied - user may not be fully authenticated yet")
                } else {
                    logger.error("[ChatScraper] Firestore error:", error)
                }
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [user])

    // 2. The "Anti-Gravity" Merge Logic
    const upsertChats = useCallback(async (detectedChats: ScrapedChat[]) => {
        if (!user) return

        const batch = writeBatch(db)
        let hasUpdates = false

        detectedChats.forEach((nc) => {
            const chatRef = doc(db, "users", user.uid, "chats", nc.id)
            const existing = chats.find(c => c.id === nc.id)

            if (!existing) {
                batch.set(chatRef, nc)
                hasUpdates = true
            } else {
                if (nc.timestamp > existing.timestamp) {
                    batch.update(chatRef, {
                        title: nc.title,
                        lastInteracted: nc.lastInteracted,
                        timestamp: nc.timestamp,
                        url: nc.url
                    })
                    hasUpdates = true
                }
            }
        })

        if (hasUpdates) {
            try {
                await batch.commit()
            } catch (e) {
                logger.error("[ChatScraper] Batch commit failed:", e)
            }
        }
    }, [user, chats])

    // 3. Listen to Network Interceptor
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return
            if (event.origin !== "https://gemini.google.com") return

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

        const handshakeInterval = setInterval(() => {
            window.postMessage({ type: "GEMINI_UI_READY" }, "*")
        }, 1000)

        const readyTimeout = setTimeout(() => {
            setInterceptorReady(true)
            clearInterval(handshakeInterval)
        }, 3000)

        window.addEventListener("message", handleMessage)
        return () => {
            window.removeEventListener("message", handleMessage)
            clearInterval(handshakeInterval)
            clearTimeout(readyTimeout)
        }
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

    // =============================================
    // 5. Deep Search — "Known-Chat Boundary" Logic
    // =============================================
    const [isDeepScrolling, setIsDeepScrolling] = useState(false)

    // Refs to avoid stale closures and re-render dependency cycles
    const knownChatIdsRef = useRef<Set<string>>(new Set())
    const lastBatchIdsRef = useRef<string[]>([])
    const batchReceivedRef = useRef(false)
    const bufferCountRef = useRef(0)

    const startDeepScroll = useCallback(() => {
        // Snapshot all known Firestore chat IDs at the moment deep scroll starts
        knownChatIdsRef.current = new Set(chats.map(c => c.id))
        lastBatchIdsRef.current = []
        batchReceivedRef.current = false
        bufferCountRef.current = 0
        logger.log("[DeepSearch] Starting. Known chats:", knownChatIdsRef.current.size)
        setIsDeepScrolling(true)
    }, [chats])

    const stopDeepScroll = useCallback(() => {
        setIsDeepScrolling(false)
        bufferCountRef.current = 0
        lastBatchIdsRef.current = []
        batchReceivedRef.current = false
    }, [])

    // Listener: capture incoming batches during deep scroll
    useEffect(() => {
        if (!isDeepScrolling) return

        const handleDeepSearchBatch = (event: MessageEvent) => {
            if (event.source !== window) return
            if (event.data?.type !== "GEMINI_CHATS_DETECTED") return

            const detected = event.data.payload as ScrapedChat[]
            lastBatchIdsRef.current = detected.map(c => c.id)
            batchReceivedRef.current = true
        }

        window.addEventListener("message", handleDeepSearchBatch)
        return () => window.removeEventListener("message", handleDeepSearchBatch)
    }, [isDeepScrolling])

    // The scroll loop
    useEffect(() => {
        if (!isDeepScrolling) return

        let sameHeightCount = 0
        let lastHeight = 0

        const interval = setInterval(() => {
            const nav = findSidebarScrollContainer()
            if (!nav) return

            const currentHeight = nav.scrollHeight

            // Kill Switch: Bottom reached (height hasn't changed for ~3.6s)
            if (currentHeight === lastHeight) {
                sameHeightCount++
                if (sameHeightCount >= 3) {
                    logger.log("[DeepSearch] Bottom reached. Stopping.")
                    setIsDeepScrolling(false)
                    return
                }
            } else {
                sameHeightCount = 0
                lastHeight = currentHeight
            }

            // Check the latest batch against known chats
            if (batchReceivedRef.current && lastBatchIdsRef.current.length > 0) {
                const batchIds = lastBatchIdsRef.current
                const hasKnownChat = batchIds.some(id => knownChatIdsRef.current.has(id))

                if (hasKnownChat) {
                    // Still in known territory — reset buffer
                    bufferCountRef.current = 0
                    logger.log("[DeepSearch] Known chat found in batch. Continuing. Buffer reset.")
                } else {
                    // All new chats — increment buffer
                    bufferCountRef.current++
                    logger.log("[DeepSearch] All-new batch.", bufferCountRef.current, "/ 5 buffer scrolls.")

                    if (bufferCountRef.current >= 5) {
                        logger.log("[DeepSearch] 5 consecutive all-new batches. Stopping.")
                        setIsDeepScrolling(false)
                        return
                    }
                }

                // Reset for next tick
                batchReceivedRef.current = false
                lastBatchIdsRef.current = []
            }

            // Perform the Scroll (Jiggle to trigger Gemini's lazy-load)
            nav.scrollTop = nav.scrollHeight - 10
            setTimeout(() => {
                nav.scrollTop = nav.scrollHeight
            }, 50)
        }, 1200)

        return () => clearInterval(interval)
    }, [isDeepScrolling])

    const scrollToTop = useCallback(() => {
        const nav = findSidebarScrollContainer()
        if (nav) {
            nav.scrollTop = 0
        }
    }, [])

    return {
        chats: chats.map(c => ({ ...c, isActive: c.id === activeChatId })),
        activeChatId,
        loading,
        startDeepScroll,
        stopDeepScroll,
        scrollToTop,
        interceptorReady,
        isDeepScrolling
    }
}
