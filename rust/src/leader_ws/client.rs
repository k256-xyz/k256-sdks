//! Leader Schedule WebSocket client.
//!
//! Connects to the K256 leader-schedule service via the Gateway using JSON mode.
//!
//! # Example
//! ```rust,no_run
//! use k256_sdk::leader_ws::{LeaderWebSocketClient, LeaderConfig, LeaderMessage};
//!
//! let config = LeaderConfig {
//!     api_key: "your-api-key".to_string(),
//!     ..LeaderConfig::default()
//! };
//!
//! let client = LeaderWebSocketClient::new(config, |msg: LeaderMessage| {
//!     println!("[{}] {:?}", msg.msg_type, msg.data);
//! });
//! // client.connect() in an async runtime
//! ```

use super::types::{LeaderMessage, ALL_CHANNELS};
use serde_json::json;

/// Configuration for the leader-schedule WebSocket client.
pub struct LeaderConfig {
    /// K256 API key
    pub api_key: String,
    /// WebSocket endpoint URL
    pub url: String,
    /// Channels to subscribe to
    pub channels: Vec<String>,
    /// Enable automatic reconnection
    pub auto_reconnect: bool,
    /// Initial reconnect delay in seconds
    pub reconnect_delay_secs: f64,
    /// Maximum reconnect delay in seconds
    pub max_reconnect_delay_secs: f64,
}

impl Default for LeaderConfig {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            url: "wss://gateway.k256.xyz/v1/leader-ws".to_string(),
            channels: ALL_CHANNELS.iter().map(|s| s.to_string()).collect(),
            auto_reconnect: true,
            reconnect_delay_secs: 1.0,
            max_reconnect_delay_secs: 60.0,
        }
    }
}

/// Leader Schedule WebSocket client (JSON mode).
///
/// Uses tungstenite for WebSocket connections. Parses JSON text frames
/// and dispatches to the provided handler callback.
pub struct LeaderWebSocketClient<F: Fn(LeaderMessage) + Send + 'static> {
    config: LeaderConfig,
    handler: F,
}

impl<F: Fn(LeaderMessage) + Send + 'static> LeaderWebSocketClient<F> {
    /// Create a new client with the given config and message handler.
    pub fn new(config: LeaderConfig, handler: F) -> Self {
        Self { config, handler }
    }

    /// Build the subscribe message for JSON mode.
    pub fn subscribe_message(&self) -> String {
        json!({
            "type": "subscribe",
            "channels": self.config.channels,
            "format": "json",
        })
        .to_string()
    }

    /// Get the full WebSocket URL with API key.
    pub fn ws_url(&self) -> String {
        format!(
            "{}?apiKey={}",
            self.config.url,
            urlencoding::encode(&self.config.api_key)
        )
    }

    /// Connect and start reading messages (blocking).
    ///
    /// Uses tungstenite for the WebSocket connection.
    /// Call this from an async runtime or dedicated thread.
    #[cfg(feature = "tungstenite")]
    pub fn connect_blocking(&self) -> Result<(), Box<dyn std::error::Error>> {
        use tungstenite::{connect, Message};

        let (mut socket, _) = connect(&self.ws_url())?;

        // Subscribe with JSON mode
        socket.send(Message::Text(self.subscribe_message()))?;

        loop {
            let msg = socket.read()?;
            if let Message::Text(text) = msg {
                if let Ok(leader_msg) = serde_json::from_str::<LeaderMessage>(&text) {
                    (self.handler)(leader_msg);
                }
            }
        }
    }
}
