/**
 * Leader Schedule WebSocket message types and interfaces
 * 
 * The leader-schedule service uses JSON mode over WebSocket.
 * Every message is a JSON text frame with:
 * - type: message type name
 * - kind: "snapshot" (full state) | "diff" (merge into snapshot) | "event" (append-only)
 * - key: primary key field for merging (on diff/event types)
 * - data: typed payload
 * 
 * @see https://k256.xyz/docs/leader-schedule
 */

/**
 * Leader Schedule WebSocket channels
 */
export const LeaderChannel = {
  /** Full epoch leader schedule (on connect + epoch change) */
  LeaderSchedule: 'leader_schedule',
  /** Gossip peers (snapshot on connect, then diffs) */
  Gossip: 'gossip',
  /** Real-time slot updates with current leader */
  Slots: 'slots',
  /** Skip events, IP changes, routing health */
  Alerts: 'alerts',
} as const;

export type LeaderChannelValue = typeof LeaderChannel[keyof typeof LeaderChannel];

/** All available channels */
export const ALL_LEADER_CHANNELS: LeaderChannelValue[] = [
  LeaderChannel.LeaderSchedule,
  LeaderChannel.Gossip,
  LeaderChannel.Slots,
  LeaderChannel.Alerts,
];

/**
 * Message kind — tells you how to consume the message
 */
export type MessageKind = 'snapshot' | 'diff' | 'event';

// ═══════════════════════════════════════════════════════════════════════
// Message Interfaces
// ═══════════════════════════════════════════════════════════════════════

/** Protocol schema entry (included in subscribed handshake) */
export interface MessageSchemaEntry {
  type: string;
  tag: string;
  kind: MessageKind;
  key?: string;
  description: string;
}

/** Subscribed response — connection handshake */
export interface LeaderSubscribedMessage {
  type: 'subscribed';
  data: {
    channels: string[];
    currentSlot: number;
    epoch: number;
    schema: MessageSchemaEntry[];
  };
}

/** Full epoch leader schedule (snapshot — replaces previous) */
export interface LeaderScheduleMessage {
  type: 'leader_schedule';
  kind: 'snapshot';
  data: {
    epoch: number;
    slotsInEpoch: number;
    validators: number;
    schedule: Array<{
      identity: string;
      slots: number;
      slotIndices: number[];
    }>;
  };
}

/** Gossip peer data */
export interface GossipPeer {
  identity: string;
  tpuQuic: string | null;
  tpuUdp: string | null;
  tpuForwardsQuic: string | null;
  tpuForwardsUdp: string | null;
  tpuVote: string | null;
  gossipAddr: string | null;
  version: string;
  shredVersion: number;
  stake: number;
  commission: number;
  isDelinquent: boolean;
  wallclock: number;
}

/** Full gossip peer list (snapshot — apply gossip_diff to keep current) */
export interface GossipSnapshotMessage {
  type: 'gossip_snapshot';
  kind: 'snapshot';
  key: 'identity';
  data: {
    timestamp: number;
    count: number;
    peers: GossipPeer[];
  };
}

/** Incremental gossip changes (diff — merge into snapshot using identity) */
export interface GossipDiffMessage {
  type: 'gossip_diff';
  kind: 'diff';
  key: 'identity';
  data: {
    timestampMs: number;
    added: GossipPeer[];
    removed: string[];
    updated: GossipPeer[];
  };
}

/** Current slot with leader identity (snapshot — each replaces previous) */
export interface SlotUpdateMessage {
  type: 'slot_update';
  kind: 'snapshot';
  data: {
    slot: number;
    leader: string;
    blockHeight: number;
  };
}

/** Routing health summary (snapshot — each replaces previous) */
export interface RoutingHealthMessage {
  type: 'routing_health';
  kind: 'snapshot';
  data: {
    leadersTotal: number;
    leadersInGossip: number;
    leadersMissingGossip: string[];
    leadersWithoutTpuQuic: string[];
    leadersDelinquent: string[];
    coverage: string;
  };
}

/** Block production stats per validator (event — cumulative) */
export interface SkipEventMessage {
  type: 'skip_event';
  kind: 'event';
  key: 'leader';
  data: {
    slot: number;
    leader: string;
    assigned: number;
    produced: number;
  };
}

/** Validator IP address change (event) */
export interface IpChangeMessage {
  type: 'ip_change';
  kind: 'event';
  key: 'identity';
  data: {
    identity: string;
    oldIp: string;
    newIp: string;
    timestampMs: number;
  };
}

/** Server heartbeat (snapshot — each replaces previous) */
export interface LeaderHeartbeatMessage {
  type: 'heartbeat';
  kind: 'snapshot';
  data: {
    timestampMs: number;
    currentSlot: number;
    connectedClients: number;
    gossipPeers: number;
  };
}

/** Error from server */
export interface LeaderErrorMessage {
  type: 'error';
  data: {
    message: string;
  };
}

/** Union of all leader-schedule message types */
export type LeaderDecodedMessage =
  | LeaderSubscribedMessage
  | LeaderScheduleMessage
  | GossipSnapshotMessage
  | GossipDiffMessage
  | SlotUpdateMessage
  | RoutingHealthMessage
  | SkipEventMessage
  | IpChangeMessage
  | LeaderHeartbeatMessage
  | LeaderErrorMessage;
