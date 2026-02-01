//! WebSocket client and binary decoder.

mod client;
mod decoder;

pub use client::{Config, K256WebSocketClient, SubscribeRequest};
pub use decoder::decode_message;
