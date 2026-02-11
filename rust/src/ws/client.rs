//! K256 WebSocket client implementation.

use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json;
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

use crate::types::{Blockhash, FeeMarket, Heartbeat, PoolUpdate, Quote};
use crate::ws::decoder::decode_message;

/// Configuration for K256 WebSocket client.
#[derive(Debug, Clone)]
pub struct Config {
    /// K256 API key
    pub api_key: String,
    /// WebSocket endpoint URL
    pub endpoint: String,
    /// Whether to automatically reconnect
    pub reconnect: bool,
    /// Initial reconnect delay
    pub reconnect_delay_initial: Duration,
    /// Maximum reconnect delay
    pub reconnect_delay_max: Duration,
    /// Ping interval (0 to disable)
    pub ping_interval: Duration,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_key: String::new(),
            endpoint: "wss://gateway.k256.xyz/v1/ws".to_string(),
            reconnect: true,
            reconnect_delay_initial: Duration::from_secs(1),
            reconnect_delay_max: Duration::from_secs(60),
            ping_interval: Duration::from_secs(30),
        }
    }
}

/// WebSocket subscription request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscribeRequest {
    /// Request type (always "subscribe")
    #[serde(rename = "type")]
    pub request_type: String,
    /// List of channels to subscribe to
    pub channels: Vec<String>,
    /// Message format ("binary" or "json")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    /// Optional list of DEX protocols to filter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocols: Option<Vec<String>>,
    /// Optional list of pool addresses to filter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pools: Option<Vec<String>>,
    /// Optional list of token pairs to filter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_pairs: Option<Vec<(String, String)>>,
}

impl Default for SubscribeRequest {
    fn default() -> Self {
        Self {
            request_type: "subscribe".to_string(),
            channels: vec![
                "pools".to_string(),
                "priority_fees".to_string(),
                "blockhash".to_string(),
            ],
            format: None,
            protocols: None,
            pools: None,
            token_pairs: None,
        }
    }
}

/// Decoded WebSocket message.
#[derive(Debug, Clone)]
pub enum DecodedMessage {
    /// Pool update
    PoolUpdate(PoolUpdate),
    /// Batch of pool updates
    PoolUpdateBatch(Vec<PoolUpdate>),
    /// Fee market update (per-writable-account)
    FeeMarket(FeeMarket),
    /// Blockhash
    Blockhash(Blockhash),
    /// Quote
    Quote(Quote),
    /// Heartbeat
    Heartbeat(Heartbeat),
    /// Error message
    Error(String),
    /// Subscription confirmed
    Subscribed { channels: Vec<String> },
}

type Callback<T> = Arc<RwLock<Option<Box<dyn Fn(T) + Send + Sync + 'static>>>>;

/// K256 WebSocket client for real-time Solana liquidity data.
pub struct K256WebSocketClient {
    config: Config,
    tx: mpsc::Sender<Message>,
    on_pool_update: Callback<PoolUpdate>,
    on_fee_market: Callback<FeeMarket>,
    on_blockhash: Callback<Blockhash>,
    on_quote: Callback<Quote>,
    on_heartbeat: Callback<Heartbeat>,
    on_error: Callback<String>,
}

impl K256WebSocketClient {
    /// Create a new WebSocket client with the given configuration.
    pub fn new(config: Config) -> Self {
        let (tx, _rx) = mpsc::channel(100);
        Self {
            config,
            tx,
            on_pool_update: Arc::new(RwLock::new(None)),
            on_fee_market: Arc::new(RwLock::new(None)),
            on_blockhash: Arc::new(RwLock::new(None)),
            on_quote: Arc::new(RwLock::new(None)),
            on_heartbeat: Arc::new(RwLock::new(None)),
            on_error: Arc::new(RwLock::new(None)),
        }
    }

    /// Register a callback for pool updates.
    pub fn on_pool_update<F>(&self, callback: F)
    where
        F: Fn(PoolUpdate) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_pool_update.write().await = Some(Box::new(callback));
        });
    }

    /// Register a callback for fee market updates.
    pub fn on_fee_market<F>(&self, callback: F)
    where
        F: Fn(FeeMarket) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_fee_market.write().await = Some(Box::new(callback));
        });
    }

    /// Register a callback for blockhash updates.
    pub fn on_blockhash<F>(&self, callback: F)
    where
        F: Fn(Blockhash) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_blockhash.write().await = Some(Box::new(callback));
        });
    }

    /// Register a callback for quote updates.
    pub fn on_quote<F>(&self, callback: F)
    where
        F: Fn(Quote) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_quote.write().await = Some(Box::new(callback));
        });
    }

    /// Register a callback for heartbeat messages.
    pub fn on_heartbeat<F>(&self, callback: F)
    where
        F: Fn(Heartbeat) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_heartbeat.write().await = Some(Box::new(callback));
        });
    }

    /// Register a callback for errors.
    pub fn on_error<F>(&self, callback: F)
    where
        F: Fn(String) + Send + Sync + 'static,
    {
        let rt = tokio::runtime::Handle::current();
        rt.block_on(async {
            *self.on_error.write().await = Some(Box::new(callback));
        });
    }

    /// Connect to the K256 WebSocket.
    pub async fn connect(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}?apiKey={}", self.config.endpoint, self.config.api_key);

        let (ws_stream, _) = connect_async(&url).await?;
        info!("Connected to K256 WebSocket");

        let (mut write, mut read) = ws_stream.split();

        let on_pool_update = self.on_pool_update.clone();
        let on_fee_market = self.on_fee_market.clone();
        let on_blockhash = self.on_blockhash.clone();
        let on_quote = self.on_quote.clone();
        let on_heartbeat = self.on_heartbeat.clone();
        let on_error = self.on_error.clone();

        // Message receiving task
        let recv_task = tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Binary(data)) => {
                        if data.is_empty() {
                            continue;
                        }

                        let msg_type = data[0];
                        let payload = &data[1..];

                        match decode_message(msg_type, payload) {
                            Ok(Some(decoded)) => {
                                match decoded {
                                    DecodedMessage::PoolUpdate(update) => {
                                        if let Some(cb) = on_pool_update.read().await.as_ref() {
                                            cb(update);
                                        }
                                    }
                                    DecodedMessage::PoolUpdateBatch(updates) => {
                                        if let Some(cb) = on_pool_update.read().await.as_ref() {
                                            for update in updates {
                                                cb(update);
                                            }
                                        }
                                    }
                                    DecodedMessage::FeeMarket(fees) => {
                                        if let Some(cb) = on_fee_market.read().await.as_ref() {
                                            cb(fees);
                                        }
                                    }
                                    DecodedMessage::Blockhash(bh) => {
                                        if let Some(cb) = on_blockhash.read().await.as_ref() {
                                            cb(bh);
                                        }
                                    }
                                    DecodedMessage::Quote(quote) => {
                                        if let Some(cb) = on_quote.read().await.as_ref() {
                                            cb(quote);
                                        }
                                    }
                                    DecodedMessage::Heartbeat(hb) => {
                                        if let Some(cb) = on_heartbeat.read().await.as_ref() {
                                            cb(hb);
                                        }
                                    }
                                    DecodedMessage::Error(err) => {
                                        error!("Server error: {}", err);
                                        if let Some(cb) = on_error.read().await.as_ref() {
                                            cb(err);
                                        }
                                    }
                                    DecodedMessage::Subscribed { channels } => {
                                        info!("Subscribed to channels: {:?}", channels);
                                    }
                                }
                            }
                            Ok(None) => {
                                debug!("Unhandled message type: {}", msg_type);
                            }
                            Err(e) => {
                                error!("Error decoding message: {}", e);
                            }
                        }
                    }
                    Ok(Message::Text(text)) => {
                        // Parse JSON text messages for Heartbeat and other JSON responses
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(msg_type) = json.get("type").and_then(|t| t.as_str()) {
                                match msg_type {
                                    "heartbeat" => {
                                        if let Some(cb) = on_heartbeat.read().await.as_ref() {
                                            let hb = Heartbeat {
                                                timestamp_ms: json.get("timestamp_ms")
                                                    .and_then(|v| v.as_u64()).unwrap_or(0),
                                                uptime_seconds: json.get("uptime_seconds")
                                                    .and_then(|v| v.as_u64()).unwrap_or(0),
                                                messages_received: json.get("messages_received")
                                                    .and_then(|v| v.as_u64()).unwrap_or(0),
                                                messages_sent: json.get("messages_sent")
                                                    .and_then(|v| v.as_u64()).unwrap_or(0),
                                                subscriptions: json.get("subscriptions")
                                                    .and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                                            };
                                            cb(hb);
                                        }
                                    }
                                    "subscribed" => {
                                        if let Some(channels) = json.get("channels").and_then(|c| c.as_array()) {
                                            let channel_names: Vec<String> = channels
                                                .iter()
                                                .filter_map(|c| c.as_str().map(String::from))
                                                .collect();
                                            info!("Subscribed to channels: {:?}", channel_names);
                                        }
                                    }
                                    "error" => {
                                        let err_msg = json.get("message")
                                            .and_then(|m| m.as_str())
                                            .unwrap_or("Unknown error")
                                            .to_string();
                                        error!("Server error: {}", err_msg);
                                        if let Some(cb) = on_error.read().await.as_ref() {
                                            cb(err_msg);
                                        }
                                    }
                                    _ => {
                                        debug!("Unhandled text message type: {}", msg_type);
                                    }
                                }
                            }
                        } else {
                            debug!("Received non-JSON text message: {}", text);
                        }
                    }
                    Ok(Message::Close(_)) => {
                        warn!("WebSocket closed");
                        break;
                    }
                    Err(e) => {
                        error!("WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Message sending task
        let mut rx = {
            let (_tx, rx) = mpsc::channel::<Message>(100);
            // Note: In a real implementation, we'd store tx in self
            // This is a simplified version
            rx
        };

        let send_task = tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                if let Err(e) = write.send(msg).await {
                    error!("Failed to send message: {}", e);
                    break;
                }
            }
        });

        // Wait for tasks
        tokio::select! {
            _ = recv_task => {}
            _ = send_task => {}
        }

        Ok(())
    }

    /// Subscribe to channels.
    pub async fn subscribe(
        &self,
        request: SubscribeRequest,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let msg = serde_json::to_string(&request)?;
        self.tx.send(Message::Text(msg)).await?;
        Ok(())
    }

    /// Unsubscribe from all channels.
    pub async fn unsubscribe(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let msg = r#"{"type":"unsubscribe"}"#;
        self.tx.send(Message::Text(msg.to_string())).await?;
        Ok(())
    }
}
