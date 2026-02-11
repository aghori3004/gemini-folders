import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useEffect, useState } from "react"

import { logger } from "~utils/logger"
import { ErrorBoundary } from "./components/ErrorBoundary"

import { MainUI } from "./components/MainUI"

export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*"]
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // Try multiple selectors for different Gemini page layouts
  const selectors = [
    "infinite-scroller .gems-list-container",
    "infinite-scroller .chat-history",
    ".gem-list-container",  // Alternative class name
    "nav .chat-list",       // Alternative: nav-based sidebar
    "nav [role='list']",    // Generic role-based
    "[data-test-id='chat-list']", // Test ID if available
    ".sidebar-content",     // Generic sidebar
    "infinite-scroller"     // Last resort: just the scroller itself
  ]

  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        logger.log("[Gemini Folders] Found anchor with selector:", selector)
        return element
      }
    } catch (e) {
      logger.warn("[Gemini Folders] Selector failed:", selector, e)
    }
  }

  logger.warn("[Gemini Folders] No anchor found! Retrying...")
  return null  // Return null to let Plasmo retry
}

export const getPosition = (anchor: Element) => {
  if (anchor && anchor.classList.contains("gems-list-container")) {
    return "afterend"
  }
  return "beforebegin"
}

export const getStyle = (): HTMLStyleElement => {
  const styleElement = document.createElement("style")
  styleElement.textContent = `
    ${cssText.replaceAll(":root", ":host(plasmo-csui)")}
    
    :host(plasmo-csui) {
      display: block !important;
      width: 100% !important;
      box-sizing: border-box !important;
      z-index: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `
  return styleElement
}

const PlasmoInline = () => {
  logger.log("[Gemini Folders] Component Mounting/Rendering")
  const [isVisible, setIsVisible] = useState(true)

  // Fixed constants
  const paddingLeft = 24
  const paddingRight = 16

  useEffect(() => {
    // Simple visibility check based on body width
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // If sidebar width is less than 200px, it's likely collapsed
        setIsVisible(entry.contentRect.width > 200)
      }
    })

    // Try multiple sidebar selectors
    const sidebarSelectors = ["infinite-scroller", "nav", "[role='navigation']"]
    let sidebar: Element | null = null

    for (const selector of sidebarSelectors) {
      sidebar = document.querySelector(selector)
      if (sidebar) break
    }

    if (sidebar) {
      resizeObserver.observe(sidebar)
    } else {
      // Fallback: assume visible
      logger.warn("[Gemini Folders] Sidebar not found for visibility observer, assuming visible.")
      setIsVisible(true)
    }
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div
      id="plasmo-container-div"
      style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <ErrorBoundary>
        <MainUI paddingLeft={paddingLeft} paddingRight={paddingRight} />
      </ErrorBoundary>
    </div>
  )
}

export default PlasmoInline