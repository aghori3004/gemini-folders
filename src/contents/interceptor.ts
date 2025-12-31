import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://gemini.google.com/*"],
    world: "MAIN"
}

console.log("[Gemini Folders] Interceptor Loaded")

const XHR = XMLHttpRequest.prototype
const open = XHR.open
const send = XHR.send

const pushState = history.pushState
const replaceState = history.replaceState

// Robustly extract the first valid JSON object or array from a string,
// ignoring trailing garbage or concatenated responses.
function safeExtractJSON(str: string): any {
    try {
        // 1. Try standard parse first (happy path)
        return JSON.parse(str);
    } catch (e) {
        // 2. Fallback: Parse character-by-character to find the valid JSON boundary
    }

    let startIndex = -1;
    let openChar = '';
    let closeChar = '';

    // Find first opener
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
            startIndex = i;
            openChar = '{';
            closeChar = '}';
            break;
        }
        if (str[i] === '[') {
            startIndex = i;
            openChar = '[';
            closeChar = ']';
            break;
        }
    }

    if (startIndex === -1) return null; // No JSON found

    let balance = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = startIndex; i < str.length; i++) {
        const char = str[i];

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
            } else if (char === '\\') {
                isEscaped = true;
            } else if (char === '"') {
                inString = false;
            }
        } else {
            if (char === '"') {
                inString = true;
            } else if (char === openChar) {
                balance++;
            } else if (char === closeChar) {
                balance--;

                if (balance === 0) {
                    // Found the end of the JSON object/array
                    const potentialJSON = str.substring(startIndex, i + 1);
                    try {
                        return JSON.parse(potentialJSON);
                    } catch (err) {
                        // If this specific chunk fails, we allow the loop to continue
                        // or just return null. For now, log and fail safe.
                        console.warn("[Gemini Folders] safeExtractJSON failed on slice:", err);
                        return null;
                    }
                }
            }
        }
    }
    return null;
}

history.pushState = function (...args) {
    const result = pushState.apply(this, args)
    window.postMessage({ type: "GEMINI_URL_CHANGED", url: window.location.href }, "*")
    return result
}

history.replaceState = function (...args) {
    const result = replaceState.apply(this, args)
    window.postMessage({ type: "GEMINI_URL_CHANGED", url: window.location.href }, "*")
    return result
}

XHR.open = function (method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
    this._url = url instanceof URL ? url.toString() : url
    return open.apply(this, arguments as any)
}

XHR.send = function (body) {
    this.addEventListener("load", function () {
        try {
            if (this._url && this._url.includes("batchexecute") && this._url.includes("rpcids=MaZiqc")) {
                // SURGICAL EXTRACTION STRATEGY
                // We look for: "wrb.fr","MaZiqc","<ESCAPED_JSON_STRING>"
                // Using 'g' flag to find all occurrences in case of batching
                const regex = /"wrb\.fr"\s*,\s*"MaZiqc"\s*,\s*"((?:[^"\\]|\\.)*)"/g
                let match;
                let foundAny = false;

                // Iterate over all matches
                while ((match = regex.exec(this.responseText)) !== null) {
                    if (match && match[1]) {
                        foundAny = true;

                        try {
                            // 1. Unescape the string content
                            // match[1] is the content inside the double quotes, so we parse it as a JSON string to get the raw text
                            const rawPayload = JSON.parse(`"${match[1]}"`)

                            // 2. Safe parse the inner data (which might contain garbage at the end)
                            const innerData = safeExtractJSON(rawPayload)

                            if (!innerData) {
                                console.warn("[Gemini Folders] Failed to extract valid JSON from MaZiqc payload.")
                                continue;
                            }

                            // Structure: [key, key, [CHAT_LIST], ...]
                            // The chat list is usually at index 2.
                            const chatListRaw = innerData[2]

                            if (Array.isArray(chatListRaw)) {
                                const cleanChats = chatListRaw.map((c: any) => {
                                    const rawId = c[0];
                                    const cleanId = rawId.startsWith("c_") ? rawId.slice(2) : rawId;
                                    const timestampSeconds = c[5]?.[0] ?? 0;
                                    const date = new Date(timestampSeconds * 1000);

                                    // Simple relative date formatter
                                    const now = new Date();
                                    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                    const yesterday = new Date(now);
                                    yesterday.setDate(yesterday.getDate() - 1);
                                    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

                                    let lastInteracted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                    if (isToday) lastInteracted = "Today";
                                    if (isYesterday) lastInteracted = "Yesterday";

                                    return {
                                        id: cleanId,
                                        title: c[1],
                                        lastInteracted,
                                        timestamp: timestampSeconds,
                                        url: `/app/${cleanId}`,
                                        isActive: window.location.href.includes(cleanId)
                                    };
                                })

                                console.log(`[Gemini Folders] Interceptor found ${cleanChats.length} chats in a payload chunk.`)
                                window.postMessage({ type: "GEMINI_CHATS_INTERCEPTED", payload: cleanChats }, "*")
                            } else {
                                // Sometimes the payload is just a heartbeat or empty update, not always an error.
                            }
                        } catch (parseErr) {
                            console.error("[Gemini Folders] Iteration Parse Error:", parseErr)
                        }
                    }
                }

                if (!foundAny) {
                    // It might be possible the format changed slightly, log for debugging
                    console.log("[Gemini Folders] 'MaZiqc' pattern not found in this response batch.")
                }
            }
        } catch (err) {
            console.error("[Gemini Folders] Interceptor Logic Error:", err)
        }
    })
    return send.apply(this, arguments as any)
}

// Listen for Navigation requests from the UI
window.addEventListener("message", (event) => {
    if (event.source !== window) return
    if (event.data?.type === "GEMINI_NAVIGATE_REQUEST" && event.data?.url) {
        const targetUrl = event.data.url
        // Robustly extract ID whether the URL is relative (/app/ID) or absolute (https://...)
        const targetId = targetUrl.split("/app/")[1]

        console.log("[Gemini Folders] Navigation requested for:", targetId)

        if (!targetId) {
            // If we can't parse an ID, just go there
            window.location.href = targetUrl
            return
        }

        // 1. Attempt Soft Navigation (Clicking the UI element)
        // We look for any anchor tag in the DOM that points to this chat ID
        const sidebarLink = document.querySelector(`a[href*="${targetId}"]`) as HTMLElement

        if (sidebarLink) {
            console.log("[Gemini Folders] Found link in UI. Clicking native element.")
            sidebarLink.click()
        } else {
            // 2. Fallback to Hard Navigation
            console.log("[Gemini Folders] Link not found in UI. Forcing hard navigation.")
            window.location.href = targetUrl
        }
    }
})
