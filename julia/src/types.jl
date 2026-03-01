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
    const BLOCK_STATS       = 0x0F  # Server → Client: Block-level statistics
    const SUBSCRIBE_PRICE   = 0x10  # Client → Server: Subscribe to price updates
    const PRICE_UPDATE      = 0x11  # Server → Client: Single price update
    const PRICE_BATCH       = 0x12  # Server → Client: Batched price updates
    const PRICE_SNAPSHOT    = 0x13  # Server → Client: Initial price snapshot
    const UNSUBSCRIBE_PRICE = 0x14  # Client → Server: Unsubscribe from prices
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
Per-writable-account fee data.
Solana's scheduler limits each writable account to 12M CU per block.
"""
struct AccountFee
    pubkey::String            # base58 account public key
    total_txs::UInt32         # transactions touching this account in window
    active_slots::UInt32      # slots where this account was active
    cu_consumed::UInt64       # total CU consumed
    utilization_pct::Float32  # utilization percentage (0-100) of 12M CU limit
    p25::UInt64               # 25th percentile fee (microlamports/CU)
    p50::UInt64               # 50th percentile fee
    p75::UInt64               # 75th percentile fee
    p90::UInt64               # 90th percentile fee
    min_nonzero_price::UInt64 # minimum non-zero fee observed
end

"""
Fee market update (per-writable-account model).
Variable-length wire format: 42-byte header + N × 92 bytes per account.
"""
struct FeeMarket
    slot::UInt64                    # current Solana slot
    timestamp_ms::UInt64            # unix timestamp in milliseconds
    recommended::UInt64             # recommended fee (microlamports/CU)
    state::UInt8                    # network state (0=low, 1=normal, 2=high, 3=extreme)
    is_stale::Bool                  # whether data is stale
    block_utilization_pct::Float32  # block utilization percentage (0-100)
    blocks_in_window::UInt32        # blocks in observation window
    accounts::Vector{AccountFee}    # per-account fee data
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
Single token price from the price feed.
Wire format per entry: 56 bytes [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
"""
struct PriceEntry
    mint::String            # base58 token mint address
    usd_price::Float64      # USD price (divided by 1e12)
    slot::UInt64            # Solana slot of the observation
    timestamp_ms::UInt64    # unix timestamp in milliseconds
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
