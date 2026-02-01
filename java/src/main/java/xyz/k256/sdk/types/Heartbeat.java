package xyz.k256.sdk.types;

/**
 * Connection heartbeat with stats.
 */
public record Heartbeat(
    /** Unix timestamp in milliseconds */
    long timestampMs,
    /** Connection uptime in seconds */
    long uptimeSeconds,
    /** Total messages received */
    long messagesReceived,
    /** Total messages sent */
    long messagesSent,
    /** Number of active subscriptions */
    int subscriptions
) {}
