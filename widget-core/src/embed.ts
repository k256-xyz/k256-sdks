/**
 * K256Embed - Smart iframe with full-screen overlay support
 *
 * The widget renders in an iframe for security isolation.
 * When the widget needs to show overlays (token selector, wallet connect),
 * the SDK expands the iframe to cover the full viewport with a backdrop
 * on the parent page. This gives the full-screen experience without
 * needing to bundle React into the SDK.
 *
 * Flow:
 * 1. Widget renders inline in a sized iframe
 * 2. User opens token selector → widget sends k256:overlay-open
 * 3. SDK creates backdrop on parent page, expands iframe to full-screen
 * 4. User selects token → widget sends k256:overlay-close
 * 5. SDK removes backdrop, shrinks iframe back to inline
 */

import type {
  K256EmbedOptions,
  K256EventType,
  K256EventHandler,
} from "./types"

const DEFAULT_BASE_URL = "https://app.k256.xyz"

export class K256Embed {
  private iframe: HTMLIFrameElement | null = null
  private backdrop: HTMLDivElement | null = null
  private container: HTMLElement | null = null
  private options: K256EmbedOptions
  private listeners: Map<string, Set<K256EventHandler>> = new Map()
  private messageHandler: ((event: MessageEvent) => void) | null = null
  private mounted = false
  private isOverlayOpen = false
  private originalStyles: string = ""

  constructor(options: K256EmbedOptions) {
    this.options = options
  }

  /**
   * Mount the widget into a DOM container.
   */
  mount(container: HTMLElement): this {
    if (this.mounted) {
      this.unmount()
    }

    this.container = container
    this.iframe = document.createElement("iframe")

    // Build the embed URL
    const baseUrl = this.options.baseUrl || DEFAULT_BASE_URL
    const params = new URLSearchParams()
    params.set("wgt", this.options.wgt)
    params.set("mode", "sdk") // Tell embed page it's inside an SDK
    if (this.options.type) params.set("type", this.options.type)
    if (this.options.theme) params.set("theme", this.options.theme)
    if (this.options.amount != null) params.set("amount", String(this.options.amount))
    if (this.options.token) params.set("token", this.options.token)
    if (this.options.title) params.set("title", this.options.title)

    this.iframe.src = `${baseUrl}/embed?${params.toString()}`
    this.iframe.style.cssText =
      "border:none;width:100%;min-height:500px;display:block;overflow:hidden;background:#0a0a0a;border-radius:20px;color-scheme:dark;transition:all 0.3s ease;"
    this.iframe.setAttribute("allowtransparency", "true")
    this.iframe.setAttribute(
      "allow",
      "clipboard-write; payment; solana-transaction"
    )
    this.iframe.setAttribute("loading", "eager")
    this.iframe.title = "K256 Widget"

    // Create backdrop element (hidden initially) - light dim, not black
    this.backdrop = document.createElement("div")
    this.backdrop.style.cssText =
      "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:99998;transition:opacity 0.25s ease;opacity:0;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);"
    this.backdrop.addEventListener("click", () => {
      this.send("k256:close-overlay")
    })

    // Listen for messages from the iframe
    const expectedOrigin = new URL(this.iframe.src).origin
    this.messageHandler = (event: MessageEvent) => {
      if (event.origin !== expectedOrigin) return
      if (!event.data || event.data.source !== "k256-widget" || !event.data.type) return

      const rawType = event.data.type as string
      const eventType = rawType.replace("k256:", "") as K256EventType

      // Handle overlay open/close from the widget
      if (rawType === "k256:overlay-open") {
        this.openOverlay()
        return
      }
      if (rawType === "k256:overlay-close") {
        this.closeOverlay()
        return
      }

      // Handle auto-resize (only when overlay is closed)
      if (eventType === "resize" && this.iframe && event.data.height && !this.isOverlayOpen) {
        this.iframe.style.height = `${event.data.height}px`
      }

      // Fire registered listeners
      const handlers = this.listeners.get(eventType)
      if (handlers) {
        const payload = { ...event.data }
        delete payload.source
        delete payload.type
        handlers.forEach((handler) => handler(payload as never))
      }
    }
    window.addEventListener("message", this.messageHandler)

    container.innerHTML = ""
    document.body.appendChild(this.backdrop)
    container.appendChild(this.iframe)
    this.mounted = true

    return this
  }

  /**
   * Expand iframe to full-screen with backdrop.
   */
  private openOverlay(): void {
    if (this.isOverlayOpen || !this.iframe || !this.backdrop) return
    this.isOverlayOpen = true

    // Save original iframe styles
    this.originalStyles = this.iframe.style.cssText

    // Show backdrop
    this.backdrop.style.display = "block"
    requestAnimationFrame(() => {
      if (this.backdrop) this.backdrop.style.opacity = "1"
    })

    // Expand iframe to cover viewport -- transparent background so the dimmed page shows through
    this.iframe.style.cssText =
      "position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;border:none;background:transparent;border-radius:0;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);max-width:100vw;"

    // Prevent body scroll
    document.body.style.overflow = "hidden"
  }

  /**
   * Shrink iframe back to inline with no backdrop.
   */
  private closeOverlay(): void {
    if (!this.isOverlayOpen || !this.iframe || !this.backdrop) return
    this.isOverlayOpen = false

    // Hide backdrop
    this.backdrop.style.opacity = "0"
    setTimeout(() => {
      if (this.backdrop) this.backdrop.style.display = "none"
    }, 200)

    // Restore iframe to original styles
    this.iframe.style.cssText = this.originalStyles

    // Restore body scroll
    document.body.style.overflow = ""
  }

  /**
   * Register an event listener.
   */
  on<T extends K256EventType>(event: T, handler: K256EventHandler<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler as K256EventHandler)
    return this
  }

  /**
   * Remove an event listener.
   */
  off<T extends K256EventType>(event: T, handler: K256EventHandler<T>): this {
    this.listeners.get(event)?.delete(handler as K256EventHandler)
    return this
  }

  /**
   * Send a message to the widget.
   */
  send(type: string, data?: Record<string, unknown>): this {
    if (this.iframe?.contentWindow) {
      const targetOrigin = new URL(this.iframe.src).origin
      this.iframe.contentWindow.postMessage(
        { source: "k256-sdk", type, ...data },
        targetOrigin
      )
    }
    return this
  }

  /**
   * Update options and reload the widget.
   */
  update(options: Partial<K256EmbedOptions>): this {
    Object.assign(this.options, options)
    if (this.mounted && this.container) {
      this.mount(this.container)
    }
    return this
  }

  /**
   * Unmount the widget and clean up.
   */
  unmount(): void {
    this.closeOverlay()
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler)
      this.messageHandler = null
    }
    if (this.backdrop && this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop)
    }
    if (this.iframe && this.container) {
      this.container.removeChild(this.iframe)
    }
    this.iframe = null
    this.backdrop = null
    this.container = null
    this.mounted = false
  }

  /**
   * Destroy the embed instance (unmount + clear listeners).
   */
  destroy(): void {
    this.unmount()
    this.listeners.clear()
  }
}

/**
 * Factory function to create a K256Embed instance.
 */
export function createK256Embed(options: K256EmbedOptions): K256Embed {
  return new K256Embed(options)
}
