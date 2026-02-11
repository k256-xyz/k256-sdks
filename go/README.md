# K256 Go SDK

Official Go SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Go Reference](https://pkg.go.dev/badge/github.com/k256-xyz/k256-sdks/go.svg)](https://pkg.go.dev/github.com/k256-xyz/k256-sdks/go)
[![Go Report Card](https://goreportcard.com/badge/github.com/k256-xyz/k256-sdks/go)](https://goreportcard.com/report/github.com/k256-xyz/k256-sdks/go)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
go get github.com/k256-xyz/k256-sdks/go
```

## Quick Start

```go
package main

import (
    "fmt"
    k256 "github.com/k256-xyz/k256-sdks/go"
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

    // Handle fee market
    ws.OnFeeMarket(func(fees *k256.FeeMarket) {
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
k256/                   # github.com/k256-xyz/k256-sdks/go
├── k256.go             # Main package exports
├── client.go           # WebSocket client
├── decoder.go          # Binary message decoder
├── types.go            # Type definitions (PoolUpdate, FeeMarket, AccountFee, etc.)
├── utils.go            # Base58 encoding utilities
└── examples/
    └── websocket.go    # WebSocket example
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
