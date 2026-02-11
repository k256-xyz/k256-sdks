#pragma once

/**
 * Leader Schedule WebSocket message types (header-only).
 *
 * All messages are JSON text frames with: type, kind, key (optional), data.
 * Parse with your preferred JSON library (nlohmann/json, rapidjson, etc.).
 */

#include <string>
#include <vector>
#include <optional>
#include <cstdint>

namespace k256 {
namespace leader {

/** Subscription channel constants */
constexpr const char* CHANNEL_LEADER_SCHEDULE = "leader_schedule";
constexpr const char* CHANNEL_GOSSIP = "gossip";
constexpr const char* CHANNEL_SLOTS = "slots";
constexpr const char* CHANNEL_ALERTS = "alerts";

/** Message kind — how to consume the message */
enum class MessageKind { Snapshot, Diff, Event };

/** A single gossip peer */
struct GossipPeer {
    std::string identity;
    std::optional<std::string> tpu_quic;
    std::optional<std::string> tpu_udp;
    std::optional<std::string> tpu_forwards_quic;
    std::optional<std::string> tpu_forwards_udp;
    std::optional<std::string> tpu_vote;
    std::optional<std::string> gossip_addr;
    std::string version;
    uint16_t shred_version = 0;
    uint64_t stake = 0;
    uint8_t commission = 0;
    bool is_delinquent = false;
    uint64_t wallclock = 0;
};

/** Slot update data */
struct SlotUpdate {
    uint64_t slot = 0;
    std::string leader;
    uint64_t block_height = 0;
};

/** Routing health data */
struct RoutingHealth {
    uint32_t leaders_total = 0;
    uint32_t leaders_in_gossip = 0;
    std::vector<std::string> leaders_missing_gossip;
    std::vector<std::string> leaders_without_tpu_quic;
    std::vector<std::string> leaders_delinquent;
    std::string coverage;
};

/** Gossip diff data */
struct GossipDiff {
    uint64_t timestamp_ms = 0;
    std::vector<GossipPeer> added;
    std::vector<std::string> removed;
    std::vector<GossipPeer> updated;
};

/** Skip event data */
struct SkipEvent {
    uint64_t slot = 0;
    std::string leader;
    uint32_t assigned = 0;
    uint32_t produced = 0;
};

/** IP change event data */
struct IpChange {
    std::string identity;
    std::string old_ip;
    std::string new_ip;
    uint64_t timestamp_ms = 0;
};

/** Heartbeat data */
struct Heartbeat {
    uint64_t timestamp_ms = 0;
    uint64_t current_slot = 0;
    uint32_t connected_clients = 0;
    uint32_t gossip_peers = 0;
};

/** Leader schedule validator entry */
struct LeaderScheduleValidator {
    std::string identity;
    int slots = 0;
    std::vector<uint32_t> slot_indices;
};

/** Leader schedule data */
struct LeaderSchedule {
    uint64_t epoch = 0;
    uint64_t slots_in_epoch = 0;
    int validators = 0;
    std::vector<LeaderScheduleValidator> schedule;
};

} // namespace leader
} // namespace k256
