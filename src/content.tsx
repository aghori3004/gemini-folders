import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import { useCallback, useEffect, useState } from "react"

import { MainUI } from "./components/MainUI"

export const config: PlasmoCSConfig = {
  matches: ["https://gemini.google.com/*"]
}

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

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  const gemsContainer = document.querySelector("infinite-scroller .gems-list-container")
  console.log("[Gemini Folders] Looking for anchor:", { gemsContainer })
  if (gemsContainer) return gemsContainer

  const history = document.querySelector("infinite-scroller .chat-history")
  console.log("[Gemini Folders] Fallback anchor:", { history })
  return history
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
  console.log("[Gemini Folders] Component Mounting/Rendering")
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

    const sidebar = document.querySelector("infinite-scroller")
    if (sidebar) {
      resizeObserver.observe(sidebar)
    } else {
      // Fallback or retry? If not found, assume visible or add retry logic.
      // For now, if not found, we just stay visible (default) to avoid disappearing.
      console.warn("[Gemini Folders] infinite-scroller not found for visibility observer.")
    }
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <div
      id="plasmo-container-div"
      style={{ display: isVisible ? "block" : "none", width: "100%" }}>
      <MainUI paddingLeft={paddingLeft} paddingRight={paddingRight} />
    </div>
  )
}

export default PlasmoInline