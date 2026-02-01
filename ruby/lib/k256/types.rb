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

  # Priority fee recommendations from K256.
  # Wire format: 119 bytes, little-endian.
  PriorityFees = Struct.new(
    :slot,             # offset 0
    :timestamp_ms,     # offset 8
    :recommended,      # offset 16
    :state,            # offset 24
    :is_stale,         # offset 25
    :swap_p50,         # offset 26
    :swap_p75,         # offset 34
    :swap_p90,         # offset 42
    :swap_p99,         # offset 50
    :swap_samples,     # offset 58
    :landing_p50_fee,  # offset 62
    :landing_p75_fee,  # offset 70
    :landing_p90_fee,  # offset 78
    :landing_p99_fee,  # offset 86
    :top_10_fee,       # offset 94
    :top_25_fee,       # offset 102
    :spike_detected,   # offset 110
    :spike_fee,        # offset 111
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
