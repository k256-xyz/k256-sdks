/**
 * K256 SDK - Official TypeScript SDK for K256
 * 
 * High-performance Solana swap aggregator SDK with:
 * - WebSocket client for real-time pool updates, priority fees, and streaming quotes
 * - Binary protocol decoder for maximum performance
 * - Type-safe interfaces for all data structures
 * 
 * @packageDocumentation
 * @module @k256/sdk
 * 
 * @example
 * ```typescript
 * import { K256WebSocketClient } from '@k256/sdk';
 * 
 * const client = new K256WebSocketClient({
 *   apiKey: 'your-api-key',
 *   onPoolUpdate: (update) => console.log('Pool:', update.data.poolAddress),
 *   onFeeMarket: (fees) => console.log('Fees:', fees.data.recommended),
 * });
 * 
 * await client.connect();
 * client.subscribe({ channels: ['pools', 'priority_fees'] });
 * ```
 */

// WebSocket module (K2 data — pools, fees, quotes)
export * from './ws';

// Leader Schedule WebSocket module (leader schedule, gossip, routing)
export * from './leader-ws';

// Types module
export * from './types';

// Utils module
export * from './utils';
