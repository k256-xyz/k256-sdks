/**
 * Binary message decoder for Leader Schedule WebSocket protocol
 * 
 * Decodes bincode messages from the leader-schedule server into typed objects.
 * Matches K2 decoder pattern: manual DataView offset walking, little-endian.
 * 
 * Wire format: [1 byte MessageType][N bytes bincode payload]
 */

import { base58Encode } from '../utils/base58';
import type {
  LeaderDecodedMessage,
  GossipPeer,
} from './types';

/** Message type tag constants (must match leader-schedule server protocol.rs) */
export const LeaderMessageTag = {
  Subscribe: 0x01,
  Subscribed: 0x02,
  LeaderSchedule: 0x10,
  GossipSnapshot: 0x11,
  GossipDiff: 0x12,
  SlotUpdate: 0x13,
  RoutingHealth: 0x14,
  SkipEvent: 0x15,
  IpChange: 0x16,
  Heartbeat: 0xFD,
  Ping: 0xFE,
  Error: 0xFF,
} as const;

/** Mutable offset tracker for sequential reading */
type Offset = { v: number };

/** Read a bincode u64 (little-endian) */
function readU64(view: DataView, o: Offset): number {
  const val = Number(view.getBigUint64(o.v, true));
  o.v += 8;
  return val;
}

/** Read a bincode u32 (little-endian) */
function readU32(view: DataView, o: Offset): number {
  const val = view.getUint32(o.v, true);
  o.v += 4;
  return val;
}

/** Read a bincode u16 (little-endian) */
function readU16(view: DataView, o: Offset): number {
  const val = view.getUint16(o.v, true);
  o.v += 2;
  return val;
}

/** Read a bincode u8 */
function readU8(view: DataView, o: Offset): number {
  const val = view.getUint8(o.v);
  o.v += 1;
  return val;
}

/** Read a bincode bool */
function readBool(view: DataView, o: Offset): boolean {
  return readU8(view, o) !== 0;
}

/** Read a [u8; 32] pubkey as base58 string */
function readPubkey(data: ArrayBuffer, o: Offset): string {
  const bytes = new Uint8Array(data, o.v, 32);
  o.v += 32;
  return base58Encode(bytes);
}

/** Read a [u8; 32] pubkey as raw bytes */
function readPubkeyBytes(data: ArrayBuffer, o: Offset): Uint8Array {
  const bytes = new Uint8Array(data.slice(o.v, o.v + 32));
  o.v += 32;
  return bytes;
}

/** Read a bincode Vec<u8> as string */
function readVecU8AsString(view: DataView, data: ArrayBuffer, o: Offset): string {
  const len = readU64(view, o);
  const bytes = new Uint8Array(data, o.v, len);
  o.v += len;
  return new TextDecoder().decode(bytes);
}

/** Read a bincode Option<SocketAddrWire>: tag + ip[16] + port:u16 + is_ipv4:bool */
function readOptSocketAddr(view: DataView, o: Offset): string | null {
  const tag = readU8(view, o);
  if (tag === 0) return null;
  const ipBytes = new Uint8Array(view.buffer, view.byteOffset + o.v, 16);
  o.v += 16;
  const port = readU16(view, o);
  const isIpv4 = readBool(view, o);
  if (isIpv4) {
    return `${ipBytes[12]}.${ipBytes[13]}.${ipBytes[14]}.${ipBytes[15]}:${port}`;
  }
  return `[ipv6]:${port}`;
}

/** Read a bincode Vec<[u8;32]> as base58 string array */
function readPubkeyVec(view: DataView, data: ArrayBuffer, o: Offset): string[] {
  const count = readU64(view, o);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(readPubkey(data, o));
  }
  return keys;
}

/** Read a single GossipPeer from bincode */
function readGossipPeer(view: DataView, data: ArrayBuffer, o: Offset): GossipPeer {
  return {
    identity: readPubkey(data, o),
    tpuQuic: readOptSocketAddr(view, o),
    tpuUdp: readOptSocketAddr(view, o),
    tpuForwardsQuic: readOptSocketAddr(view, o),
    tpuForwardsUdp: readOptSocketAddr(view, o),
    tpuVote: readOptSocketAddr(view, o),
    tpuVoteQuic: readOptSocketAddr(view, o),
    gossipAddr: readOptSocketAddr(view, o),
    shredVersion: readU16(view, o),
    version: readVecU8AsString(view, data, o),
    activatedStake: readU64(view, o),
    commission: readU8(view, o),
    isDelinquent: readBool(view, o),
    votePubkey: readPubkey(data, o),
    lastVote: readU64(view, o),
    rootSlot: readU64(view, o),
    wallclock: readU64(view, o),
  };
}

/** Read a bincode Vec<GossipPeer> */
function readGossipPeerVec(view: DataView, data: ArrayBuffer, o: Offset): GossipPeer[] {
  const count = readU64(view, o);
  const peers: GossipPeer[] = [];
  for (let i = 0; i < count; i++) {
    peers.push(readGossipPeer(view, data, o));
  }
  return peers;
}

/**
 * Decode a binary WebSocket message from the leader-schedule server.
 * 
 * @param data - Raw binary data from WebSocket
 * @returns Decoded message or null if unrecognized type
 */
export function decodeLeaderMessage(data: ArrayBuffer): LeaderDecodedMessage | null {
  const view = new DataView(data);
  if (data.byteLength < 1) return null;

  const msgType = view.getUint8(0);
  const payload = data.slice(1);
  const pv = new DataView(payload);

  switch (msgType) {
    case LeaderMessageTag.Subscribed: {
      const text = new TextDecoder().decode(payload);
      try {
        return { type: 'subscribed', data: JSON.parse(text) };
      } catch {
        return null;
      }
    }

    case LeaderMessageTag.Error: {
      return { type: 'error', data: { message: new TextDecoder().decode(payload) } };
    }

    case LeaderMessageTag.SlotUpdate: {
      if (payload.byteLength < 48) return null;
      const o: Offset = { v: 0 };
      return {
        type: 'slot_update',
        kind: 'snapshot',
        data: {
          slot: readU64(pv, o),
          leader: readPubkey(payload, o),
          blockHeight: readU64(pv, o),
        },
      };
    }

    case LeaderMessageTag.Heartbeat: {
      if (payload.byteLength < 24) return null;
      const o: Offset = { v: 0 };
      return {
        type: 'heartbeat',
        kind: 'snapshot',
        data: {
          timestampMs: readU64(pv, o),
          currentSlot: readU64(pv, o),
          connectedClients: readU32(pv, o),
          gossipPeers: readU32(pv, o),
        },
      };
    }

    case LeaderMessageTag.SkipEvent: {
      if (payload.byteLength < 48) return null;
      const o: Offset = { v: 0 };
      return {
        type: 'skip_event',
        kind: 'event',
        key: 'leader',
        data: {
          slot: readU64(pv, o),
          leader: readPubkey(payload, o),
          assigned: readU32(pv, o),
          produced: readU32(pv, o),
        },
      };
    }

    case LeaderMessageTag.RoutingHealth: {
      if (payload.byteLength < 8) return null;
      try {
        const o: Offset = { v: 0 };
        const leadersTotal = readU32(pv, o);
        const leadersInGossip = readU32(pv, o);
        const leadersMissingGossip = readPubkeyVec(pv, payload, o);
        const leadersWithoutTpuQuic = readPubkeyVec(pv, payload, o);
        const leadersDelinquent = readPubkeyVec(pv, payload, o);
        return {
          type: 'routing_health',
          kind: 'snapshot',
          data: {
            leadersTotal,
            leadersInGossip,
            leadersMissingGossip,
            leadersWithoutTpuQuic,
            leadersDelinquent,
            coverage: `${leadersTotal > 0 ? (leadersInGossip / leadersTotal * 100).toFixed(1) : 0}%`,
          },
        };
      } catch { return null; }
    }

    case LeaderMessageTag.IpChange: {
      if (payload.byteLength < 32) return null;
      try {
        const o: Offset = { v: 0 };
        const identity = readPubkey(payload, o);
        const oldIp = readVecU8AsString(pv, payload, o);
        const newIp = readVecU8AsString(pv, payload, o);
        const timestampMs = readU64(pv, o);
        return {
          type: 'ip_change',
          kind: 'event',
          key: 'identity',
          data: { identity, oldIp, newIp, timestampMs },
        };
      } catch { return null; }
    }

    case LeaderMessageTag.GossipSnapshot: {
      if (payload.byteLength < 8) return null;
      try {
        const o: Offset = { v: 0 };
        const timestampMs = readU64(pv, o);
        const peers = readGossipPeerVec(pv, payload, o);
        return {
          type: 'gossip_snapshot',
          kind: 'snapshot',
          key: 'identity',
          data: { timestampMs, count: peers.length, peers },
        };
      } catch { return null; }
    }

    case LeaderMessageTag.GossipDiff: {
      if (payload.byteLength < 8) return null;
      try {
        const o: Offset = { v: 0 };
        const timestampMs = readU64(pv, o);
        const added = readGossipPeerVec(pv, payload, o);
        const removed = readPubkeyVec(pv, payload, o);
        const updated = readGossipPeerVec(pv, payload, o);
        return {
          type: 'gossip_diff',
          kind: 'diff',
          key: 'identity',
          data: { timestampMs, added, removed, updated },
        };
      } catch { return null; }
    }

    case LeaderMessageTag.LeaderSchedule: {
      if (payload.byteLength < 16) return null;
      try {
        const o: Offset = { v: 0 };
        const epoch = readU64(pv, o);
        const slotsInEpoch = readU64(pv, o);
        const validatorCount = readU64(pv, o);
        const schedule: Array<{ identity: string; slots: number; slotIndices: number[] }> = [];
        for (let i = 0; i < validatorCount; i++) {
          const identity = readPubkey(payload, o);
          const slotCount = readU64(pv, o);
          const slotIndices: number[] = [];
          for (let j = 0; j < slotCount; j++) {
            slotIndices.push(readU32(pv, o));
          }
          schedule.push({ identity, slots: slotIndices.length, slotIndices });
        }
        return {
          type: 'leader_schedule',
          kind: 'snapshot',
          data: { epoch, slotsInEpoch, validators: schedule.length, schedule },
        };
      } catch { return null; }
    }

    default:
      return null;
  }
}
