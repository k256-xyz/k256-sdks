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
 *   onPriorityFees: (fees) => console.log('Fees:', fees.data.recommended),
 * });
 * 
 * await client.connect();
 * client.subscribe({ channels: ['pools', 'priority_fees'] });
 * ```
 */

// WebSocket module
export * from './ws';

// Types module
export * from './types';

// Utils module
export * from './utils';
