# K256 Go SDK

Official Go SDK for the K256 Solana swap aggregator.

**Status:** Planned

## Installation (Future)

```bash
go get github.com/quiknode-labs/k256-sdk-go
```

## Usage (Future)

```go
package main

import (
    "fmt"
    k256 "github.com/quiknode-labs/k256-sdk-go"
)

func main() {
    // Create WebSocket client
    ws := k256.NewWebSocket(k256.WebSocketConfig{
        URL:    "wss://gateway.k256.xyz/v1/ws",
        APIKey: "your-api-key",
    })
    defer ws.Close()

    // Handle messages
    ws.OnMessage(func(data []byte) {
        msg := k256.DecodeMessage(data)
        switch msg.Type {
        case k256.MessageTypePoolUpdate:
            update := msg.Data.(*k256.PoolUpdate)
            fmt.Printf("Pool %s updated: slot=%d\n", 
                k256.Base58Encode(update.PoolAddress[:]), 
                update.Slot)
        case k256.MessageTypePriorityFees:
            fees := msg.Data.(*k256.PriorityFees)
            fmt.Printf("Priority fees: %d microlamports\n", fees.Recommended)
        }
    })

    // Subscribe to channels
    ws.Subscribe(k256.SubscribeRequest{
        Channels:  []string{"pools", "priority_fees"},
        Protocols: []string{"Raydium CLMM"},
    })

    // Block forever (or use select{} in real code)
    select {}
}
```

## Module Structure

```
k256-sdk-go/
├── ws/
│   ├── client.go       # WebSocket connection
│   ├── decoder.go      # Binary message decoder
│   └── types.go        # WS types
├── api/
│   ├── client.go       # HTTP client
│   ├── quote.go        # Quote endpoint
│   └── swap.go         # Swap endpoint
├── types/
│   ├── pool.go         # Pool, PoolUpdate
│   ├── token.go        # Token
│   └── quote.go        # Quote
└── utils/
    └── base58.go       # Base58 encoding
```

## Architecture

This SDK follows the cross-language conventions defined in [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Contributing

1. Read [ARCHITECTURE.md](../ARCHITECTURE.md) for naming conventions
2. Follow standard Go project layout
3. Use `go fmt` and `go vet`
4. Write tests for all public functions

## License

MIT
