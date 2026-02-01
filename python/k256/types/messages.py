"""WebSocket message type constants."""

from enum import IntEnum


class MessageType(IntEnum):
    """WebSocket binary message type identifiers.
    
    These correspond to the first byte of each binary message.
    """
    
    POOL_UPDATE = 0x01
    """Server → Client: Single pool update"""
    
    SUBSCRIBE = 0x02
    """Client → Server: Subscribe request (JSON)"""
    
    SUBSCRIBED = 0x03
    """Server → Client: Subscription confirmed (JSON)"""
    
    UNSUBSCRIBE = 0x04
    """Client → Server: Unsubscribe all"""
    
    PRIORITY_FEES = 0x05
    """Server → Client: Priority fee update"""
    
    BLOCKHASH = 0x06
    """Server → Client: Recent blockhash"""
    
    QUOTE = 0x07
    """Server → Client: Streaming quote update"""
    
    QUOTE_SUBSCRIBED = 0x08
    """Server → Client: Quote subscription confirmed"""
    
    SUBSCRIBE_QUOTE = 0x09
    """Client → Server: Subscribe to quote stream"""
    
    UNSUBSCRIBE_QUOTE = 0x0A
    """Client → Server: Unsubscribe from quote"""
    
    PING = 0x0B
    """Client → Server: Ping (keepalive)"""
    
    PONG = 0x0C
    """Server → Client: Pong response"""
    
    HEARTBEAT = 0x0D
    """Server → Client: Connection stats (JSON)"""
    
    POOL_UPDATE_BATCH = 0x0E
    """Server → Client: Batched pool updates"""
    
    ERROR = 0xFF
    """Server → Client: Error message (UTF-8)"""
