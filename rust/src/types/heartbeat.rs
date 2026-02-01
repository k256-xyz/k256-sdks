//! Heartbeat types.

use serde::{Deserialize, Serialize};

/// Connection heartbeat with stats.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Heartbeat {
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Connection uptime in seconds
    pub uptime_seconds: u64,
    /// Total messages received
    pub messages_received: u64,
    /// Total messages sent
    pub messages_sent: u64,
    /// Number of active subscriptions
    pub subscriptions: u32,
}
