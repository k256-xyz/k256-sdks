//! WebSocket message type constants.

/// WebSocket binary message type identifiers.
///
/// These correspond to the first byte of each binary message.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum MessageType {
    /// Server → Client: Single pool update
    PoolUpdate = 0x01,
    /// Client → Server: Subscribe request (JSON)
    Subscribe = 0x02,
    /// Server → Client: Subscription confirmed (JSON)
    Subscribed = 0x03,
    /// Client → Server: Unsubscribe all
    Unsubscribe = 0x04,
    /// Server → Client: Priority fee update
    PriorityFees = 0x05,
    /// Server → Client: Recent blockhash
    Blockhash = 0x06,
    /// Server → Client: Streaming quote update
    Quote = 0x07,
    /// Server → Client: Quote subscription confirmed
    QuoteSubscribed = 0x08,
    /// Client → Server: Subscribe to quote stream
    SubscribeQuote = 0x09,
    /// Client → Server: Unsubscribe from quote
    UnsubscribeQuote = 0x0A,
    /// Client → Server: Ping (keepalive)
    Ping = 0x0B,
    /// Server → Client: Pong response
    Pong = 0x0C,
    /// Server → Client: Connection stats (JSON)
    Heartbeat = 0x0D,
    /// Server → Client: Batched pool updates
    PoolUpdateBatch = 0x0E,
    /// Server → Client: Error message (UTF-8)
    Error = 0xFF,
}

impl TryFrom<u8> for MessageType {
    type Error = u8;

    fn try_from(value: u8) -> Result<Self, <Self as TryFrom<u8>>::Error> {
        match value {
            0x01 => Ok(Self::PoolUpdate),
            0x02 => Ok(Self::Subscribe),
            0x03 => Ok(Self::Subscribed),
            0x04 => Ok(Self::Unsubscribe),
            0x05 => Ok(Self::PriorityFees),
            0x06 => Ok(Self::Blockhash),
            0x07 => Ok(Self::Quote),
            0x08 => Ok(Self::QuoteSubscribed),
            0x09 => Ok(Self::SubscribeQuote),
            0x0A => Ok(Self::UnsubscribeQuote),
            0x0B => Ok(Self::Ping),
            0x0C => Ok(Self::Pong),
            0x0D => Ok(Self::Heartbeat),
            0x0E => Ok(Self::PoolUpdateBatch),
            0xFF => Ok(Self::Error),
            other => Err(other),
        }
    }
}
