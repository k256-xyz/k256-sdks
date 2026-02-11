//! K256 Rust WebSocket Example
//!
//! Usage:
//!   K256_API_KEY=your-key cargo run --example websocket

use k256_sdk::{Config, K256WebSocketClient, SubscribeRequest};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Get API key from environment
    let api_key = env::var("K256_API_KEY")
        .expect("K256_API_KEY environment variable is required");

    // Create WebSocket client
    let config = Config {
        api_key,
        ..Config::default()
    };
    
    let client = K256WebSocketClient::new(config);

    // Handle pool updates
    client.on_pool_update(|update| {
        println!("[Pool Update] {} (slot {})", update.pool_address, update.slot);
        println!("  Protocol: {}", update.protocol_name);
        println!("  Tokens: {:?}", update.token_mints);
        println!("  Balances: {:?}", update.token_balances);
        if let Some(ref bid) = update.best_bid {
            println!("  Best Bid: price={}, size={}", bid.price, bid.size);
        }
        if let Some(ref ask) = update.best_ask {
            println!("  Best Ask: price={}, size={}", ask.price, ask.size);
        }
    });

    // Handle fee market updates
    client.on_fee_market(|fees| {
        println!(
            "[Fee Market] slot={}, recommended={} microlamports",
            fees.slot, fees.recommended
        );
        println!("  State: {}, IsStale: {}, BlockUtil: {:.1}%", fees.state, fees.is_stale, fees.block_utilization_pct);
        println!("  Accounts: {}", fees.accounts.len());
        for acct in &fees.accounts {
            println!("    {}: p75={}, util={:.1}%", acct.pubkey, acct.p75, acct.utilization_pct);
        }
    });

    // Handle blockhash updates
    client.on_blockhash(|bh| {
        println!("[Blockhash] {} (slot {})", bh.blockhash, bh.slot);
        println!(
            "  Block height: {}, Last valid: {}, Stale: {}",
            bh.block_height, bh.last_valid_block_height, bh.is_stale
        );
    });

    // Handle heartbeats
    client.on_heartbeat(|hb| {
        println!(
            "[Heartbeat] uptime={}s, msgs_recv={}, msgs_sent={}, subs={}",
            hb.uptime_seconds, hb.messages_received, hb.messages_sent, hb.subscriptions
        );
    });

    // Handle errors
    client.on_error(|err| {
        eprintln!("[Error] {}", err);
    });

    // Subscribe request
    let request = SubscribeRequest {
        channels: vec![
            "pools".to_string(),
            "priority_fees".to_string(),
            "blockhash".to_string(),
        ],
        ..Default::default()
    };

    println!("Connecting to K256 WebSocket...");
    println!("Subscribed to pools, priority_fees, and blockhash channels");
    println!("Press Ctrl+C to exit...");

    // Connect and subscribe
    // Note: In production, you'd want to handle reconnection and subscription separately
    client.connect().await?;
    client.subscribe(request).await?;

    // Wait for Ctrl+C
    tokio::signal::ctrl_c().await?;
    println!("\nShutting down...");

    Ok(())
}
