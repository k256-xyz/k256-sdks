//! Leader Schedule WebSocket message types.
//!
//! All messages are JSON text frames with: type, kind, key (optional), data.

use serde::{Deserialize, Serialize};

/// Subscription channel constants.
pub const CHANNEL_LEADER_SCHEDULE: &str = "leader_schedule";
pub const CHANNEL_GOSSIP: &str = "gossip";
pub const CHANNEL_SLOTS: &str = "slots";
pub const CHANNEL_ALERTS: &str = "alerts";

/// All available channels.
pub const ALL_CHANNELS: &[&str] = &[
    CHANNEL_LEADER_SCHEDULE,
    CHANNEL_GOSSIP,
    CHANNEL_SLOTS,
    CHANNEL_ALERTS,
];

/// Message kind — how to consume the message.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MessageKind {
    Snapshot,
    Diff,
    Event,
}

/// Generic leader-schedule WS message envelope.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kind: Option<MessageKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    pub data: serde_json::Value,
}

/// Protocol schema entry (from subscribed handshake).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageSchemaEntry {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub tag: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    pub description: String,
}

/// Subscribed response data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderSubscribedData {
    pub channels: Vec<String>,
    #[serde(rename = "currentSlot")]
    pub current_slot: u64,
    pub epoch: u64,
    pub schema: Vec<MessageSchemaEntry>,
}

/// A single gossip peer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GossipPeer {
    pub identity: String,
    #[serde(rename = "tpuQuic")]
    pub tpu_quic: Option<String>,
    #[serde(rename = "tpuUdp")]
    pub tpu_udp: Option<String>,
    #[serde(rename = "tpuForwardsQuic")]
    pub tpu_forwards_quic: Option<String>,
    #[serde(rename = "tpuForwardsUdp")]
    pub tpu_forwards_udp: Option<String>,
    #[serde(rename = "tpuVote")]
    pub tpu_vote: Option<String>,
    #[serde(rename = "gossipAddr")]
    pub gossip_addr: Option<String>,
    pub version: String,
    #[serde(rename = "shredVersion")]
    pub shred_version: u16,
    pub stake: u64,
    pub commission: u8,
    #[serde(rename = "isDelinquent")]
    pub is_delinquent: bool,
    pub wallclock: u64,
    /// ISO 3166 country code (e.g. "US", "DE")
    #[serde(rename = "countryCode", default)]
    pub country_code: String,
    /// Two-letter continent code (e.g. "NA", "EU")
    #[serde(rename = "continentCode", default)]
    pub continent_code: String,
    /// ASN string (e.g. "AS15169")
    #[serde(default)]
    pub asn: String,
    /// AS organization name (e.g. "Google LLC")
    #[serde(rename = "asName", default)]
    pub as_name: String,
    /// AS organization domain (e.g. "google.com")
    #[serde(rename = "asDomain", default)]
    pub as_domain: String,
}

/// Gossip snapshot data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GossipSnapshotData {
    pub timestamp: u64,
    pub count: usize,
    pub peers: Vec<GossipPeer>,
}

/// Gossip diff data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GossipDiffData {
    #[serde(rename = "timestampMs")]
    pub timestamp_ms: u64,
    pub added: Vec<GossipPeer>,
    pub removed: Vec<String>,
    pub updated: Vec<GossipPeer>,
}

/// Slot update data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotUpdateData {
    pub slot: u64,
    pub leader: String,
    #[serde(rename = "blockHeight")]
    pub block_height: u64,
}

/// Routing health data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingHealthData {
    #[serde(rename = "leadersTotal")]
    pub leaders_total: u32,
    #[serde(rename = "leadersInGossip")]
    pub leaders_in_gossip: u32,
    #[serde(rename = "leadersMissingGossip")]
    pub leaders_missing_gossip: Vec<String>,
    #[serde(rename = "leadersWithoutTpuQuic")]
    pub leaders_without_tpu_quic: Vec<String>,
    #[serde(rename = "leadersDelinquent")]
    pub leaders_delinquent: Vec<String>,
    pub coverage: String,
}

/// Skip event data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkipEventData {
    pub slot: u64,
    pub leader: String,
    pub assigned: u32,
    pub produced: u32,
}

/// IP change data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpChangeData {
    pub identity: String,
    #[serde(rename = "oldIp")]
    pub old_ip: String,
    #[serde(rename = "newIp")]
    pub new_ip: String,
    #[serde(rename = "timestampMs")]
    pub timestamp_ms: u64,
}

/// Leader heartbeat data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderHeartbeatData {
    #[serde(rename = "timestampMs")]
    pub timestamp_ms: u64,
    #[serde(rename = "currentSlot")]
    pub current_slot: u64,
    #[serde(rename = "connectedClients")]
    pub connected_clients: u32,
    #[serde(rename = "gossipPeers")]
    pub gossip_peers: u32,
}

/// Leader schedule validator entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderScheduleValidator {
    pub identity: String,
    pub slots: usize,
    #[serde(rename = "slotIndices")]
    pub slot_indices: Vec<u32>,
}

/// Leader schedule data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderScheduleData {
    pub epoch: u64,
    #[serde(rename = "slotsInEpoch")]
    pub slots_in_epoch: u64,
    pub validators: usize,
    pub schedule: Vec<LeaderScheduleValidator>,
}
