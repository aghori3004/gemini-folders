// src/background.ts
export { }

console.log("Gemini Folders: Background Service Worker Loaded")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAuthToken") {
        // Interactive: true allows Chrome to pop up the login window if needed
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                console.error("Identity Error:", chrome.runtime.lastError)
                sendResponse({ error: chrome.runtime.lastError.message })
            } else {
                console.log("Token received via background")
                sendResponse({ token })
            }
        })
        return true // Indicates we will respond asynchronously
    }
})