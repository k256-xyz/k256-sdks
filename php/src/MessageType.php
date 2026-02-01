<?php

declare(strict_types=1);

namespace K256;

/**
 * WebSocket binary message type identifiers.
 * These correspond to the first byte of each binary message.
 */
final class MessageType
{
    /** Server → Client: Single pool update (bincode) */
    public const POOL_UPDATE = 0x01;
    /** Client → Server: Subscribe request (JSON) */
    public const SUBSCRIBE = 0x02;
    /** Server → Client: Subscription confirmed (JSON) */
    public const SUBSCRIBED = 0x03;
    /** Client → Server: Unsubscribe all */
    public const UNSUBSCRIBE = 0x04;
    /** Server → Client: Priority fee update (bincode) */
    public const PRIORITY_FEES = 0x05;
    /** Server → Client: Recent blockhash (bincode) */
    public const BLOCKHASH = 0x06;
    /** Server → Client: Streaming quote update (bincode) */
    public const QUOTE = 0x07;
    /** Server → Client: Quote subscription confirmed (JSON) */
    public const QUOTE_SUBSCRIBED = 0x08;
    /** Client → Server: Subscribe to quote stream (JSON) */
    public const SUBSCRIBE_QUOTE = 0x09;
    /** Client → Server: Unsubscribe from quote (JSON) */
    public const UNSUBSCRIBE_QUOTE = 0x0A;
    /** Client → Server: Ping keepalive */
    public const PING = 0x0B;
    /** Server → Client: Pong response (bincode u64 timestamp) */
    public const PONG = 0x0C;
    /** Server → Client: Connection heartbeat with stats (JSON) */
    public const HEARTBEAT = 0x0D;
    /** Server → Client: Batched pool updates for high throughput */
    public const POOL_UPDATE_BATCH = 0x0E;
    /** Server → Client: Error message (UTF-8 string) */
    public const ERROR = 0xFF;

    private function __construct()
    {
        // Prevent instantiation
    }
}
