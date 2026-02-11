/**
 * Shared type definitions for K256 SDK
 *
 * These types are used across WebSocket and REST API modules.
 *
 * @module @k256/sdk/types
 */

/**
 * Pool state from DEX
 */
export interface Pool {
  /** Pool address (Base58) */
  address: string;
  /** Protocol/DEX name */
  protocol: string;
  /** Token mints in the pool (Base58) */
  tokenMints: string[];
  /** Token balances (as strings for precision) */
  tokenBalances: string[];
  /** Token decimals */
  tokenDecimals: number[];
}

/**
 * Real-time pool state update
 */
export interface PoolUpdate extends Pool {
  /** Global sequence number (monotonically increasing) */
  sequence: number;
  /** Solana slot when updated */
  slot: number;
  /** Write version within slot */
  writeVersion: number;
  /** Best bid price/size (orderbook pools only) */
  bestBid?: OrderLevel;
  /** Best ask price/size (orderbook pools only) */
  bestAsk?: OrderLevel;
}

/**
 * Order book level (bid or ask)
 */
export interface OrderLevel {
  /** Price in base units (as string for precision) */
  price: string;
  /** Size in base units (as string for precision) */
  size: string;
}

/**
 * Token metadata
 */
export interface Token {
  /** Token mint address (Base58) */
  mint: string;
  /** Token symbol (e.g., "SOL", "USDC") */
  symbol: string;
  /** Token name */
  name: string;
  /** Decimal places */
  decimals: number;
  /** Logo URL (optional) */
  logoUri?: string;
  /** Coingecko ID (optional) */
  coingeckoId?: string;
}

/**
 * Swap quote from aggregator
 */
export interface Quote {
  /** Input token mint (Base58) */
  inputMint: string;
  /** Output token mint (Base58) */
  outputMint: string;
  /** Input amount (as string for precision) */
  inAmount: string;
  /** Output amount (as string for precision) */
  outAmount: string;
  /** Price impact in basis points */
  priceImpactBps: number;
  /** Slippage in basis points */
  slippageBps: number;
  /** Route plan (DEXes used) */
  routePlan: RoutePlanStep[];
  /** Context slot */
  contextSlot: number;
  /** Algorithm used for routing */
  algorithm: string;
}

/**
 * Step in a swap route
 */
export interface RoutePlanStep {
  /** DEX/protocol name */
  protocol: string;
  /** Pool address (Base58) */
  poolAddress: string;
  /** Input mint for this step */
  inputMint: string;
  /** Output mint for this step */
  outputMint: string;
  /** Percentage of input for this step (0-100) */
  percent: number;
}

/**
 * Mini block statistics (compact form used in FeeMarket.recentBlocks)
 */
export interface BlockMiniStats {
  slot: number
  cuConsumed: number
  txCount: number
  utilizationPct: number
  avgCuPrice: number
}

/**
 * Direction of the fee trend
 */
export type TrendDirection = 'rising' | 'falling' | 'stable'

/**
 * Full block-level statistics (standalone message 0x0F)
 */
export interface BlockStats {
  slot: number
  cuConsumed: number
  executionCu: number
  cuLimit: number
  cuRemaining: number
  utilizationPct: number
  txCount: number
  avgCuPerTx: number
  avgCuPrice: number
  minCuPrice: number
  maxCuPrice: number
  timestampMs: number
}

/**
 * Per-writable-account fee data
 *
 * Solana's scheduler limits each writable account to 12M CU per block.
 * Fee pricing is per-account: the fee you pay should be
 * max(p75(account) for account in your writable accounts).
 */
export interface AccountFee {
  /** Account public key (Base58) */
  pubkey: string;
  /** Total transactions touching this account in the window */
  totalTxs: number;
  /** Number of slots where this account was active */
  activeSlots: number;
  /** Total CU consumed by transactions touching this account */
  cuConsumed: number;
  /** Account utilization percentage (0-100) of 12M CU limit */
  utilizationPct: number;
  /** 25th percentile fee in microlamports/CU */
  p25: number;
  /** 50th percentile fee in microlamports/CU */
  p50: number;
  /** 75th percentile fee in microlamports/CU */
  p75: number;
  /** 90th percentile fee in microlamports/CU */
  p90: number;
  /** Minimum non-zero fee observed */
  minNonzeroPrice: number;
}

/**
 * Fee market update (per-writable-account model)
 *
 * Replaces the old flat PriorityFees struct. Now provides per-account
 * fee data so clients can price transactions based on the specific
 * writable accounts they touch.
 */
export interface FeeMarket {
  /** Current slot */
  slot: number;
  /** Timestamp in milliseconds */
  timestampMs: number;
  /** Recommended fee in microlamports/CU (max p75 across hottest accounts) */
  recommended: number;
  /** Network state (0=low, 1=normal, 2=high, 3=extreme) */
  state: NetworkState;
  /** Whether data is stale */
  isStale: boolean;
  /** Block utilization percentage (0-100) */
  blockUtilizationPct: number;
  /** Number of blocks in the observation window */
  blocksInWindow: number;
  /** Per-account fee data */
  accounts: AccountFee[];
  /** Recent block mini-stats (v3) */
  recentBlocks: BlockMiniStats[];
  /** Fee trend direction (v3) */
  trend: TrendDirection;
}

/**
 * Network congestion state
 */
export enum NetworkState {
  Low = 0,
  Normal = 1,
  High = 2,
  Congested = 3,
}

/**
 * Recent blockhash for transactions
 */
export interface Blockhash {
  /** Slot of blockhash */
  slot: number;
  /** Timestamp in milliseconds */
  timestampMs: number;
  /** Recent blockhash (Base58) */
  blockhash: string;
  /** Block height */
  blockHeight: number;
  /** Last valid block height for transactions */
  lastValidBlockHeight: number;
  /** Whether data is stale */
  isStale: boolean;
}

/**
 * WebSocket connection heartbeat
 */
export interface Heartbeat {
  /** Server timestamp in milliseconds */
  timestampMs: number;
  /** Connection uptime in seconds */
  uptimeSecs: number;
  /** Total messages sent */
  messagesSent: number;
  /** Pool updates sent */
  poolUpdatesSent: number;
  /** Messages dropped (slow client) */
  messagesDropped: number;
  /** Whether pool updates are enabled */
  poolUpdatesEnabled: boolean;
  /** Subscribed channels */
  subscribedChannels: string[];
  /** Server sequence number */
  serverSequence: number;
}

/**
 * Subscribe request for WebSocket
 */
export interface SubscribeRequest {
  /** Channels to subscribe to */
  channels: ('pools' | 'priority_fees' | 'blockhash')[];
  /** Response format (default: binary) */
  format?: 'binary' | 'json';
  /** Filter by protocol names */
  protocols?: string[];
  /** Filter by pool addresses (Base58) */
  pools?: string[];
  /** Filter by token pairs [[mintA, mintB], ...] */
  tokenPairs?: [string, string][];
}

/**
 * Quote subscription request
 */
export interface SubscribeQuoteRequest {
  /** Input token mint (Base58) */
  inputMint: string;
  /** Output token mint (Base58) */
  outputMint: string;
  /** Amount in base units */
  amount: number;
  /** Slippage tolerance in basis points */
  slippageBps?: number;
  /** Refresh interval in milliseconds */
  refreshIntervalMs?: number;
}
