# K256 SDKs

Official SDKs for the K256 Solana swap aggregator.

## Available SDKs

| Language | Package | Status | Location |
|----------|---------|--------|----------|
| TypeScript | `@k256/sdk` | **In Development** | `k256-app-dashboard/lib/k256-sdk/` (internal) |
| Go | `github.com/quiknode-labs/k256-sdk-go` | Planned | `k256-sdks/go/` |
| Python | `k256-sdk` | Planned | `k256-sdks/python/` |
| Rust | `k256-sdk` | Planned | `k256-sdks/rust/` |

## Architecture

All SDKs follow the same module structure and naming conventions documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Features

Each SDK provides:

- **WebSocket Client** (`ws/`) - Real-time pool updates, priority fees, blockhash, streaming quotes
- **REST API Client** (`api/`) - Quote, swap instructions, token search
- **Type Definitions** (`types/`) - Pool, Token, Quote, Order types
- **Utilities** (`utils/`) - Base58 encoding, address validation

## Quick Start

### TypeScript

```typescript
import { createWebSocket, decodeMessage } from '@k256/sdk/ws';
import type { PoolUpdate } from '@k256/sdk/types';

const ws = createWebSocket({
  url: 'wss://gateway.k256.xyz/v1/ws',
  apiKey: 'your-api-key',
});

ws.on('message', (data: ArrayBuffer) => {
  const message = decodeMessage(data);
  if (message.type === 'pool_update') {
    const update = message.data as PoolUpdate;
    console.log(`Pool ${update.poolAddress} updated`);
  }
});

ws.subscribe({ channels: ['pools'] });
```

### Go (Coming Soon)

```go
import k256 "github.com/quiknode-labs/k256-sdk-go"

ws := k256.NewWebSocket(k256.Config{
    URL:    "wss://gateway.k256.xyz/v1/ws",
    APIKey: "your-api-key",
})

ws.OnMessage(func(data []byte) {
    msg := k256.DecodeMessage(data)
    if msg.Type == k256.MessageTypePoolUpdate {
        update := msg.Data.(*k256.PoolUpdate)
        fmt.Printf("Pool %s updated\n", update.PoolAddress)
    }
})

ws.Subscribe(k256.SubscribeRequest{Channels: []string{"pools"}})
```

### Python (Coming Soon)

```python
from k256.ws import create_websocket, decode_message
from k256.types import PoolUpdate

ws = create_websocket(
    url="wss://gateway.k256.xyz/v1/ws",
    api_key="your-api-key"
)

@ws.on_message
def handle_message(data: bytes):
    message = decode_message(data)
    if message.type == "pool_update":
        update: PoolUpdate = message.data
        print(f"Pool {update.pool_address} updated")

ws.subscribe(channels=["pools"])
```

### Rust (Coming Soon)

```rust
use k256_sdk::ws::{WebSocket, Config, decode_message};
use k256_sdk::types::PoolUpdate;

let ws = WebSocket::new(Config {
    url: "wss://gateway.k256.xyz/v1/ws",
    api_key: "your-api-key",
});

ws.on_message(|data| {
    let msg = decode_message(&data);
    if let Message::PoolUpdate(update) = msg {
        println!("Pool {} updated", update.pool_address);
    }
});

ws.subscribe(&SubscribeRequest { channels: vec!["pools"] });
```

## Contributing

See [ARCHITECTURE.md](./ARCHITECTURE.md) for coding conventions and patterns that must be followed across all SDKs.

## License

MIT
