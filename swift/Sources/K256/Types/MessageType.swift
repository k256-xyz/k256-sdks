import Foundation

/// WebSocket binary message type identifiers.
/// These correspond to the first byte of each binary message.
public enum K256MessageType: UInt8, Sendable {
    /// Server → Client: Single pool update (bincode)
    case poolUpdate = 0x01
    /// Client → Server: Subscribe request (JSON)
    case subscribe = 0x02
    /// Server → Client: Subscription confirmed (JSON)
    case subscribed = 0x03
    /// Client → Server: Unsubscribe all
    case unsubscribe = 0x04
    /// Server → Client: Priority fee update (bincode)
    case priorityFees = 0x05
    /// Server → Client: Recent blockhash (bincode)
    case blockhash = 0x06
    /// Server → Client: Streaming quote update (bincode)
    case quote = 0x07
    /// Server → Client: Quote subscription confirmed (JSON)
    case quoteSubscribed = 0x08
    /// Client → Server: Subscribe to quote stream (JSON)
    case subscribeQuote = 0x09
    /// Client → Server: Unsubscribe from quote (JSON)
    case unsubscribeQuote = 0x0A
    /// Client → Server: Ping keepalive
    case ping = 0x0B
    /// Server → Client: Pong response (bincode u64 timestamp)
    case pong = 0x0C
    /// Server → Client: Connection heartbeat with stats (JSON)
    case heartbeat = 0x0D
    /// Server → Client: Batched pool updates for high throughput
    case poolUpdateBatch = 0x0E
    /// Server → Client: Block-level statistics
    case blockStats = 0x0F
    /// Client → Server: Subscribe to price updates (JSON)
    case subscribePrice = 0x10
    /// Server → Client: Single price update (56B bincode)
    case priceUpdate = 0x11
    /// Server → Client: Batched price updates
    case priceBatch = 0x12
    /// Server → Client: Initial price snapshot
    case priceSnapshot = 0x13
    /// Client → Server: Unsubscribe from prices
    case unsubscribePrice = 0x14
    /// Server → Client: Error message (UTF-8 string)
    case error = 0xFF
}
