/**
 * WebSocket message types and interfaces
 * 
 * Message type constants MUST match the K2 server values.
 * See: https://github.com/k256-xyz for protocol documentation
 */

import type { BlockMiniStats, TrendDirection, BlockStats } from '../types';

/**
 * WebSocket message type constants
 * 
 * These are the byte prefixes used in the binary protocol.
 * All SDKs across all languages MUST use these exact values.
 */
export const MessageType = {
  /** Single pool state update (bincode) */
  PoolUpdate: 0x01,
  /** Subscribe request (JSON) - Client → Server */
  Subscribe: 0x02,
  /** Subscription confirmed (JSON) - Server → Client */
  Subscribed: 0x03,
  /** Unsubscribe all - Client → Server */
  Unsubscribe: 0x04,
  /** Priority fee update (bincode) */
  PriorityFees: 0x05,
  /** Recent blockhash (bincode) */
  Blockhash: 0x06,
  /** Streaming quote update (bincode) */
  Quote: 0x07,
  /** Quote subscription confirmed (JSON) */
  QuoteSubscribed: 0x08,
  /** Subscribe to quote stream (JSON) - Client → Server */
  SubscribeQuote: 0x09,
  /** Unsubscribe from quote (JSON) - Client → Server */
  UnsubscribeQuote: 0x0a,
  /** Ping keepalive - Client → Server */
  Ping: 0x0b,
  /** Pong response (bincode u64 timestamp) */
  Pong: 0x0c,
  /** Connection heartbeat with stats (JSON) */
  Heartbeat: 0x0d,
  /** Batched pool updates for high throughput */
  PoolUpdateBatch: 0x0e,
  /** Block-level statistics (v3) */
  BlockStats: 0x0f,
  /** Subscribe to price updates (JSON) - Client → Server */
  SubscribePrice: 0x10,
  /** Single price update (bincode 56B) - Server → Client */
  PriceUpdate: 0x11,
  /** Batched price updates (bincode [u16 count][entries...]) - Server → Client */
  PriceBatch: 0x12,
  /** Initial price snapshot (same binary format as PriceBatch) - Server → Client */
  PriceSnapshot: 0x13,
  /** Unsubscribe from prices (no payload) - Client → Server */
  UnsubscribePrice: 0x14,
  /** Error message (UTF-8 string) */
  Error: 0xff,
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

/**
 * Decoded pool update from binary message
 */
export interface PoolUpdateMessage {
  type: 'pool_update';
  data: {
    sequence: number;
    slot: number;
    writeVersion: number;
    protocol: string;
    poolAddress: string;
    tokenMints: string[];
    tokenBalances: string[];
    tokenDecimals: number[];
    bestBid?: { price: string; size: string };
    bestAsk?: { price: string; size: string };
  };
}

/**
 * Decoded fee market from binary message (per-writable-account model)
 *
 * All fields from K2 FeeMarketWire
 */
export interface FeeMarketMessage {
  type: 'fee_market';
  data: {
    slot: number;
    timestampMs: number;
    /** Recommended priority fee in microlamports/CU (max p75 across hottest accounts) */
    recommended: number;
    /** Fee state: 0=low, 1=normal, 2=high, 3=extreme */
    state: number;
    /** True if data is stale (no recent samples) */
    isStale: boolean;
    /** Block utilization percentage (0-100) */
    blockUtilizationPct: number;
    /** Number of blocks in the observation window */
    blocksInWindow: number;
    /** Per-writable-account fee data */
    accounts: {
      /** Account public key (Base58) */
      pubkey: string;
      /** Total transactions touching this account */
      totalTxs: number;
      /** Active slots for this account */
      activeSlots: number;
      /** Total CU consumed */
      cuConsumed: number;
      /** Utilization percentage (0-100) of 12M CU limit */
      utilizationPct: number;
      /** Fee percentiles in microlamports/CU */
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      /** Minimum non-zero fee observed */
      minNonzeroPrice: number;
    }[];
    /** Recent block mini-stats (v3) */
    recentBlocks: BlockMiniStats[];
    /** Fee trend direction (v3) */
    trend: TrendDirection;
  };
}

/**
 * Decoded block stats from binary message (v3)
 */
export interface BlockStatsMessage {
  type: 'block_stats';
  data: BlockStats;
  receivedAt: number;
}

/**
 * Decoded blockhash from binary message
 */
export interface BlockhashMessage {
  type: 'blockhash';
  data: {
    slot: number;
    timestampMs: number;
    blockhash: string;
    blockHeight: number;
    lastValidBlockHeight: number;
    isStale: boolean;
  };
}

/**
 * Decoded quote from binary message
 */
export interface QuoteMessage {
  type: 'quote';
  data: {
    topicId: string;
    timestampMs: number;
    sequence: number;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactBps: number;
    contextSlot: number;
    algorithm: string;
    isImprovement: boolean;
    isCached: boolean;
    isStale: boolean;
    routePlan: unknown | null;
  };
}

/**
 * Decoded heartbeat from JSON message
 */
export interface HeartbeatMessage {
  type: 'heartbeat';
  data: {
    timestampMs: number;
    uptimeSecs: number;
    messagesSent: number;
    poolUpdatesSent: number;
    messagesDropped: number;
    poolUpdatesEnabled: boolean;
    subscribedChannels: string[];
    serverSequence: number;
  };
}

/**
 * Subscription confirmed message
 */
export interface SubscribedMessage {
  type: 'subscribed';
  data: {
    channelCount: number;
    channels: string[];
    poolCount: number;
    tokenPairCount: number;
    protocolCount: number;
    poolUpdatesEnabled: boolean;
    timestampMs: number;
    summary: string;
    format?: 'binary' | 'json';
  };
}

/**
 * Quote subscription confirmed message
 */
export interface QuoteSubscribedMessage {
  type: 'quote_subscribed';
  data: {
    topicId: string;
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps: number;
    refreshIntervalMs: number;
    timestampMs: number;
  };
}

/**
 * Single decoded price entry (shared by PriceUpdate, PriceBatch, PriceSnapshot)
 */
export interface PriceEntry {
  mint: string;
  usdPrice: number;
  slot: number;
  timestampMs: number;
}

/**
 * Single price update from binary message (0x11)
 * Note: K2 currently sends all updates via PriceBatch (0x12)
 */
export interface PriceUpdateMessage {
  type: 'price_update';
  data: PriceEntry;
}

/**
 * Batched price updates from binary message (0x12)
 */
export interface PriceBatchMessage {
  type: 'price_batch';
  data: PriceEntry[];
}

/**
 * Initial price snapshot from binary message (0x13)
 * Same binary format as PriceBatch — sent once after subscribe_price
 */
export interface PriceSnapshotMessage {
  type: 'price_snapshot';
  data: PriceEntry[];
}

/**
 * Error message from server
 */
export interface ErrorMessage {
  type: 'error';
  data: {
    message: string;
  };
}

/**
 * Pong response message
 */
export interface PongMessage {
  type: 'pong';
  data: {
    timestampMs: number;
  };
}

/**
 * Union of all decoded message types
 */
export type DecodedMessage =
  | PoolUpdateMessage
  | FeeMarketMessage
  | BlockStatsMessage
  | BlockhashMessage
  | QuoteMessage
  | PriceUpdateMessage
  | PriceBatchMessage
  | PriceSnapshotMessage
  | HeartbeatMessage
  | SubscribedMessage
  | QuoteSubscribedMessage
  | ErrorMessage
  | PongMessage;
