//! Leader Schedule WebSocket module.
//!
//! Real-time Solana leader schedule, gossip network, and routing data.
//! Uses JSON mode over WebSocket — no binary decoding needed.

pub mod client;
pub mod types;

pub use client::{LeaderConfig, LeaderWebSocketClient};
pub use types::*;
