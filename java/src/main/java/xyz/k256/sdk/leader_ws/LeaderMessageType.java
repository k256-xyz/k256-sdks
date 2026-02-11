package xyz.k256.sdk.leader_ws;

/**
 * Leader Schedule WebSocket message type constants.
 * 
 * All messages are JSON text frames with: type, kind, key (optional), data.
 */
public final class LeaderMessageType {
    public static final String SUBSCRIBED = "subscribed";
    public static final String LEADER_SCHEDULE = "leader_schedule";
    public static final String GOSSIP_SNAPSHOT = "gossip_snapshot";
    public static final String GOSSIP_DIFF = "gossip_diff";
    public static final String SLOT_UPDATE = "slot_update";
    public static final String ROUTING_HEALTH = "routing_health";
    public static final String SKIP_EVENT = "skip_event";
    public static final String IP_CHANGE = "ip_change";
    public static final String HEARTBEAT = "heartbeat";
    public static final String ERROR = "error";

    /** All available subscription channels. */
    public static final String[] ALL_CHANNELS = {
        "leader_schedule", "gossip", "slots", "alerts"
    };

    private LeaderMessageType() {}
}
