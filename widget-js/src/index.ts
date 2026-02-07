/**
 * @k256/widget - Vanilla JS + Web Components
 *
 * Drop this script on any page to enable K256 widgets:
 *
 * <script src="https://cdn.k256.xyz/widget.js"></script>
 * <k256-swap wgt="wgt_xxx"></k256-swap>
 * <k256-pay wgt="wgt_xxx"></k256-pay>
 *
 * The widget renders inside an iframe for security isolation.
 * The iframe auto-resizes to fit the widget content.
 *
 * Or use the imperative API:
 *
 * const widget = K256.create({ wgt: "wgt_xxx" })
 * widget.mount(document.getElementById("widget"))
 * widget.on("success", (data) => console.log(data))
 */

import { K256Embed, createK256Embed, type K256EmbedOptions, type K256WidgetType } from "@k256/widget-core"

// =============================================================================
// Web Component Base
// =============================================================================

const TAG_TO_TYPE: Record<string, K256WidgetType> = {
  "k256-swap": "swap",
  "k256-buy": "buy",
  "k256-tip": "tip",
  "k256-pay": "payment",
  "k256-gift": "gift",
  "k256-sponsor": "sponsor",
  "k256-redeem": "redeem",
  "k256-fund": "fund",
}

class K256WidgetElement extends HTMLElement {
  private embed: K256Embed | null = null
  private shadow: ShadowRoot

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: "open" })
  }

  static get observedAttributes() {
    return ["wgt", "theme", "amount", "token", "title"]
  }

  connectedCallback() {
    const container = document.createElement("div")
    container.style.cssText = "width:100%;"
    this.shadow.appendChild(container)

    const wgt = this.getAttribute("wgt")
    if (!wgt) {
      container.innerHTML =
        '<div style="color:#ef4444;font-size:14px;padding:16px;text-align:center;font-family:monospace;">K256: Missing wgt attribute</div>'
      return
    }

    const tagName = this.tagName.toLowerCase()
    const widgetType = TAG_TO_TYPE[tagName]

    const options: K256EmbedOptions = {
      wgt,
      type: widgetType,
      theme: (this.getAttribute("theme") as K256EmbedOptions["theme"]) || undefined,
      amount: this.getAttribute("amount") ? Number(this.getAttribute("amount")) : undefined,
      token: this.getAttribute("token") || undefined,
      title: this.getAttribute("title") || undefined,
    }

    this.embed = new K256Embed(options)
    this.embed.mount(container)

    // Bubble events as DOM CustomEvents
    const eventTypes = ["ready", "resize", "success", "error", "close", "wallet"] as const
    for (const eventType of eventTypes) {
      this.embed.on(eventType, (data) => {
        this.dispatchEvent(
          new CustomEvent(`k256:${eventType}`, {
            detail: data,
            bubbles: true,
            composed: true,
          })
        )
      })
    }
  }

  disconnectedCallback() {
    this.embed?.destroy()
    this.embed = null
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue || !this.embed) return
    const update: Partial<K256EmbedOptions> = {}
    if (name === "wgt" && newValue) update.wgt = newValue
    if (name === "theme") update.theme = (newValue as K256EmbedOptions["theme"]) || undefined
    if (name === "amount") update.amount = newValue ? Number(newValue) : undefined
    if (name === "token") update.token = newValue || undefined
    if (name === "title") update.title = newValue || undefined
    this.embed.update(update)
  }
}

// =============================================================================
// Register Custom Elements
// =============================================================================

function registerElements() {
  for (const [tag] of Object.entries(TAG_TO_TYPE)) {
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends K256WidgetElement {})
    }
  }
}

if (typeof window !== "undefined" && typeof customElements !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerElements)
  } else {
    registerElements()
  }
}

// =============================================================================
// Imperative API (window.K256)
// =============================================================================

export function create(options: K256EmbedOptions): K256Embed {
  return createK256Embed(options)
}

export { K256Embed, type K256EmbedOptions, type K256WidgetType }
