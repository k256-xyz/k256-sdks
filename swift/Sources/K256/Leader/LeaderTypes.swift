import Foundation

/// Leader Schedule WebSocket message types.
/// All messages are JSON text frames with: type, kind, key (optional), data.

public enum LeaderChannel: String, CaseIterable {
    case leaderSchedule = "leader_schedule"
    case gossip = "gossip"
    case slots = "slots"
    case alerts = "alerts"
}

public enum MessageKind: String, Codable {
    case snapshot
    case diff
    case event
}

public struct GossipPeer: Codable {
    public let identity: String
    public let tpuQuic: String?
    public let tpuUdp: String?
    public let tpuForwardsQuic: String?
    public let tpuForwardsUdp: String?
    public let tpuVote: String?
    public let gossipAddr: String?
    public let version: String
    public let shredVersion: UInt16
    public let stake: UInt64
    public let commission: UInt8
    public let isDelinquent: Bool
    public let wallclock: UInt64
    /// ISO 3166 country code (e.g. "US", "DE")
    public let countryCode: String?
    /// Two-letter continent code (e.g. "NA", "EU")
    public let continentCode: String?
    /// ASN string (e.g. "AS15169")
    public let asn: String?
    /// AS organization name (e.g. "Google LLC")
    public let asName: String?
    /// AS organization domain (e.g. "google.com")
    public let asDomain: String?
}

public struct SlotUpdateData: Codable {
    public let slot: UInt64
    public let leader: String
    public let blockHeight: UInt64
}

public struct RoutingHealthData: Codable {
    public let leadersTotal: UInt32
    public let leadersInGossip: UInt32
    public let leadersMissingGossip: [String]
    public let leadersWithoutTpuQuic: [String]
    public let leadersDelinquent: [String]
    public let coverage: String
}

public struct GossipDiffData: Codable {
    public let timestampMs: UInt64
    public let added: [GossipPeer]
    public let removed: [String]
    public let updated: [GossipPeer]
}

public struct SkipEventData: Codable {
    public let slot: UInt64
    public let leader: String
    public let assigned: UInt32
    public let produced: UInt32
}

public struct IpChangeData: Codable {
    public let identity: String
    public let oldIp: String
    public let newIp: String
    public let timestampMs: UInt64
}

public struct LeaderHeartbeatData: Codable {
    public let timestampMs: UInt64
    public let currentSlot: UInt64
    public let connectedClients: UInt32
    public let gossipPeers: UInt32
}

public struct MessageSchemaEntry: Codable {
    public let type: String
    public let tag: String
    public let kind: String
    public let key: String?
    public let description: String
}

public struct LeaderSubscribedData: Codable {
    public let channels: [String]
    public let currentSlot: UInt64
    public let epoch: UInt64
    public let schema: [MessageSchemaEntry]
}
