#!/usr/bin/env python3
"""
K256 Python WebSocket Example

Usage:
    K256_API_KEY=your-key python websocket.py
"""

import asyncio
import os
import signal
import sys

# Add parent directory to path for local development
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from k256 import K256WebSocketClient


async def main():
    # Get API key from environment
    api_key = os.getenv("K256_API_KEY")
    if not api_key:
        print("Error: K256_API_KEY environment variable is required")
        sys.exit(1)

    # Create WebSocket client
    client = K256WebSocketClient(api_key=api_key)

    # Handle connection events
    @client.on_connected
    def on_connected():
        print("Connected to K256 WebSocket")

    @client.on_disconnected
    def on_disconnected():
        print("Disconnected from K256 WebSocket")

    # Handle pool updates
    @client.on_pool_update
    def handle_pool(update):
        print(f"[Pool Update] {update.pool_address} (slot {update.slot})")
        print(f"  Protocol: {update.protocol_name}")
        print(f"  Tokens: {update.token_mints}")
        print(f"  Balances: {update.token_balances}")
        if update.best_bid:
            print(f"  Best Bid: price={update.best_bid.price}, size={update.best_bid.size}")
        if update.best_ask:
            print(f"  Best Ask: price={update.best_ask.price}, size={update.best_ask.size}")

    # Handle fee market updates
    @client.on_fee_market
    def handle_fees(fees):
        print(f"[Fee Market] slot={fees.slot}, recommended={fees.recommended} microlamports")
        print(f"  State: {fees.state}, IsStale: {fees.is_stale}, BlockUtil: {fees.block_utilization_pct:.1f}%")
        print(f"  Accounts: {len(fees.accounts)}")
        for acct in fees.accounts:
            print(f"    {acct.pubkey}: p75={acct.p75}, util={acct.utilization_pct:.1f}%")

    # Handle blockhash updates
    @client.on_blockhash
    def handle_blockhash(bh):
        print(f"[Blockhash] {bh.blockhash} (slot {bh.slot})")
        print(f"  Block height: {bh.block_height}, Last valid: {bh.last_valid_block_height}, Stale: {bh.is_stale}")

    # Handle heartbeats
    @client.on_heartbeat
    def handle_heartbeat(hb):
        print(f"[Heartbeat] uptime={hb.uptime_seconds}s, msgs_recv={hb.messages_received}, msgs_sent={hb.messages_sent}, subs={hb.subscriptions}")

    # Handle errors
    @client.on_error
    def handle_error(err):
        print(f"[Error] {err}")

    # Set up graceful shutdown
    stop_event = asyncio.Event()

    def signal_handler():
        print("\nShutting down...")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)

    # Connect in background
    connect_task = asyncio.create_task(client.connect())

    # Subscribe to channels
    client.subscribe(channels=["pools", "priority_fees", "blockhash"])

    print("Subscribed to pools, priority_fees, and blockhash channels")
    print("Press Ctrl+C to exit...")

    # Wait for stop signal
    await stop_event.wait()

    # Close connection
    await client.close()
    connect_task.cancel()


if __name__ == "__main__":
    asyncio.run(main())
