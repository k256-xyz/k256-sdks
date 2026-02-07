/**
 * @k256/nextjs - Next.js components for K256 widgets
 *
 * SSR-safe wrapper around @k256/react. All components are marked "use client"
 * via the tsup banner so they're automatically client-rendered.
 *
 * Usage:
 *
 * import { K256Pay } from '@k256/nextjs';
 *
 * export default function Page() {
 *   return <K256Pay wgt="wgt_xxx" />;
 * }
 */

export {
  K256Swap,
  K256Buy,
  K256Tip,
  K256Pay,
  K256Gift,
  K256Sponsor,
  K256Redeem,
  K256Fund,
} from "@k256/react"

export type {
  K256WidgetProps,
  K256EmbedOptions,
  K256WidgetType,
  K256EventMap,
} from "@k256/react"
