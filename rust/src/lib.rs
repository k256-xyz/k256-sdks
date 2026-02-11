//! # K256 SDK
//!
//! Official Rust SDK for [K256](https://k256.xyz) - the gateway to Solana's liquidity ecosystem.
//!
//! Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use k256_sdk::{K256WebSocketClient, Config};
//!
//! #[tokio::main]
//! async fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     let client = K256WebSocketClient::new(Config {
//!         api_key: std::env::var("K256_API_KEY")?,
//!         ..Default::default()
//!     });
//!
//!     client.on_pool_update(|update| {
//!         println!("Pool {}: slot={}", update.pool_address, update.slot);
//!     });
//!
//!     client.connect().await?;
//!     Ok(())
//! }
//! ```
//!
//! ## Features
//!
//! - **WebSocket streaming** - Real-time pool updates, priority fees, blockhash
//! - **Binary protocol** - Low-latency bincode-encoded messages
//! - **Auto-reconnect** - Exponential backoff with jitter
//! - **Type-safe** - Strongly typed message structs
//!
//! ## Modules
//!
//! - [`ws`] - WebSocket client and binary decoder
//! - [`types`] - Core type definitions
//! - [`utils`] - Utility functions (base58, pubkey validation)

#![cfg_attr(docsrs, feature(doc_cfg))]
#![warn(missing_docs)]
#![warn(rustdoc::missing_crate_level_docs)]

pub mod types;
pub mod utils;
pub mod ws;
pub mod leader_ws;

// Re-exports
pub use types::*;
pub use ws::{K256WebSocketClient, Config, SubscribeRequest};
