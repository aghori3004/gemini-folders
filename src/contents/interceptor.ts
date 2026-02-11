import type { PlasmoCSConfig } from "plasmo"
import { logger } from "~utils/logger"


export const config: PlasmoCSConfig = {
    matches: ["https://gemini.google.com/*"],
    world: "MAIN",
    run_at: "document_start"
}

logger.log("[Gemini Folders] Interceptor Loaded (Network Only Mode)")



// Handshake Buffer: Stores initial chats if UI isn't ready
let initialChatBuffer: any[] = []

window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (event.data?.type === "GEMINI_UI_READY") {
        logger.log("[Gemini Folders] UI Ready Signal Received. Replaying Buffer.")
        if (initialChatBuffer.length > 0) {
            window.postMessage({ type: "GEMINI_CHATS_DETECTED", payload: initialChatBuffer }, "*")
        }
    }
})

// 1. Patch History & Popstate for URL tracking
const pushState = history.pushState
const replaceState = history.replaceState

const notifyUrlChange = () => {
    window.postMessage({ type: "GEMINI_URL_CHANGED", url: window.location.href }, "*")
}

window.addEventListener("popstate", notifyUrlChange)

history.pushState = function (...args) {
    const result = pushState.apply(this, args)
    notifyUrlChange()
    return result
}

history.replaceState = function (...args) {
    const result = replaceState.apply(this, args)
    notifyUrlChange()
    return result
}

// 2. Patch XHR to capture "batchexecute" responses
const XHR = XMLHttpRequest.prototype
const originalOpen = XHR.open
const originalSend = XHR.send

XHR.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
    this._url = url instanceof URL ? url.toString() : url
    return originalOpen.apply(this, arguments as any)
}

XHR.send = function (body) {
    this.addEventListener("load", function () {
        if (this._url && this._url.includes("batchexecute")) {
            // Offload parsing to idle time to avoid blocking UI
            requestIdleCallback(() => {
                try {
                    processBatchResponse(this.responseText)
                } catch (err) {
                    // Silently fail
                }
            })
        }
    })
    return originalSend.apply(this, arguments as any)
}

// 3. Patch Fetch for newer Gemini implementations
const originalFetch = window.fetch
window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)
    const url = args[0] instanceof Request ? args[0].url : args[0].toString()

    if (url.includes("batchexecute")) {
        const clone = response.clone()
        clone.text().then(text => {
            requestIdleCallback(() => {
                try {
                    processBatchResponse(text)
                } catch (e) {
                    // Silently fail
                }
            })
        }).catch(() => { })
    }
    return response
}

/**
 * Parses the raw Gemini response line-by-line.
 * Handles the format: ) ] }' 1234 \n [["wrb.fr", ...]]
 */
function processBatchResponse(text: string) {
    const lines = text.split('\n')

    for (const line of lines) {
        // Fast fail: We only care about lines with the payload wrapper
        if (!line.includes("wrb.fr")) continue

        try {
            // Locate the start of the JSON array
            const startIndex = line.indexOf('[')
            if (startIndex === -1) continue

            const jsonStr = line.substring(startIndex)
            const outerArray = JSON.parse(jsonStr)

            // The structure is usually [ ["wrb.fr", "MaZiqc", "INNER_JSON_STRING"], ... ]
            // We traverse looking for that inner JSON string
            traverseAndDecode(outerArray)

        } catch (e) {
            // Ignore invalid lines
        }
    }
}

function traverseAndDecode(node: any) {
    if (!node || !Array.isArray(node)) return

    // Check if this node is the wrapper: ["wrb.fr", "MaZiqc", "JSON_STRING"]
    if (node.length >= 3 && node[0] === "wrb.fr" && typeof node[2] === "string") {
        try {
            const innerData = JSON.parse(node[2])
            const foundChats: any[] = []

            // Start recursive search for "c_" IDs in the decoded data
            findChatsRecursive(innerData, foundChats)

            if (foundChats.length > 0) {
                // Buffer & Broadcast
                // We overwrite the buffer with the latest "Fresh" list from network
                initialChatBuffer = foundChats
                window.postMessage({ type: "GEMINI_CHATS_DETECTED", payload: foundChats }, "*")
            }
        } catch (e) {
            // Inner JSON parse error
        }
    } else {
        // Recurse deeper (in case of batched responses)
        for (const child of node) traverseAndDecode(child)
    }
}

/**
 * Recursive search for the Chat Signature:
 * MATCH CRITERIA (Strict):
 * 1. Node is Array
 * 2. node[0] is string starting with "c_"
 * 3. node contains a sub-array [number, number] (Timestamp Signature)
 * 4. node[1] is the Title (String), must NOT start with "r_"
 */
function findChatsRecursive(node: any, results: any[]) {
    if (!node || !Array.isArray(node)) {
        if (node && typeof node === 'object') {
            // If object, recurse values
            for (const key in node) {
                if (Object.prototype.hasOwnProperty.call(node, key)) {
                    findChatsRecursive(node[key], results)
                }
            }
        }
        return
    }

    // Check strict signature
    if (node.length >= 2) {
        const id = node[0]
        const title = node[1]

        if (typeof id === 'string' && id.startsWith('c_') && typeof title === 'string') {

            // --- STRICT GARBAGE FILTERING ---

            // 1. ID Check
            if (id.includes("_video_")) return

            // 2. Title Check
            if (title.startsWith("r_")) return
            // UUID Pattern (8-4-4-4-12)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(title)) return
            // Numeric Only
            if (/^\d+$/.test(title)) return

            // 3. Timestamp Signature Check
            // We look for a sub-array that looks like [1234567890, 1234567890]
            // This is the most reliable way to confirm it's a chat object and not some other metadata
            const timestamp = scanForTimestampSignature(node)

            if (timestamp > 0) {
                const cleanId = id.substring(2) // Remove "c_"

                // Avoid duplicates in the current batch result
                if (!results.some(r => r.id === cleanId)) {
                    results.push({
                        id: cleanId,
                        title: title,
                        lastInteracted: formatRelativeDate(timestamp),
                        timestamp: timestamp,
                        url: `/app/${cleanId}`,
                        isActive: false
                    })
                }
                return // Found a chat, don't recurse inside it
            }
        }
    }

    // Recurse Deeper
    for (const child of node) {
        findChatsRecursive(child, results)
    }
}

function scanForTimestampSignature(node: any[]): number {
    // We strictly look for a sub-array [number, number] where numbers are large (dates)
    // The timestamp is usually the 1st or 2nd element of that sub-array.

    for (const item of node) {
        if (Array.isArray(item) && item.length >= 1 && typeof item[0] === 'number') {
            const val = item[0]
            // Check reasonableness: Year 2023+ (in microseconds or milliseconds)
            // 1.6e12 = 2020 (ms)
            // 1.6e15 = 2020 (micros)

            // Case A: Milliseconds
            if (val > 1600000000000 && val < 4000000000000) {
                return val
            }
            // Case B: Microseconds (Common in Google Protobufs) -> Convert to ms
            if (val > 1600000000000000) {
                return Math.floor(val / 1000)
            }
            // Case C: Seconds (rare here, but possible)
            if (val > 1600000000 && val < 4000000000) {
                return val * 1000
            }
        }
    }
    return 0
}

function formatRelativeDate(ts: number): string {
    const date = new Date(ts)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) return "Today"

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

