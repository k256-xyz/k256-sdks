/**
 * @file decoder.hpp
 * @brief Binary message decoder for K256 WebSocket protocol
 */

#ifndef K256_DECODER_HPP
#define K256_DECODER_HPP

#include "types.hpp"
#include "base58.hpp"
#include <cstring>
#include <optional>

namespace k256 {

/**
 * @brief Read a little-endian uint64 from buffer
 */
inline uint64_t read_u64_le(const uint8_t* data) {
    return static_cast<uint64_t>(data[0]) |
           (static_cast<uint64_t>(data[1]) << 8) |
           (static_cast<uint64_t>(data[2]) << 16) |
           (static_cast<uint64_t>(data[3]) << 24) |
           (static_cast<uint64_t>(data[4]) << 32) |
           (static_cast<uint64_t>(data[5]) << 40) |
           (static_cast<uint64_t>(data[6]) << 48) |
           (static_cast<uint64_t>(data[7]) << 56);
}

/**
 * @brief Read a little-endian uint32 from buffer
 */
inline uint32_t read_u32_le(const uint8_t* data) {
    return static_cast<uint32_t>(data[0]) |
           (static_cast<uint32_t>(data[1]) << 8) |
           (static_cast<uint32_t>(data[2]) << 16) |
           (static_cast<uint32_t>(data[3]) << 24);
}

/**
 * @brief Read a little-endian uint16 from buffer
 */
inline uint16_t read_u16_le(const uint8_t* data) {
    return static_cast<uint16_t>(data[0]) |
           (static_cast<uint16_t>(data[1]) << 8);
}

/**
 * @brief Read a little-endian int32 from buffer
 */
inline int32_t read_i32_le(const uint8_t* data) {
    return static_cast<int32_t>(read_u32_le(data));
}

/**
 * @brief Decode priority fees from binary payload
 *
 * Wire format: 119 bytes, little-endian
 *
 * @param data Pointer to payload (without message type byte)
 * @param len Length of payload
 * @return Decoded PriorityFees or std::nullopt if payload too short
 */
inline std::optional<PriorityFees> decode_priority_fees(const uint8_t* data, size_t len) {
    if (len < 119) return std::nullopt;

    PriorityFees fees;
    fees.slot = read_u64_le(data + 0);
    fees.timestamp_ms = read_u64_le(data + 8);
    fees.recommended = read_u64_le(data + 16);
    fees.state = static_cast<NetworkState>(data[24]);
    fees.is_stale = data[25] != 0;
    fees.swap_p50 = read_u64_le(data + 26);
    fees.swap_p75 = read_u64_le(data + 34);
    fees.swap_p90 = read_u64_le(data + 42);
    fees.swap_p99 = read_u64_le(data + 50);
    fees.swap_samples = read_u32_le(data + 58);
    fees.landing_p50_fee = read_u64_le(data + 62);
    fees.landing_p75_fee = read_u64_le(data + 70);
    fees.landing_p90_fee = read_u64_le(data + 78);
    fees.landing_p99_fee = read_u64_le(data + 86);
    fees.top_10_fee = read_u64_le(data + 94);
    fees.top_25_fee = read_u64_le(data + 102);
    fees.spike_detected = data[110] != 0;
    fees.spike_fee = read_u64_le(data + 111);

    return fees;
}

/**
 * @brief Decode blockhash from binary payload
 *
 * Wire format: 65 bytes, little-endian
 *
 * @param data Pointer to payload (without message type byte)
 * @param len Length of payload
 * @return Decoded Blockhash or std::nullopt if payload too short
 */
inline std::optional<Blockhash> decode_blockhash(const uint8_t* data, size_t len) {
    if (len < 65) return std::nullopt;

    Blockhash bh;
    bh.slot = read_u64_le(data + 0);
    bh.timestamp_ms = read_u64_le(data + 8);
    bh.blockhash = base58_encode(data + 16, 32);
    bh.block_height = read_u64_le(data + 48);
    bh.last_valid_block_height = read_u64_le(data + 56);
    bh.is_stale = data[64] != 0;

    return bh;
}

/**
 * @brief Decode a single pool update from binary payload
 *
 * Uses bincode format with variable-length fields.
 *
 * @param data Pointer to payload (without message type byte)
 * @param len Length of payload
 * @return Decoded PoolUpdate or std::nullopt if decoding fails
 */
inline std::optional<PoolUpdate> decode_pool_update(const uint8_t* data, size_t len) {
    if (len < 50) return std::nullopt;

    try {
        size_t offset = 0;
        PoolUpdate update;

        // serialized_state: Bytes (u64 len + bytes)
        uint64_t state_len = read_u64_le(data + offset);
        offset += 8;
        if (offset + state_len > len) return std::nullopt;
        update.serialized_state.assign(data + offset, data + offset + state_len);
        offset += state_len;

        // sequence (u64)
        if (offset + 8 > len) return std::nullopt;
        update.sequence = read_u64_le(data + offset);
        offset += 8;

        // slot (u64)
        if (offset + 8 > len) return std::nullopt;
        update.slot = read_u64_le(data + offset);
        offset += 8;

        // write_version (u64)
        if (offset + 8 > len) return std::nullopt;
        update.write_version = read_u64_le(data + offset);
        offset += 8;

        // protocol_name: String (u64 len + UTF-8 bytes)
        if (offset + 8 > len) return std::nullopt;
        uint64_t protocol_len = read_u64_le(data + offset);
        offset += 8;
        if (offset + protocol_len > len) return std::nullopt;
        update.protocol_name.assign(reinterpret_cast<const char*>(data + offset), protocol_len);
        offset += protocol_len;

        // pool_address: [u8; 32]
        if (offset + 32 > len) return std::nullopt;
        update.pool_address = base58_encode(data + offset, 32);
        offset += 32;

        // all_token_mints: Vec<[u8; 32]>
        if (offset + 8 > len) return std::nullopt;
        uint64_t mint_count = read_u64_le(data + offset);
        offset += 8;
        update.token_mints.reserve(mint_count);
        for (uint64_t i = 0; i < mint_count && offset + 32 <= len; ++i) {
            update.token_mints.push_back(base58_encode(data + offset, 32));
            offset += 32;
        }

        // all_token_balances: Vec<u64>
        if (offset + 8 > len) return std::nullopt;
        uint64_t balance_count = read_u64_le(data + offset);
        offset += 8;
        update.token_balances.reserve(balance_count);
        for (uint64_t i = 0; i < balance_count && offset + 8 <= len; ++i) {
            update.token_balances.push_back(read_u64_le(data + offset));
            offset += 8;
        }

        // all_token_decimals: Vec<i32>
        if (offset + 8 > len) return std::nullopt;
        uint64_t decimals_count = read_u64_le(data + offset);
        offset += 8;
        update.token_decimals.reserve(decimals_count);
        for (uint64_t i = 0; i < decimals_count && offset + 4 <= len; ++i) {
            update.token_decimals.push_back(read_i32_le(data + offset));
            offset += 4;
        }

        // best_bid: Option<OrderLevel>
        if (offset < len && data[offset] == 1) {
            offset++;
            if (offset + 16 <= len) {
                OrderLevel bid;
                bid.price = read_u64_le(data + offset);
                offset += 8;
                bid.size = read_u64_le(data + offset);
                offset += 8;
                update.best_bid = bid;
            }
        } else if (offset < len) {
            offset++;
        }

        // best_ask: Option<OrderLevel>
        if (offset < len && data[offset] == 1) {
            offset++;
            if (offset + 16 <= len) {
                OrderLevel ask;
                ask.price = read_u64_le(data + offset);
                offset += 8;
                ask.size = read_u64_le(data + offset);
                update.best_ask = ask;
            }
        }

        return update;
    } catch (...) {
        return std::nullopt;
    }
}

/**
 * @brief Decode a batch of pool updates
 *
 * Wire format: [u16 count][u32 len1][payload1][u32 len2][payload2]...
 *
 * @param data Pointer to payload (without message type byte)
 * @param len Length of payload
 * @return Vector of decoded PoolUpdate objects
 */
inline std::vector<PoolUpdate> decode_pool_update_batch(const uint8_t* data, size_t len) {
    std::vector<PoolUpdate> updates;
    if (len < 2) return updates;

    uint16_t count = read_u16_le(data);
    size_t offset = 2;

    updates.reserve(count);
    for (uint16_t i = 0; i < count && offset + 4 <= len; ++i) {
        uint32_t payload_len = read_u32_le(data + offset);
        offset += 4;

        if (offset + payload_len > len) break;

        auto update = decode_pool_update(data + offset, payload_len);
        if (update) {
            updates.push_back(std::move(*update));
        }
        offset += payload_len;
    }

    return updates;
}

/**
 * @brief Decode a quote from binary payload
 *
 * @param data Pointer to payload (without message type byte)
 * @param len Length of payload
 * @return Decoded Quote or std::nullopt if decoding fails
 */
inline std::optional<Quote> decode_quote(const uint8_t* data, size_t len) {
    if (len < 8) return std::nullopt;

    try {
        size_t offset = 0;
        Quote quote;

        // topic_id: String (u64 len + UTF-8 bytes)
        uint64_t topic_len = read_u64_le(data + offset);
        offset += 8;
        if (offset + topic_len > len) return std::nullopt;
        quote.topic_id.assign(reinterpret_cast<const char*>(data + offset), topic_len);
        offset += topic_len;

        // timestamp_ms (u64)
        if (offset + 8 > len) return std::nullopt;
        quote.timestamp_ms = read_u64_le(data + offset);
        offset += 8;

        // sequence (u64)
        if (offset + 8 > len) return std::nullopt;
        quote.sequence = read_u64_le(data + offset);
        offset += 8;

        // input_mint ([u8; 32])
        if (offset + 32 > len) return std::nullopt;
        quote.input_mint = base58_encode(data + offset, 32);
        offset += 32;

        // output_mint ([u8; 32])
        if (offset + 32 > len) return std::nullopt;
        quote.output_mint = base58_encode(data + offset, 32);
        offset += 32;

        // in_amount (u64)
        if (offset + 8 > len) return std::nullopt;
        quote.in_amount = read_u64_le(data + offset);
        offset += 8;

        // out_amount (u64)
        if (offset + 8 > len) return std::nullopt;
        quote.out_amount = read_u64_le(data + offset);
        offset += 8;

        // price_impact_bps (i32)
        if (offset + 4 > len) return std::nullopt;
        quote.price_impact_bps = read_i32_le(data + offset);
        offset += 4;

        // context_slot (u64)
        if (offset + 8 > len) return std::nullopt;
        quote.context_slot = read_u64_le(data + offset);
        offset += 8;

        // algorithm: String (u64 len + UTF-8 bytes)
        if (offset + 8 > len) return std::nullopt;
        uint64_t algo_len = read_u64_le(data + offset);
        offset += 8;
        if (offset + algo_len > len) return std::nullopt;
        quote.algorithm.assign(reinterpret_cast<const char*>(data + offset), algo_len);
        offset += algo_len;

        // is_improvement (bool)
        if (offset >= len) return std::nullopt;
        quote.is_improvement = data[offset++] != 0;

        // is_cached (bool)
        if (offset >= len) return std::nullopt;
        quote.is_cached = data[offset++] != 0;

        // is_stale (bool)
        if (offset >= len) return std::nullopt;
        quote.is_stale = data[offset++] != 0;

        // route_plan_json: Vec<u8> (u64 len + bytes)
        if (offset + 8 <= len) {
            uint64_t route_len = read_u64_le(data + offset);
            offset += 8;
            if (route_len > 0 && offset + route_len <= len) {
                quote.route_plan_json.assign(
                    reinterpret_cast<const char*>(data + offset), route_len);
            }
        }

        return quote;
    } catch (...) {
        return std::nullopt;
    }
}

} // namespace k256

#endif // K256_DECODER_HPP
