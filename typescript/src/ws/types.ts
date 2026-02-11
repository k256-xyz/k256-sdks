/**
 * WebSocket message types and interfaces
 * 
 * Message type constants MUST match the K2 server values.
 * See: https://github.com/k256-xyz for protocol documentation
 */

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
  };
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
  | BlockhashMessage
  | QuoteMessage
  | HeartbeatMessage
  | SubscribedMessage
  | QuoteSubscribedMessage
  | ErrorMessage
  | PongMessage;
