package xyz.k256.sdk.types;

/**
 * WebSocket binary message type identifiers.
 * These correspond to the first byte of each binary message.
 * All SDKs across all languages MUST use these exact values.
 */
public final class MessageType {
    /** Server → Client: Single pool update (bincode) */
    public static final int POOL_UPDATE = 0x01;
    /** Client → Server: Subscribe request (JSON) */
    public static final int SUBSCRIBE = 0x02;
    /** Server → Client: Subscription confirmed (JSON) */
    public static final int SUBSCRIBED = 0x03;
    /** Client → Server: Unsubscribe all */
    public static final int UNSUBSCRIBE = 0x04;
    /** Server → Client: Priority fee update (bincode) */
    public static final int PRIORITY_FEES = 0x05;
    /** Server → Client: Recent blockhash (bincode) */
    public static final int BLOCKHASH = 0x06;
    /** Server → Client: Streaming quote update (bincode) */
    public static final int QUOTE = 0x07;
    /** Server → Client: Quote subscription confirmed (JSON) */
    public static final int QUOTE_SUBSCRIBED = 0x08;
    /** Client → Server: Subscribe to quote stream (JSON) */
    public static final int SUBSCRIBE_QUOTE = 0x09;
    /** Client → Server: Unsubscribe from quote (JSON) */
    public static final int UNSUBSCRIBE_QUOTE = 0x0A;
    /** Client → Server: Ping keepalive */
    public static final int PING = 0x0B;
    /** Server → Client: Pong response (bincode u64 timestamp) */
    public static final int PONG = 0x0C;
    /** Server → Client: Connection heartbeat with stats (JSON) */
    public static final int HEARTBEAT = 0x0D;
    /** Server → Client: Batched pool updates for high throughput */
    public static final int POOL_UPDATE_BATCH = 0x0E;
    /** Server → Client: Error message (UTF-8 string) */
    public static final int ERROR = 0xFF;

    private MessageType() {
        // Prevent instantiation
    }
}
