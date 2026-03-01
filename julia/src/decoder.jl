"""
Binary message decoder for K256 WebSocket protocol.
"""

# Helper functions for reading little-endian integers
read_u64_le(data::Vector{UInt8}, offset::Int) = 
    reinterpret(UInt64, data[offset:offset+7])[1]

read_u32_le(data::Vector{UInt8}, offset::Int) = 
    reinterpret(UInt32, data[offset:offset+3])[1]

read_u16_le(data::Vector{UInt8}, offset::Int) = 
    reinterpret(UInt16, data[offset:offset+1])[1]

read_i32_le(data::Vector{UInt8}, offset::Int) =
    reinterpret(Int32, data[offset:offset+3])[1]

read_f32_le(data::Vector{UInt8}, offset::Int) =
    reinterpret(Float32, data[offset:offset+3])[1]

"""
    decode_fee_market(data::Vector{UInt8}) -> Union{FeeMarket, Nothing}

Decode fee market from binary payload (per-writable-account model).
Variable-length wire format: 42-byte header + N × 92 bytes per account.

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `FeeMarket` or `nothing` if too short
"""
function decode_fee_market(data::Vector{UInt8})::Union{FeeMarket, Nothing}
    length(data) < 42 && return nothing

    # Julia uses 1-based indexing
    slot = read_u64_le(data, 1)              # offset 0
    timestamp_ms = read_u64_le(data, 9)      # offset 8
    recommended = read_u64_le(data, 17)      # offset 16
    state = data[25]                          # offset 24
    is_stale = data[26] != 0                  # offset 25
    block_utilization_pct = read_f32_le(data, 27)  # offset 26
    blocks_in_window = read_u32_le(data, 31)       # offset 30
    account_count = Int(read_u64_le(data, 35))     # offset 34

    accounts = AccountFee[]
    offset = 43  # offset 42 in 1-based
    for _ in 1:account_count
        offset + 91 > length(data) && break
        pubkey = base58_encode(data[offset:offset+31])
        total_txs = read_u32_le(data, offset + 32)
        active_slots = read_u32_le(data, offset + 36)
        cu_consumed = read_u64_le(data, offset + 40)
        utilization_pct = read_f32_le(data, offset + 48)
        p25 = read_u64_le(data, offset + 52)
        p50 = read_u64_le(data, offset + 60)
        p75 = read_u64_le(data, offset + 68)
        p90 = read_u64_le(data, offset + 76)
        min_nonzero_price = read_u64_le(data, offset + 84)

        push!(accounts, AccountFee(
            pubkey, total_txs, active_slots, cu_consumed, utilization_pct,
            p25, p50, p75, p90, min_nonzero_price
        ))
        offset += 92
    end

    FeeMarket(
        slot, timestamp_ms, recommended, state, is_stale,
        block_utilization_pct, blocks_in_window, accounts
    )
end

"""
    decode_blockhash(data::Vector{UInt8}) -> Union{Blockhash, Nothing}

Decode blockhash from binary payload.
Wire format: 65 bytes, little-endian.

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `Blockhash` or `nothing` if too short
"""
function decode_blockhash(data::Vector{UInt8})::Union{Blockhash, Nothing}
    length(data) < 65 && return nothing
    
    Blockhash(
        read_u64_le(data, 1),           # slot (offset 0)
        read_u64_le(data, 9),           # timestamp_ms (offset 8)
        base58_encode(data[17:48]),     # blockhash (offset 16, 32 bytes)
        read_u64_le(data, 49),          # block_height (offset 48)
        read_u64_le(data, 57),          # last_valid_block_height (offset 56)
        data[65] != 0                   # is_stale (offset 64)
    )
end

"""
    decode_pool_update(data::Vector{UInt8}) -> Union{PoolUpdate, Nothing}

Decode a single pool update from binary payload.

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `PoolUpdate` or `nothing` if decoding fails
"""
function decode_pool_update(data::Vector{UInt8})::Union{PoolUpdate, Nothing}
    data_len = length(data)
    data_len < 8 && return nothing
    
    try
        offset = 1  # Julia uses 1-based indexing
        
        # serialized_state: Bytes (u64 len + bytes)
        state_len = Int(read_u64_le(data, offset))
        offset += 8
        offset + state_len - 1 > data_len && return nothing
        serialized_state = data[offset:offset+state_len-1]
        offset += state_len
        
        # sequence (u64)
        offset + 7 > data_len && return nothing
        sequence = read_u64_le(data, offset)
        offset += 8
        
        # slot (u64)
        offset + 7 > data_len && return nothing
        slot = read_u64_le(data, offset)
        offset += 8
        
        # write_version (u64)
        offset + 7 > data_len && return nothing
        write_version = read_u64_le(data, offset)
        offset += 8
        
        # protocol_name: String (u64 len + UTF-8 bytes)
        offset + 7 > data_len && return nothing
        protocol_len = Int(read_u64_le(data, offset))
        offset += 8
        offset + protocol_len - 1 > data_len && return nothing
        protocol_name = String(data[offset:offset+protocol_len-1])
        offset += protocol_len
        
        # pool_address: [u8; 32]
        offset + 31 > data_len && return nothing
        pool_address = base58_encode(data[offset:offset+31])
        offset += 32
        
        # all_token_mints: Vec<[u8; 32]>
        offset + 7 > data_len && return nothing
        mint_count = Int(read_u64_le(data, offset))
        offset += 8
        offset + mint_count * 32 - 1 > data_len && return nothing
        token_mints = String[]
        for _ in 1:mint_count
            push!(token_mints, base58_encode(data[offset:offset+31]))
            offset += 32
        end
        
        # all_token_balances: Vec<u64>
        offset + 7 > data_len && return nothing
        balance_count = Int(read_u64_le(data, offset))
        offset += 8
        offset + balance_count * 8 - 1 > data_len && return nothing
        token_balances = UInt64[]
        for _ in 1:balance_count
            push!(token_balances, read_u64_le(data, offset))
            offset += 8
        end
        
        # all_token_decimals: Vec<i32>
        offset + 7 > data_len && return nothing
        decimals_count = Int(read_u64_le(data, offset))
        offset += 8
        offset + decimals_count * 4 - 1 > data_len && return nothing
        token_decimals = Int32[]
        for _ in 1:decimals_count
            push!(token_decimals, read_i32_le(data, offset))
            offset += 4
        end
        
        # best_bid: Option<OrderLevel>
        best_bid = nothing
        if offset <= data_len && data[offset] == 1
            offset += 1
            offset + 15 > data_len && return nothing
            best_bid = OrderLevel(
                read_u64_le(data, offset),
                read_u64_le(data, offset + 8)
            )
            offset += 16
        elseif offset <= data_len
            offset += 1
        end
        
        # best_ask: Option<OrderLevel>
        best_ask = nothing
        if offset <= data_len && data[offset] == 1
            offset += 1
            offset + 15 > data_len && return nothing
            best_ask = OrderLevel(
                read_u64_le(data, offset),
                read_u64_le(data, offset + 8)
            )
        end
        
        return PoolUpdate(
            sequence, slot, write_version, protocol_name, pool_address,
            token_mints, token_balances, token_decimals,
            best_bid, best_ask, serialized_state
        )
    catch
        return nothing
    end
end

"""
    decode_pool_update_batch(data::Vector{UInt8}) -> Vector{PoolUpdate}

Decode a batch of pool updates.
Wire format: [u16 count][u32 len1][payload1]...

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Vector of decoded `PoolUpdate` objects
"""
function decode_pool_update_batch(data::Vector{UInt8})::Vector{PoolUpdate}
    length(data) < 2 && return PoolUpdate[]
    
    count = Int(read_u16_le(data, 1))
    offset = 3  # After u16
    
    updates = PoolUpdate[]
    for _ in 1:count
        offset + 3 > length(data) && break
        
        payload_len = Int(read_u32_le(data, offset))
        offset += 4
        
        offset + payload_len - 1 > length(data) && break
        
        update_data = data[offset:offset+payload_len-1]
        update = decode_pool_update(update_data)
        update !== nothing && push!(updates, update)
        
        offset += payload_len
    end
    
    return updates
end

"""
    decode_quote(data::Vector{UInt8}) -> Union{Quote, Nothing}

Decode a quote from binary payload.

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `Quote` or `nothing` if decoding fails
"""
function decode_quote(data::Vector{UInt8})::Union{Quote, Nothing}
    length(data) < 8 && return nothing
    
    try
        offset = 1
        
        # topic_id: String (u64 len + UTF-8 bytes)
        topic_len = Int(read_u64_le(data, offset))
        offset += 8
        topic_id = String(data[offset:offset+topic_len-1])
        offset += topic_len
        
        # timestamp_ms (u64)
        timestamp_ms = read_u64_le(data, offset)
        offset += 8
        
        # sequence (u64)
        sequence = read_u64_le(data, offset)
        offset += 8
        
        # input_mint ([u8; 32])
        input_mint = base58_encode(data[offset:offset+31])
        offset += 32
        
        # output_mint ([u8; 32])
        output_mint = base58_encode(data[offset:offset+31])
        offset += 32
        
        # in_amount (u64)
        in_amount = read_u64_le(data, offset)
        offset += 8
        
        # out_amount (u64)
        out_amount = read_u64_le(data, offset)
        offset += 8
        
        # price_impact_bps (i32)
        price_impact_bps = read_i32_le(data, offset)
        offset += 4
        
        # context_slot (u64)
        context_slot = read_u64_le(data, offset)
        offset += 8
        
        # algorithm: String (u64 len + UTF-8 bytes)
        algo_len = Int(read_u64_le(data, offset))
        offset += 8
        algorithm = String(data[offset:offset+algo_len-1])
        offset += algo_len
        
        # is_improvement (bool)
        is_improvement = data[offset] != 0
        offset += 1
        
        # is_cached (bool)
        is_cached = data[offset] != 0
        offset += 1
        
        # is_stale (bool)
        is_stale = data[offset] != 0
        offset += 1
        
        # route_plan_json: Vec<u8> (u64 len + bytes)
        route_plan_json = nothing
        if offset + 7 <= length(data)
            route_len = Int(read_u64_le(data, offset))
            offset += 8
            if route_len > 0 && offset + route_len - 1 <= length(data)
                route_plan_json = String(data[offset:offset+route_len-1])
            end
        end
        
        return Quote(
            topic_id, timestamp_ms, sequence, input_mint, output_mint,
            in_amount, out_amount, price_impact_bps, context_slot, algorithm,
            is_improvement, is_cached, is_stale, route_plan_json
        )
    catch
        return nothing
    end
end

"""
    decode_price_entries(data::Vector{UInt8}) -> Vector{PriceEntry}

Decode price entries from PriceBatch/PriceSnapshot payload.
Wire format: [count:u16 LE][entry₁:56B]...[entryₙ:56B]

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Vector of decoded `PriceEntry` objects
"""
function decode_price_entries(data::Vector{UInt8})::Vector{PriceEntry}
    length(data) < 2 && return PriceEntry[]

    count = Int(read_u16_le(data, 1))
    offset = 3  # After u16 (1-based)

    entries = PriceEntry[]
    for _ in 1:count
        offset + 55 > length(data) && break
        mint = base58_encode(data[offset:offset+31])
        usd_price = Float64(read_u64_le(data, offset + 32)) / 1e12
        slot = read_u64_le(data, offset + 40)
        timestamp_ms = read_u64_le(data, offset + 48)
        push!(entries, PriceEntry(mint, usd_price, slot, timestamp_ms))
        offset += 56
    end

    return entries
end

"""
    decode_price_update(data::Vector{UInt8}) -> Union{PriceEntry, Nothing}

Decode a single price update (56 bytes, no count prefix).

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `PriceEntry` or `nothing` if too short
"""
function decode_price_update(data::Vector{UInt8})::Union{PriceEntry, Nothing}
    length(data) < 56 && return nothing

    mint = base58_encode(data[1:32])
    usd_price = Float64(read_u64_le(data, 33)) / 1e12
    slot = read_u64_le(data, 41)
    timestamp_ms = read_u64_le(data, 49)

    return PriceEntry(mint, usd_price, slot, timestamp_ms)
end
