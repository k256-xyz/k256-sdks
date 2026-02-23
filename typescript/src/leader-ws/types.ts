/**
 * Leader Schedule WebSocket message types and interfaces
 * 
 * The leader-schedule WS uses wincode binary protocol (matching K2 pattern).
 * Wire format: [1-byte tag][wincode payload]
 * Every decoded message has:
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

/** Gossip peer data (field names match REST /gossip/peer/:id for consistency) */
export interface GossipPeer {
  identity: string;
  tpuQuic: string | null;
  tpuUdp: string | null;
  tpuForwardsQuic: string | null;
  tpuForwardsUdp: string | null;
  tpuVote: string | null;
  tpuVoteQuic: string | null;
  gossipAddr: string | null;
  shredVersion: number;
  version: string;
  /** Activated stake in lamports (matches REST field name "stake") */
  stake: number;
  commission: number;
  isDelinquent: boolean;
  /** Vote account pubkey (matches REST field name "voteAccount") */
  voteAccount: string;
  lastVote: number;
  rootSlot: number;
  wallclock: number;
  /** ISO 3166 country code (e.g. "US", "DE") — from MaxMind GeoLite2 on server */
  countryCode: string;
  /** Two-letter continent code (e.g. "NA", "EU") */
  continentCode: string;
  /** ASN string (e.g. "AS15169") */
  asn: string;
  /** AS organization name (e.g. "Google LLC") */
  asName: string;
  /** City name (e.g. "Frankfurt") — from MaxMind GeoLite2 on server */
  city: string;
  /** Region/state name (e.g. "California") */
  region: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** IANA timezone (e.g. "America/Los_Angeles") */
  timezone: string;
}

/** Full gossip peer list (snapshot — apply gossip_diff to keep current) */
export interface GossipSnapshotMessage {
  type: 'gossip_snapshot';
  kind: 'snapshot';
  key: 'identity';
  data: {
    timestampMs: number;
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
