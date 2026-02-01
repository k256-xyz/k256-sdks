/**
 * @file types.hpp
 * @brief Type definitions for K256 SDK
 */

#ifndef K256_TYPES_HPP
#define K256_TYPES_HPP

#include <cstdint>
#include <string>
#include <vector>
#include <optional>
#include <array>

namespace k256 {

/**
 * @brief WebSocket binary message type identifiers
 *
 * These correspond to the first byte of each binary message.
 * All SDKs across all languages MUST use these exact values.
 */
enum class MessageType : uint8_t {
    /// Server → Client: Single pool update (bincode)
    PoolUpdate = 0x01,
    /// Client → Server: Subscribe request (JSON)
    Subscribe = 0x02,
    /// Server → Client: Subscription confirmed (JSON)
    Subscribed = 0x03,
    /// Client → Server: Unsubscribe all
    Unsubscribe = 0x04,
    /// Server → Client: Priority fee update (bincode)
    PriorityFees = 0x05,
    /// Server → Client: Recent blockhash (bincode)
    Blockhash = 0x06,
    /// Server → Client: Streaming quote update (bincode)
    Quote = 0x07,
    /// Server → Client: Quote subscription confirmed (JSON)
    QuoteSubscribed = 0x08,
    /// Client → Server: Subscribe to quote stream (JSON)
    SubscribeQuote = 0x09,
    /// Client → Server: Unsubscribe from quote (JSON)
    UnsubscribeQuote = 0x0A,
    /// Client → Server: Ping keepalive
    Ping = 0x0B,
    /// Server → Client: Pong response (bincode u64 timestamp)
    Pong = 0x0C,
    /// Server → Client: Connection heartbeat with stats (JSON)
    Heartbeat = 0x0D,
    /// Server → Client: Batched pool updates for high throughput
    PoolUpdateBatch = 0x0E,
    /// Server → Client: Error message (UTF-8 string)
    Error = 0xFF
};

/**
 * @brief Network congestion state
 */
enum class NetworkState : uint8_t {
    Low = 0,      ///< Low congestion - minimal fees needed
    Normal = 1,   ///< Normal congestion
    High = 2,     ///< High congestion - higher fees recommended
    Extreme = 3   ///< Extreme congestion - maximum fees recommended
};

/**
 * @brief Order book level with price and size
 */
struct OrderLevel {
    uint64_t price;  ///< Price in base units
    uint64_t size;   ///< Size in base units
};

/**
 * @brief Real-time pool state update from K256 WebSocket
 */
struct PoolUpdate {
    uint64_t sequence;                    ///< Global sequence number for ordering
    uint64_t slot;                        ///< Solana slot number
    uint64_t write_version;               ///< Write version within slot
    std::string protocol_name;            ///< DEX protocol name
    std::string pool_address;             ///< Base58-encoded pool address
    std::vector<std::string> token_mints; ///< Token mint addresses
    std::vector<uint64_t> token_balances; ///< Token balances
    std::vector<int32_t> token_decimals;  ///< Token decimals
    std::optional<OrderLevel> best_bid;   ///< Best bid, if available
    std::optional<OrderLevel> best_ask;   ///< Best ask, if available
    std::vector<uint8_t> serialized_state;///< Opaque pool state bytes
};

/**
 * @brief Priority fee recommendations from K256
 *
 * Wire format: 119 bytes, little-endian
 */
struct PriorityFees {
    uint64_t slot;             ///< Current Solana slot (offset 0)
    uint64_t timestamp_ms;     ///< Unix timestamp in milliseconds (offset 8)
    uint64_t recommended;      ///< Recommended fee in microlamports (offset 16)
    NetworkState state;        ///< Network congestion state (offset 24)
    bool is_stale;             ///< Whether data may be stale (offset 25)
    uint64_t swap_p50;         ///< 50th percentile swap fee (offset 26)
    uint64_t swap_p75;         ///< 75th percentile swap fee (offset 34)
    uint64_t swap_p90;         ///< 90th percentile swap fee (offset 42)
    uint64_t swap_p99;         ///< 99th percentile swap fee (offset 50)
    uint32_t swap_samples;     ///< Number of samples used (offset 58)
    uint64_t landing_p50_fee;  ///< Fee to land with 50% probability (offset 62)
    uint64_t landing_p75_fee;  ///< Fee to land with 75% probability (offset 70)
    uint64_t landing_p90_fee;  ///< Fee to land with 90% probability (offset 78)
    uint64_t landing_p99_fee;  ///< Fee to land with 99% probability (offset 86)
    uint64_t top_10_fee;       ///< Fee at top 10% tier (offset 94)
    uint64_t top_25_fee;       ///< Fee at top 25% tier (offset 102)
    bool spike_detected;       ///< True if fee spike detected (offset 110)
    uint64_t spike_fee;        ///< Fee during spike condition (offset 111)
};

/**
 * @brief Recent blockhash from K256
 *
 * Wire format: 65 bytes, little-endian
 */
struct Blockhash {
    uint64_t slot;                    ///< Solana slot (offset 0)
    uint64_t timestamp_ms;            ///< Unix timestamp in milliseconds (offset 8)
    std::string blockhash;            ///< Base58-encoded blockhash (offset 16, 32 bytes)
    uint64_t block_height;            ///< Block height (offset 48)
    uint64_t last_valid_block_height; ///< Last valid block height (offset 56)
    bool is_stale;                    ///< Whether data may be stale (offset 64)
};

/**
 * @brief Swap quote from K256
 */
struct Quote {
    std::string topic_id;       ///< Topic ID for subscription
    uint64_t timestamp_ms;      ///< Unix timestamp in milliseconds
    uint64_t sequence;          ///< Sequence number
    std::string input_mint;     ///< Input token mint address
    std::string output_mint;    ///< Output token mint address
    uint64_t in_amount;         ///< Input amount in base units
    uint64_t out_amount;        ///< Output amount in base units
    int32_t price_impact_bps;   ///< Price impact in basis points
    uint64_t context_slot;      ///< Solana slot of the quote
    std::string algorithm;      ///< Algorithm used for routing
    bool is_improvement;        ///< Whether this improves previous quote
    bool is_cached;             ///< Whether from cache
    bool is_stale;              ///< Whether may be stale
    std::string route_plan_json;///< JSON route plan
};

/**
 * @brief Connection heartbeat with stats
 */
struct Heartbeat {
    uint64_t timestamp_ms;      ///< Unix timestamp in milliseconds
    uint64_t uptime_seconds;    ///< Connection uptime in seconds
    uint64_t messages_received; ///< Total messages received
    uint64_t messages_sent;     ///< Total messages sent
    uint32_t subscriptions;     ///< Number of active subscriptions
};

/**
 * @brief Token metadata
 */
struct Token {
    std::string address;                      ///< Token mint address
    std::string symbol;                       ///< Token symbol
    std::string name;                         ///< Token name
    uint8_t decimals;                         ///< Token decimals
    std::optional<std::string> logo_uri;      ///< URL to token logo
    std::optional<std::vector<std::string>> tags; ///< Tags
};

} // namespace k256

#endif // K256_TYPES_HPP
