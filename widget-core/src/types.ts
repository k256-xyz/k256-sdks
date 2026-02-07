/**
 * K256 Widget Core Types
 *
 * Shared type definitions for all K256 widget SDKs.
 */

export type K256WidgetType =
  | "swap"
  | "buy"
  | "tip"
  | "payment"
  | "gift"
  | "sponsor"
  | "redeem"
  | "fund"

export interface K256EmbedOptions {
  /** Widget ID (starts with wgt_) */
  wgt: string
  /** Widget type override (defaults to widget config) */
  type?: K256WidgetType
  /** Theme override */
  theme?: "k256" | "neutral" | "light" | "dark" | "auto"
  /** Amount override (for payment/tip widgets) */
  amount?: number
  /** Token override (mint address) */
  token?: string
  /** Title override */
  title?: string
  /** Base URL for the widget host (defaults to https://app.k256.io) */
  baseUrl?: string
}

export interface K256EventMap {
  ready: { widgetId: string; type: K256WidgetType }
  resize: { height: number }
  success: { result: Record<string, unknown> }
  error: { error: string | Record<string, unknown> }
  close: Record<string, never>
  wallet: { connected: boolean; address?: string }
}

export type K256EventType = keyof K256EventMap

export type K256EventHandler<T extends K256EventType = K256EventType> = (
  data: K256EventMap[T]
) => void
