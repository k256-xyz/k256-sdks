# K256 Rust SDK

Official Rust SDK for [K256](https://k256.xyz) - the fastest Solana swap aggregator.

**Status:** Planned

## Installation (Coming Soon)

```toml
[dependencies]
k256-sdk = "0.1"
```

## Quick Start

```rust
use k256_sdk::{K256WebSocketClient, Config};
use k256_sdk::ws::{PoolUpdate, PriorityFees};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create WebSocket client
    let client = K256WebSocketClient::new(Config {
        api_key: std::env::var("K256_API_KEY")?,
        ..Default::default()
    });

    // Handle pool updates
    client.on_pool_update(|update: PoolUpdate| {
        println!("Pool {}: slot={}", update.pool_address, update.slot);
        println!("  Balances: {:?}", update.token_balances);
    });

    // Handle priority fees
    client.on_priority_fees(|fees: PriorityFees| {
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
        channels: vec!["pools", "priority_fees", "blockhash"],
        // Optional filters:
        // protocols: Some(vec!["Raydium AMM", "Orca Whirlpool"]),
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
k256-sdk/
├── src/
│   ├── lib.rs
│   ├── ws/
│   │   ├── mod.rs
│   │   ├── client.rs     # WebSocket connection
│   │   ├── decoder.rs    # Binary message decoder
│   │   └── types.rs      # WS types
│   ├── types/
│   │   ├── mod.rs
│   │   ├── pool.rs       # Pool, PoolUpdate
│   │   └── quote.rs      # Quote
│   └── utils/
│       ├── mod.rs
│       └── base58.rs     # Base58 encoding
└── examples/
    └── websocket.rs      # WebSocket example
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
