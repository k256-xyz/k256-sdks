/**
 * @k256/vue - Vue 3 components for K256 widgets
 *
 * Usage:
 *
 * <template>
 *   <K256Pay wgt="wgt_xxx" :amount="10" title="Premium Plan" />
 * </template>
 *
 * <script setup>
 * import { K256Pay } from '@k256/vue';
 * </script>
 */

import {
  defineComponent,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  h,
  type PropType,
} from "vue"
import {
  K256Embed,
  type K256EmbedOptions,
  type K256WidgetType,
} from "@k256/widget-core"

// =============================================================================
// Widget Factory
// =============================================================================

function createWidgetComponent(
  widgetType: K256WidgetType,
  displayName: string
) {
  return defineComponent({
    name: displayName,
    props: {
      wgt: { type: String, required: true },
      theme: {
        type: String as PropType<K256EmbedOptions["theme"]>,
        default: undefined,
      },
      title: { type: String, default: undefined },
      amount: { type: Number, default: undefined },
      token: { type: String, default: undefined },
      baseUrl: { type: String, default: undefined },
    },
    emits: ["ready", "success", "error", "close", "resize", "wallet"],
    setup(props, { emit }) {
      const containerRef = ref<HTMLDivElement | null>(null)
      let embed: K256Embed | null = null

      function mountWidget() {
        if (!containerRef.value || !props.wgt) return

        embed?.destroy()
        embed = new K256Embed({
          wgt: props.wgt,
          type: widgetType,
          theme: props.theme,
          title: props.title,
          amount: props.amount,
          token: props.token,
          baseUrl: props.baseUrl,
        })

        embed.mount(containerRef.value)

        embed
          .on("ready", (d) => emit("ready", d))
          .on("success", (d) => emit("success", d))
          .on("error", (d) => emit("error", d))
          .on("close", (d) => emit("close", d))
          .on("resize", (d) => emit("resize", d))
          .on("wallet", (d) => emit("wallet", d))
      }

      onMounted(mountWidget)

      watch(() => props.wgt, mountWidget)

      onBeforeUnmount(() => {
        embed?.destroy()
        embed = null
      })

      return () =>
        h("div", {
          ref: containerRef,
          style: { width: "100%", maxWidth: "420px" },
        })
    },
  })
}

// =============================================================================
// Named Components
// =============================================================================

export const K256Swap = createWidgetComponent("swap", "K256Swap")
export const K256Buy = createWidgetComponent("buy", "K256Buy")
export const K256Tip = createWidgetComponent("tip", "K256Tip")
export const K256Pay = createWidgetComponent("payment", "K256Pay")
export const K256Gift = createWidgetComponent("gift", "K256Gift")
export const K256Sponsor = createWidgetComponent("sponsor", "K256Sponsor")
export const K256Redeem = createWidgetComponent("redeem", "K256Redeem")
export const K256Fund = createWidgetComponent("fund", "K256Fund")

// =============================================================================
// Re-exports
// =============================================================================

export type { K256EmbedOptions, K256WidgetType }
