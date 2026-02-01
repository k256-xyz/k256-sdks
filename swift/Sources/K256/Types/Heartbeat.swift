import Foundation

/// Connection heartbeat with stats.
public struct K256Heartbeat: Sendable, Equatable, Codable {
    /// Unix timestamp in milliseconds
    public let timestampMs: UInt64
    /// Connection uptime in seconds
    public let uptimeSeconds: UInt64
    /// Total messages received
    public let messagesReceived: UInt64
    /// Total messages sent
    public let messagesSent: UInt64
    /// Number of active subscriptions
    public let subscriptions: UInt32

    public init(
        timestampMs: UInt64,
        uptimeSeconds: UInt64,
        messagesReceived: UInt64,
        messagesSent: UInt64,
        subscriptions: UInt32
    ) {
        self.timestampMs = timestampMs
        self.uptimeSeconds = uptimeSeconds
        self.messagesReceived = messagesReceived
        self.messagesSent = messagesSent
        self.subscriptions = subscriptions
    }

    enum CodingKeys: String, CodingKey {
        case timestampMs = "timestamp_ms"
        case uptimeSeconds = "uptime_seconds"
        case messagesReceived = "messages_received"
        case messagesSent = "messages_sent"
        case subscriptions
    }
}
