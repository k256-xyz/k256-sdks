/**
 * WebSocket module for K256 SDK
 * 
 * Provides production-grade WebSocket client with:
 * - Binary and JSON mode support
 * - Automatic reconnection with exponential backoff
 * - Ping/pong keepalive
 * - Full error handling with RFC 6455 close codes
 * 
 * @module @k256/sdk/ws
 * 
 * @example
 * ```typescript
 * import { K256WebSocketClient } from '@k256/sdk/ws';
 * 
 * const client = new K256WebSocketClient({
 *   apiKey: 'your-api-key',
 *   mode: 'binary',
 *   onPoolUpdate: (update) => console.log(update),
 * });
 * 
 * await client.connect();
 * client.subscribe({ channels: ['pools'] });
 * ```
 */

// Client
export { K256WebSocketClient, K256WebSocketError, CloseCode } from './client';
export type {
  K256WebSocketClientConfig,
  K256ErrorCode,
  CloseCodeValue,
  ConnectionState,
  SubscribeOptions,
  SubscribeQuoteOptions,
  SubscribePriceOptions,
} from './client';

// Decoder (for advanced usage)
export { decodeMessage, decodePoolUpdateBatch, decodePriceEntries } from './decoder';

// Types
export { MessageType } from './types';
export type {
  MessageTypeValue,
  DecodedMessage,
  PoolUpdateMessage,
  FeeMarketMessage,
  BlockStatsMessage,
  BlockhashMessage,
  QuoteMessage,
  PriceEntry,
  PriceUpdateMessage,
  PriceBatchMessage,
  PriceSnapshotMessage,
  HeartbeatMessage,
  ErrorMessage,
  SubscribedMessage,
  QuoteSubscribedMessage,
  PongMessage,
} from './types';
