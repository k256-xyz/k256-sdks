// Package k256 provides the official Go SDK for K256 - the gateway to Solana's liquidity ecosystem.
//
// Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.
//
// Quick Start:
//
//	package main
//
//	import (
//		"fmt"
//		k256 "github.com/k256-xyz/k256-sdks/go"
//	)
//
//	func main() {
//		ws := k256.NewWebSocket(k256.Config{
//			APIKey: "your-api-key",
//		})
//		defer ws.Close()
//
//		ws.OnPoolUpdate(func(update *k256.PoolUpdate) {
//			fmt.Printf("Pool %s: slot=%d\n", update.PoolAddress, update.Slot)
//		})
//
//		if err := ws.Connect(); err != nil {
//			panic(err)
//		}
//
//		ws.Subscribe(k256.SubscribeRequest{
//			Channels: []string{"pools", "priority_fees", "blockhash"},
//		})
//
//		select {}
//	}
package k256

// Version is the current SDK version.
const Version = "0.1.0"
