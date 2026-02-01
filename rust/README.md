# K256 Rust SDK

Official Rust SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Crates.io](https://img.shields.io/crates/v/k256-sdk.svg)](https://crates.io/crates/k256-sdk)
[![Documentation](https://docs.rs/k256-sdk/badge.svg)](https://docs.rs/k256-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```toml
[dependencies]
k256-sdk = "0.1"
```

## Quick Start

```rust
use k256_sdk::{K256WebSocketClient, Config, SubscribeRequest, PoolUpdate, PriorityFees};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create WebSocket client
    let client = K256WebSocketClient::new(Config {
        api_key: std::env::var("K256_API_KEY")?,
        ..Default::default()
    });

    // Handle pool updates
    client.on_pool_update(|update: &PoolUpdate| {
        println!("Pool {}: slot={}", update.pool_address, update.slot);
        println!("  Balances: {:?}", update.token_balances);
    });

    // Handle priority fees
    client.on_priority_fees(|fees: &PriorityFees| {
        println!("Recommended fee: {} microlamports", fees.recommended);
        println!("Network state: {:?}", fees.state);
    });

    // Handle errors
    client.on_error(|err| {
        eprintln!("Error: {}", err);
    });

    // Connect and subscribe
    client.connect().await?;
    
    client.subscribe(SubscribeRequest {
        channels: vec!["pools".to_string(), "priority_fees".to_string(), "blockhash".to_string()],
        ..Default::default()
    }).await?;

    // Keep running
    tokio::signal::ctrl_c().await?;
    Ok(())
}
```

## Examples

See the `examples/` directory for runnable examples:

```bash
cd examples
K256_API_KEY=your-key cargo run --example websocket
```

## Module Structure

```
k256_sdk/
├── lib.rs               # Main crate exports
├── ws/
│   ├── mod.rs           # WebSocket module
│   ├── client.rs        # WebSocket client
│   └── decoder.rs       # Binary message decoder
├── types/
│   ├── mod.rs           # Type re-exports
│   ├── pool.rs          # PoolUpdate
│   ├── fees.rs          # PriorityFees
│   ├── blockhash.rs     # Blockhash
│   ├── quote.rs         # Quote
│   ├── token.rs         # Token
│   ├── heartbeat.rs     # Heartbeat
│   └── messages.rs      # MessageType, NetworkState
└── utils/
    ├── mod.rs           # Utility exports
    └── base58.rs        # Base58 encoding
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
