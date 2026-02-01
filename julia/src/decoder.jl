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

"""
    decode_priority_fees(data::Vector{UInt8}) -> Union{PriorityFees, Nothing}

Decode priority fees from binary payload.
Wire format: 119 bytes, little-endian.

# Arguments
- `data`: Binary payload (without message type byte)

# Returns
- Decoded `PriorityFees` or `nothing` if too short
"""
function decode_priority_fees(data::Vector{UInt8})::Union{PriorityFees, Nothing}
    length(data) < 119 && return nothing
    
    # Julia uses 1-based indexing
    PriorityFees(
        read_u64_le(data, 1),   # slot (offset 0)
        read_u64_le(data, 9),   # timestamp_ms (offset 8)
        read_u64_le(data, 17),  # recommended (offset 16)
        data[25],               # state (offset 24)
        data[26] != 0,          # is_stale (offset 25)
        read_u64_le(data, 27),  # swap_p50 (offset 26)
        read_u64_le(data, 35),  # swap_p75 (offset 34)
        read_u64_le(data, 43),  # swap_p90 (offset 42)
        read_u64_le(data, 51),  # swap_p99 (offset 50)
        read_u32_le(data, 59),  # swap_samples (offset 58)
        read_u64_le(data, 63),  # landing_p50_fee (offset 62)
        read_u64_le(data, 71),  # landing_p75_fee (offset 70)
        read_u64_le(data, 79),  # landing_p90_fee (offset 78)
        read_u64_le(data, 87),  # landing_p99_fee (offset 86)
        read_u64_le(data, 95),  # top_10_fee (offset 94)
        read_u64_le(data, 103), # top_25_fee (offset 102)
        data[111] != 0,         # spike_detected (offset 110)
        read_u64_le(data, 112)  # spike_fee (offset 111)
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
