import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://gemini.google.com/*"],
    world: "MAIN",
    run_at: "document_start"
}

console.log("[Gemini Folders] Interceptor Loaded (Network Only Mode)")

const XHR = XMLHttpRequest.prototype
const open = XHR.open
const send = XHR.send

// Handshake Buffer: Stores initial chats if UI isn't ready
let initialChatBuffer: any[] = []

window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (event.data?.type === "GEMINI_UI_READY") {
        console.log("[Gemini Folders] UI Ready Signal Received. Replaying Buffer.")
        if (initialChatBuffer.length > 0) {
            window.postMessage({ type: "GEMINI_CHATS_DETECTED", payload: initialChatBuffer }, "*")
        }
    }
})

// 1. Patch History to detect URL changes (for optimistic "New Chat" creation)
const pushState = history.pushState
const replaceState = history.replaceState

const notifyUrlChange = () => {
    window.postMessage({ type: "GEMINI_URL_CHANGED", url: window.location.href }, "*")
}

// 2. Listen for Popstate (Back/Forward)
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
XHR.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
    this._url = url instanceof URL ? url.toString() : url
    return open.apply(this, arguments as any)
}

XHR.send = function (body) {
    this.addEventListener("load", function () {
        if (this._url && this._url.includes("batchexecute")) {
            try {
                processBatchResponse(this.responseText)
            } catch (err) {
                // Silently fail on parse errors
            }
        }
    })
    return send.apply(this, arguments as any)
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
                initialChatBuffer = foundChats // Store purely what we found in this batch (or append? Usually one batch has full list)
                // Actually, Google sends "List" in one go. Overwriting buffer is safer than growing infinity.
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
 * [ "c_{id}", "Title", ..., [Timestamp], ... ]
 */
function findChatsRecursive(node: any, results: any[]) {
    if (!node || typeof node !== 'object') return

    // 1. Check Signature
    if (Array.isArray(node) && node.length >= 3) {
        const id = node[0]
        const title = node[1]

        // STABLE IDENTIFIER: ID starts with "c_" AND Title is a string
        if (typeof id === 'string' && id.startsWith('c_') && typeof title === 'string') {

            // --- STRICT GARBAGE FILTERING ---
            // 1. ID Check: No "_video_" (internal video metadata)
            if (id.includes("_video_")) return

            // 2. Title Check: No "r_" prefix, no UUIDs, no pure numbers
            if (title.startsWith("r_")) return
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(title)) return // UUID-like
            if (/^\d+$/.test(title)) return // Pure Number

            // 3. Timestamp Check: Must have a valid historic timestamp
            const timestamp = scanForTimestamp(node)
            if (timestamp === 0) return // No timestamp found -> Invalid Entry

            const cleanId = id.substring(2) // Remove "c_" prefix

            results.push({
                id: cleanId,
                title: title,
                lastInteracted: formatRelativeDate(timestamp),
                timestamp: timestamp,
                url: `/app/${cleanId}`,
                isActive: false // UI determines this
            })

            // Don't recurse inside a found chat
            return
        }
    }

    // 2. Recurse Deeper
    if (Array.isArray(node)) {
        for (const child of node) findChatsRecursive(child, results)
    } else {
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                findChatsRecursive(node[key], results)
            }
        }
    }
}

function scanForTimestamp(chatNode: any[]): number {
    // We look for a number that looks like a date.
    // Your sample data: 1767226400 (Seconds) -> Year 2026

    const flatten = (arr: any[]): any[] => arr.flat(Infinity)

    // We start looking from index 2 onwards to avoid ID/Title
    const potentialData = chatNode.slice(2)
    const flatData = flatten(potentialData)

    for (const item of flatData) {
        if (typeof item === 'number') {
            // Check if Seconds (10 digits)
            // 1.0e9 is Year 2001. 1.0e11 is Year 5000+.
            if (item > 1000000000 && item < 100000000000) {
                return item * 1000 // Convert Seconds to Milliseconds
            }
            // Check if Milliseconds (13 digits)
            // 1.0e12 is Year 2001.
            if (item > 1000000000000) {
                return item
            }
        }
    }

    return 0 // No valid timestamp found
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
