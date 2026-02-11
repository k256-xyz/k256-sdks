/**
 * @k256/react - React components for K256 widgets
 *
 * Usage:
 *
 * import { K256Swap, K256Pay } from '@k256/react';
 *
 * <K256Pay wgt="wgt_xxx" onSuccess={(data) => console.log(data)} />
 * <K256Swap wgt="wgt_xxx" />
 */

import {
  useRef,
  useEffect,
} from "react"
import {
  K256Embed,
  type K256EmbedOptions,
  type K256WidgetType,
  type K256EventMap,
} from "@k256/widget-core"

// =============================================================================
// Base Widget Component
// =============================================================================

interface K256WidgetBaseProps {
  /** Widget ID (starts with wgt_) */
  wgt: string
  theme?: K256EmbedOptions["theme"]
  title?: string
  amount?: number
  token?: string
  /** Base URL override (defaults to https://app.k256.xyz) */
  baseUrl?: string
  className?: string
  style?: React.CSSProperties
  onSuccess?: (data: K256EventMap["success"]) => void
  onError?: (data: K256EventMap["error"]) => void
  onClose?: () => void
  onReady?: (data: K256EventMap["ready"]) => void
}

function useK256Widget(
  type: K256WidgetType,
  props: K256WidgetBaseProps
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const embedRef = useRef<K256Embed | null>(null)

  useEffect(() => {
    if (!containerRef.current || !props.wgt) return

    const embed = new K256Embed({
      wgt: props.wgt,
      type,
      theme: props.theme,
      title: props.title,
      amount: props.amount,
      token: props.token,
      baseUrl: props.baseUrl,
    })

    embed.mount(containerRef.current)

    if (props.onReady) embed.on("ready", props.onReady)
    if (props.onSuccess) embed.on("success", props.onSuccess)
    if (props.onError) embed.on("error", props.onError)
    if (props.onClose) embed.on("close", props.onClose as never)

    embedRef.current = embed

    return () => {
      embed.destroy()
      embedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.wgt, type, props.baseUrl])

  return containerRef
}

function K256WidgetComponent({
  type,
  className,
  style,
  ...props
}: K256WidgetBaseProps & { type: K256WidgetType }) {
  const containerRef = useK256Widget(type, props)

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", maxWidth: 420, ...style }}
    />
  )
}

// =============================================================================
// Named Components
// =============================================================================

export function K256Swap(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="swap" {...props} />
}

export function K256Buy(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="buy" {...props} />
}

export function K256Tip(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="tip" {...props} />
}

export function K256Pay(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="payment" {...props} />
}

export function K256Gift(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="gift" {...props} />
}

export function K256Sponsor(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="sponsor" {...props} />
}

export function K256Redeem(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="redeem" {...props} />
}

export function K256Fund(props: K256WidgetBaseProps) {
  return <K256WidgetComponent type="fund" {...props} />
}

// =============================================================================
// Re-exports
// =============================================================================

export type { K256WidgetBaseProps as K256WidgetProps }
export type { K256EmbedOptions, K256WidgetType, K256EventMap }
