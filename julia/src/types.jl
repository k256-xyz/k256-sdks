"""
WebSocket binary message type identifiers.
These correspond to the first byte of each binary message.
"""
module MessageType
    const POOL_UPDATE       = 0x01  # Server → Client: Single pool update
    const SUBSCRIBE         = 0x02  # Client → Server: Subscribe request (JSON)
    const SUBSCRIBED        = 0x03  # Server → Client: Subscription confirmed (JSON)
    const UNSUBSCRIBE       = 0x04  # Client → Server: Unsubscribe all
    const PRIORITY_FEES     = 0x05  # Server → Client: Priority fee update
    const BLOCKHASH         = 0x06  # Server → Client: Recent blockhash
    const QUOTE             = 0x07  # Server → Client: Streaming quote update
    const QUOTE_SUBSCRIBED  = 0x08  # Server → Client: Quote subscription confirmed
    const SUBSCRIBE_QUOTE   = 0x09  # Client → Server: Subscribe to quote stream
    const UNSUBSCRIBE_QUOTE = 0x0A  # Client → Server: Unsubscribe from quote
    const PING              = 0x0B  # Client → Server: Ping keepalive
    const PONG              = 0x0C  # Server → Client: Pong response
    const HEARTBEAT         = 0x0D  # Server → Client: Connection stats (JSON)
    const POOL_UPDATE_BATCH = 0x0E  # Server → Client: Batched pool updates
    const ERROR             = 0xFF  # Server → Client: Error message (UTF-8)
end

"""
Network congestion state.
"""
module NetworkState
    const LOW     = 0  # Low congestion - minimal fees needed
    const NORMAL  = 1  # Normal congestion
    const HIGH    = 2  # High congestion - higher fees recommended
    const EXTREME = 3  # Extreme congestion - maximum fees recommended
end

"""
Order book level with price and size.
"""
struct OrderLevel
    price::UInt64
    size::UInt64
end

"""
Real-time pool state update from K256 WebSocket.
"""
struct PoolUpdate
    sequence::UInt64
    slot::UInt64
    write_version::UInt64
    protocol_name::String
    pool_address::String
    token_mints::Vector{String}
    token_balances::Vector{UInt64}
    token_decimals::Vector{Int32}
    best_bid::Union{OrderLevel, Nothing}
    best_ask::Union{OrderLevel, Nothing}
    serialized_state::Vector{UInt8}
end

"""
Priority fee recommendations from K256.
Wire format: 119 bytes, little-endian.
"""
struct PriorityFees
    slot::UInt64             # offset 0
    timestamp_ms::UInt64     # offset 8
    recommended::UInt64      # offset 16
    state::UInt8             # offset 24
    is_stale::Bool           # offset 25
    swap_p50::UInt64         # offset 26
    swap_p75::UInt64         # offset 34
    swap_p90::UInt64         # offset 42
    swap_p99::UInt64         # offset 50
    swap_samples::UInt32     # offset 58
    landing_p50_fee::UInt64  # offset 62
    landing_p75_fee::UInt64  # offset 70
    landing_p90_fee::UInt64  # offset 78
    landing_p99_fee::UInt64  # offset 86
    top_10_fee::UInt64       # offset 94
    top_25_fee::UInt64       # offset 102
    spike_detected::Bool     # offset 110
    spike_fee::UInt64        # offset 111
end

"""
Recent blockhash from K256.
Wire format: 65 bytes, little-endian.
"""
struct Blockhash
    slot::UInt64                    # offset 0
    timestamp_ms::UInt64            # offset 8
    blockhash::String               # offset 16 (32 bytes)
    block_height::UInt64            # offset 48
    last_valid_block_height::UInt64 # offset 56
    is_stale::Bool                  # offset 64
end

"""
Swap quote from K256.
"""
struct Quote
    topic_id::String
    timestamp_ms::UInt64
    sequence::UInt64
    input_mint::String
    output_mint::String
    in_amount::UInt64
    out_amount::UInt64
    price_impact_bps::Int32
    context_slot::UInt64
    algorithm::String
    is_improvement::Bool
    is_cached::Bool
    is_stale::Bool
    route_plan_json::Union{String, Nothing}
end

"""
Connection heartbeat with stats.
"""
struct Heartbeat
    timestamp_ms::UInt64
    uptime_seconds::UInt64
    messages_received::UInt64
    messages_sent::UInt64
    subscriptions::UInt32
end

"""
Token metadata.
"""
struct Token
    address::String
    symbol::String
    name::String
    decimals::UInt8
    logo_uri::Union{String, Nothing}
    tags::Union{Vector{String}, Nothing}
end
