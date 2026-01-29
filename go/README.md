# K256 Go SDK

Official Go SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

**Status:** Planned

## Installation (Coming Soon)

```bash
go get github.com/k256-xyz/sdk-go
```

## Quick Start

```go
package main

import (
    "fmt"
    k256 "github.com/k256-xyz/sdk-go"
)

func main() {
    // Create WebSocket client
    ws := k256.NewWebSocket(k256.Config{
        APIKey: "your-api-key",
    })
    defer ws.Close()

    // Handle pool updates
    ws.OnPoolUpdate(func(update *k256.PoolUpdate) {
        fmt.Printf("Pool %s: slot=%d, balances=%v\n",
            update.PoolAddress,
            update.Slot,
            update.TokenBalances)
    })

    // Handle priority fees
    ws.OnPriorityFees(func(fees *k256.PriorityFees) {
        fmt.Printf("Recommended fee: %d microlamports\n", fees.Recommended)
    })

    // Handle errors
    ws.OnError(func(err error) {
        fmt.Printf("Error: %v\n", err)
    })

    // Connect and subscribe
    if err := ws.Connect(); err != nil {
        panic(err)
    }

    ws.Subscribe(k256.SubscribeRequest{
        Channels: []string{"pools", "priority_fees", "blockhash"},
    })

    // Block forever
    select {}
}
```

## Examples

See the `examples/` directory for runnable examples:

```bash
cd examples
K256_API_KEY=your-key go run websocket.go
```

## Module Structure

```
sdk-go/
├── ws/
│   ├── client.go       # WebSocket connection
│   ├── decoder.go      # Binary message decoder
│   └── types.go        # WS types
├── types/
│   ├── pool.go         # Pool, PoolUpdate
│   ├── token.go        # Token
│   └── quote.go        # Quote
├── utils/
│   └── base58.go       # Base58 encoding
└── examples/
    └── websocket.go    # WebSocket example
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
