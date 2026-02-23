"""
Leader Schedule WebSocket message types.
All messages are JSON text frames with: type, kind, key (optional), data.
"""

# Channel constants
const LEADER_CHANNEL_LEADER_SCHEDULE = "leader_schedule"
const LEADER_CHANNEL_GOSSIP = "gossip"
const LEADER_CHANNEL_SLOTS = "slots"
const LEADER_CHANNEL_ALERTS = "alerts"
const ALL_LEADER_CHANNELS = [
    LEADER_CHANNEL_LEADER_SCHEDULE,
    LEADER_CHANNEL_GOSSIP,
    LEADER_CHANNEL_SLOTS,
    LEADER_CHANNEL_ALERTS,
]

"""A single gossip network peer."""
struct GossipPeer
    identity::String
    tpu_quic::Union{String, Nothing}
    tpu_udp::Union{String, Nothing}
    tpu_forwards_quic::Union{String, Nothing}
    tpu_forwards_udp::Union{String, Nothing}
    tpu_vote::Union{String, Nothing}
    gossip_addr::Union{String, Nothing}
    version::String
    shred_version::UInt16
    stake::UInt64
    commission::UInt8
    is_delinquent::Bool
    wallclock::UInt64
    country_code::Union{String, Nothing}
    continent_code::Union{String, Nothing}
    asn::Union{String, Nothing}
    as_name::Union{String, Nothing}
    city::Union{String, Nothing}
    region::Union{String, Nothing}
    latitude::Union{Float64, Nothing}
    longitude::Union{Float64, Nothing}
    timezone::Union{String, Nothing}
end

"""Slot update data (snapshot)."""
struct SlotUpdateData
    slot::UInt64
    leader::String
    block_height::UInt64
end

"""Routing health data (snapshot)."""
struct RoutingHealthData
    leaders_total::UInt32
    leaders_in_gossip::UInt32
    leaders_missing_gossip::Vector{String}
    leaders_without_tpu_quic::Vector{String}
    leaders_delinquent::Vector{String}
    coverage::String
end

"""Gossip diff data (diff, key: identity)."""
struct GossipDiffData
    timestamp_ms::UInt64
    added::Vector{GossipPeer}
    removed::Vector{String}
    updated::Vector{GossipPeer}
end

"""Skip event data (event, key: leader)."""
struct SkipEventData
    slot::UInt64
    leader::String
    assigned::UInt32
    produced::UInt32
end

"""IP change event data."""
struct IpChangeData
    identity::String
    old_ip::String
    new_ip::String
    timestamp_ms::UInt64
end

"""Heartbeat data (snapshot)."""
struct LeaderHeartbeatData
    timestamp_ms::UInt64
    current_slot::UInt64
    connected_clients::UInt32
    gossip_peers::UInt32
end
