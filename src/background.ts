// src/background.ts
export { }
import { logger } from "~utils/logger"

logger.log("Gemini Folders: Background Service Worker Loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // SECURITY: Validate sender
    if (sender.id !== chrome.runtime.id) {
        return
    }

    if (request.action === "getAuthToken") {
        // Use the flag from request, default to true if missing
        const isInteractive = request.interactive ?? true

        chrome.identity.getAuthToken({ interactive: isInteractive }, (token) => {
            if (chrome.runtime.lastError) {
                // Don't log error for silent checks (keeps console clean)
                if (isInteractive) {
                    console.error("Identity Error:", chrome.runtime.lastError)
                }
                sendResponse({ error: chrome.runtime.lastError.message })
            } else {
                logger.log("Token received via background")
                sendResponse({ token })
            }
        })
        return true // Async response
    }

    if (request.action === "removeCachedAuthToken" || request.action === "removeCachedToken") {
        // Safe Logic: Ensure we have a valid context first
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
                // Token might already be gone or invalid
                sendResponse({ success: false })
                return
            }

            // Flush the token from Chrome's internal cache
            chrome.identity.removeCachedAuthToken({ token: token }, () => {
                logger.log("Cached token removed safely")
                sendResponse({ success: true })
            })
        })
        return true // Async response
    }

    if (request.action === "openPopup") {
        // Open the extension popup
        // Note: chrome.action.openPopup() requires user gesture context
        // This will work when called from content script user interaction (button click)
        try {
            chrome.action.openPopup()
        } catch (error) {
            logger.log("Could not open popup automatically:", error)
        }
        return false
    }
})