# K256 Rust SDK

Official Rust SDK for the K256 Solana swap aggregator.

**Status:** Planned

## Installation (Future)

```toml
# Cargo.toml
[dependencies]
k256-sdk = "0.1"
```

## Usage (Future)

```rust
use k256_sdk::ws::{WebSocket, Config, decode_message, Message};
use k256_sdk::types::{PoolUpdate, PriorityFees};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create WebSocket client
    let ws = WebSocket::new(Config {
        url: "wss://gateway.k256.xyz/v1/ws".to_string(),
        api_key: "your-api-key".to_string(),
        ..Default::default()
    }).await?;

    // Subscribe to channels
    ws.subscribe(&SubscribeRequest {
        channels: vec!["pools".to_string(), "priority_fees".to_string()],
        protocols: Some(vec!["Raydium CLMM".to_string()]),
        ..Default::default()
    }).await?;

    // Handle messages
    while let Some(data) = ws.recv().await {
        match decode_message(&data)? {
            Message::PoolUpdate(update) => {
                println!(
                    "Pool {} updated: slot={}",
                    bs58::encode(&update.pool_address).into_string(),
                    update.slot
                );
            }
            Message::PriorityFees(fees) => {
                println!("Priority fees: {} microlamports", fees.recommended);
            }
            Message::Heartbeat(hb) => {
                println!("Heartbeat: {} messages sent", hb.messages_sent);
            }
            _ => {}
        }
    }

    Ok(())
}
```

## Module Structure

```
k256-sdk/
├── src/
│   ├── lib.rs
│   ├── ws/
│   │   ├── mod.rs
│   │   ├── client.rs       # WebSocket connection
│   │   ├── decoder.rs      # Binary message decoder
│   │   └── types.rs        # WS types
│   ├── api/
│   │   ├── mod.rs
│   │   ├── client.rs       # HTTP client
│   │   ├── quote.rs        # Quote endpoint
│   │   └── swap.rs         # Swap endpoint
│   ├── types/
│   │   ├── mod.rs
│   │   ├── pool.rs         # Pool, PoolUpdate
│   │   ├── token.rs        # Token
│   │   └── quote.rs        # Quote
│   └── utils/
│       ├── mod.rs
│       └── base58.rs       # Base58 (re-export bs58)
├── tests/
├── Cargo.toml
└── README.md
```

## Features

```toml
# Cargo.toml
[features]
default = ["ws", "api"]
ws = ["tokio-tungstenite", "futures-util"]
api = ["reqwest"]
```

## Architecture

This SDK follows the cross-language conventions defined in [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Contributing

1. Read [ARCHITECTURE.md](../ARCHITECTURE.md) for naming conventions
2. Use Rust 2021 edition
3. Format with `cargo fmt` and lint with `cargo clippy`
4. Write tests and documentation

## License

MIT
