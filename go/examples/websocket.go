// K256 Go WebSocket Example
//
// Usage:
//   K256_API_KEY=your-key go run websocket.go

package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	k256 "github.com/k256-xyz/k256-sdks/go"
)

func main() {
	// Get API key from environment
	apiKey := os.Getenv("K256_API_KEY")
	if apiKey == "" {
		log.Fatal("K256_API_KEY environment variable is required")
	}

	// Create WebSocket client
	config := k256.DefaultConfig()
	config.APIKey = apiKey
	
	ws := k256.NewWebSocket(config)

	// Handle connection events - subscribe when connected
	ws.OnConnected(func() {
		fmt.Println("Connected to K256 WebSocket")
		
		// Subscribe to channels after connection is established
		if err := ws.Subscribe(k256.SubscribeRequest{
			Channels: []string{"pools", "priority_fees", "blockhash"},
		}); err != nil {
			log.Printf("Subscribe error: %v", err)
		} else {
			fmt.Println("Subscribed to pools, priority_fees, and blockhash channels")
		}
	})

	ws.OnDisconnected(func() {
		fmt.Println("Disconnected from K256 WebSocket")
	})

	// Handle pool updates
	ws.OnPoolUpdate(func(update *k256.PoolUpdate) {
		fmt.Printf("[Pool Update] %s (slot %d)\n", update.PoolAddress, update.Slot)
		fmt.Printf("  Protocol: %s\n", update.ProtocolName)
		fmt.Printf("  Tokens: %v\n", update.TokenMints)
		fmt.Printf("  Balances: %v\n", update.TokenBalances)
		if update.BestBid != nil {
			fmt.Printf("  Best Bid: price=%d, size=%d\n", update.BestBid.Price, update.BestBid.Size)
		}
		if update.BestAsk != nil {
			fmt.Printf("  Best Ask: price=%d, size=%d\n", update.BestAsk.Price, update.BestAsk.Size)
		}
	})

	// Handle priority fees
	ws.OnPriorityFees(func(fees *k256.PriorityFees) {
		fmt.Printf("[Priority Fees] slot=%d, recommended=%d microlamports\n", 
			fees.Slot, fees.Recommended)
		fmt.Printf("  State: %d, IsStale: %v\n", fees.State, fees.IsStale)
		fmt.Printf("  Swap percentiles: p50=%d, p75=%d, p90=%d, p99=%d\n",
			fees.SwapP50, fees.SwapP75, fees.SwapP90, fees.SwapP99)
		fmt.Printf("  Samples: %d\n", fees.SwapSamples)
	})

	// Handle blockhash updates
	ws.OnBlockhash(func(bh *k256.Blockhash) {
		fmt.Printf("[Blockhash] %s (slot %d)\n", bh.Blockhash, bh.Slot)
		fmt.Printf("  Block height: %d, Last valid: %d, Stale: %v\n",
			bh.BlockHeight, bh.LastValidBlockHeight, bh.IsStale)
	})

	// Handle heartbeats
	ws.OnHeartbeat(func(hb *k256.Heartbeat) {
		fmt.Printf("[Heartbeat] uptime=%ds, msgs_recv=%d, msgs_sent=%d, subs=%d\n",
			hb.UptimeSeconds, hb.MessagesReceived, hb.MessagesSent, hb.Subscriptions)
	})

	// Handle errors
	ws.OnError(func(err error) {
		fmt.Printf("[Error] %v\n", err)
	})

	// Connect (blocking call that runs the message loop)
	// Subscription happens in OnConnected callback to avoid race condition
	go func() {
		if err := ws.Connect(); err != nil {
			log.Printf("Connection error: %v", err)
		}
	}()

	fmt.Println("Connecting to K256 WebSocket...")
	fmt.Println("Press Ctrl+C to exit...")

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\nShutting down...")
	ws.Close()
}
