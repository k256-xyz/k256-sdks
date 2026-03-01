# frozen_string_literal: true

module K256
  # WebSocket binary message type identifiers.
  # These correspond to the first byte of each binary message.
  module MessageType
    POOL_UPDATE       = 0x01 # Server → Client: Single pool update
    SUBSCRIBE         = 0x02 # Client → Server: Subscribe request (JSON)
    SUBSCRIBED        = 0x03 # Server → Client: Subscription confirmed (JSON)
    UNSUBSCRIBE       = 0x04 # Client → Server: Unsubscribe all
    PRIORITY_FEES     = 0x05 # Server → Client: Priority fee update
    BLOCKHASH         = 0x06 # Server → Client: Recent blockhash
    QUOTE             = 0x07 # Server → Client: Streaming quote update
    QUOTE_SUBSCRIBED  = 0x08 # Server → Client: Quote subscription confirmed
    SUBSCRIBE_QUOTE   = 0x09 # Client → Server: Subscribe to quote stream
    UNSUBSCRIBE_QUOTE = 0x0A # Client → Server: Unsubscribe from quote
    PING              = 0x0B # Client → Server: Ping keepalive
    PONG              = 0x0C # Server → Client: Pong response
    HEARTBEAT         = 0x0D # Server → Client: Connection stats (JSON)
    POOL_UPDATE_BATCH = 0x0E # Server → Client: Batched pool updates
    BLOCK_STATS       = 0x0F # Server → Client: Block-level statistics
    SUBSCRIBE_PRICE   = 0x10 # Client → Server: Subscribe to price updates
    PRICE_UPDATE      = 0x11 # Server → Client: Single price update
    PRICE_BATCH       = 0x12 # Server → Client: Batched price updates
    PRICE_SNAPSHOT    = 0x13 # Server → Client: Initial price snapshot
    UNSUBSCRIBE_PRICE = 0x14 # Client → Server: Unsubscribe from prices
    ERROR             = 0xFF # Server → Client: Error message (UTF-8)
  end

  # Network congestion state.
  module NetworkState
    LOW     = 0 # Low congestion - minimal fees needed
    NORMAL  = 1 # Normal congestion
    HIGH    = 2 # High congestion - higher fees recommended
    EXTREME = 3 # Extreme congestion - maximum fees recommended
  end

  # Order book level with price and size.
  OrderLevel = Struct.new(:price, :size, keyword_init: true)

  # Real-time pool state update from K256 WebSocket.
  PoolUpdate = Struct.new(
    :sequence,
    :slot,
    :write_version,
    :protocol_name,
    :pool_address,
    :token_mints,
    :token_balances,
    :token_decimals,
    :best_bid,
    :best_ask,
    :serialized_state,
    keyword_init: true
  )

  # Per-writable-account fee data.
  # Solana's scheduler limits each writable account to 12M CU per block.
  AccountFee = Struct.new(
    :pubkey,            # base58 account public key
    :total_txs,         # transactions touching this account in window
    :active_slots,      # slots where this account was active
    :cu_consumed,       # total CU consumed
    :utilization_pct,   # utilization percentage (0-100) of 12M CU limit
    :p25,               # 25th percentile fee (microlamports/CU)
    :p50,               # 50th percentile fee
    :p75,               # 75th percentile fee
    :p90,               # 90th percentile fee
    :min_nonzero_price, # minimum non-zero fee observed
    keyword_init: true
  )

  # Fee market update (per-writable-account model).
  # Variable-length wire format: 42-byte header + N × 92 bytes per account.
  FeeMarket = Struct.new(
    :slot,                   # current Solana slot
    :timestamp_ms,           # unix timestamp in milliseconds
    :recommended,            # recommended fee (microlamports/CU)
    :state,                  # network state (0=low, 1=normal, 2=high, 3=extreme)
    :is_stale,               # whether data is stale
    :block_utilization_pct,  # block utilization percentage (0-100)
    :blocks_in_window,       # blocks in observation window
    :accounts,               # array of AccountFee
    keyword_init: true
  )

  # Recent blockhash from K256.
  # Wire format: 65 bytes, little-endian.
  Blockhash = Struct.new(
    :slot,                    # offset 0
    :timestamp_ms,            # offset 8
    :blockhash,               # offset 16 (32 bytes)
    :block_height,            # offset 48
    :last_valid_block_height, # offset 56
    :is_stale,                # offset 64
    keyword_init: true
  )

  # Swap quote from K256.
  Quote = Struct.new(
    :topic_id,
    :timestamp_ms,
    :sequence,
    :input_mint,
    :output_mint,
    :in_amount,
    :out_amount,
    :price_impact_bps,
    :context_slot,
    :algorithm,
    :is_improvement,
    :is_cached,
    :is_stale,
    :route_plan_json,
    keyword_init: true
  )

  # Connection heartbeat with stats.
  Heartbeat = Struct.new(
    :timestamp_ms,
    :uptime_seconds,
    :messages_received,
    :messages_sent,
    :subscriptions,
    keyword_init: true
  )

  # Single token price from the price feed.
  # Wire format per entry: 56 bytes [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
  PriceEntry = Struct.new(
    :mint,         # base58 token mint address
    :usd_price,    # USD price (float, divided by 1e12)
    :slot,         # Solana slot of the observation
    :timestamp_ms, # unix timestamp in milliseconds
    keyword_init: true
  )

  # Token metadata.
  Token = Struct.new(
    :address,
    :symbol,
    :name,
    :decimals,
    :logo_uri,
    :tags,
    :extensions,
    keyword_init: true
  )
end
