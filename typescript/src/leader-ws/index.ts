/**
 * Leader Schedule WebSocket module for K256 SDK
 * 
 * Real-time Solana leader schedule, gossip network, and routing data.
 * Binary mode by default (wincode protocol). JSON mode opt-in via gateway.
 * 
 * @module @k256/sdk/leader-ws
 * 
 * @example
 * ```typescript
 * import { LeaderWebSocketClient } from '@k256/sdk/leader-ws';
 * 
 * const client = new LeaderWebSocketClient({
 *   apiKey: 'your-api-key',
 *   onSlotUpdate: (msg) => console.log('Slot:', msg.data.slot),
 *   onRoutingHealth: (msg) => console.log('Coverage:', msg.data.coverage),
 *   onGossipDiff: (msg) => {
 *     // Merge into your local peer map using identity as key
 *     for (const peer of msg.data.added) peerMap.set(peer.identity, peer);
 *     for (const peer of msg.data.updated) peerMap.set(peer.identity, peer);
 *     for (const id of msg.data.removed) peerMap.delete(id);
 *   },
 * });
 * 
 * await client.connect();
 * ```
 */

// Client
export { LeaderWebSocketClient, LeaderWebSocketError } from './client';
export type {
  LeaderWebSocketClientConfig,
  LeaderErrorCode,
  ConnectionState,
} from './client';

// Decoder (for advanced usage)
export { decodeLeaderMessage, LeaderMessageTag } from './decoder';

// Types
export { LeaderChannel, ALL_LEADER_CHANNELS } from './types';
export type {
  LeaderChannelValue,
  MessageKind,
  MessageSchemaEntry,
  LeaderDecodedMessage,
  LeaderSubscribedMessage,
  LeaderScheduleMessage,
  GossipSnapshotMessage,
  GossipDiffMessage,
  GossipPeer,
  SlotUpdateMessage,
  RoutingHealthMessage,
  SkipEventMessage,
  IpChangeMessage,
  LeaderHeartbeatMessage,
  LeaderErrorMessage,
} from './types';
