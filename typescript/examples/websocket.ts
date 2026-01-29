/**
 * K256 WebSocket Example
 * 
 * Demonstrates all WebSocket functionality:
 * - Connecting with API key
 * - Subscribing to channels (pools, priority_fees, blockhash)
 * - Filtering by protocol, pool addresses, or token pairs
 * - Handling real-time updates
 * - Error handling and reconnection
 * 
 * Usage:
 *   K256_API_KEY=your-api-key npx tsx websocket.ts
 *   K256_API_KEY=your-api-key npx tsx websocket.ts --channel=pools
 *   K256_API_KEY=your-api-key npx tsx websocket.ts --channel=priority_fees
 *   K256_API_KEY=your-api-key npx tsx websocket.ts --pool=PoolAddressHere
 */

import { K256WebSocketClient } from '@k256/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const API_KEY = process.env.K256_API_KEY;

if (!API_KEY) {
  console.error('Error: K256_API_KEY environment variable is required');
  console.error('Usage: K256_API_KEY=your-api-key npx tsx websocket.ts');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};

const channelArg = getArg('channel');
const protocolArg = getArg('protocol');
const poolArg = getArg('pool');

// Default to all channels if none specified
const channels = channelArg 
  ? [channelArg] 
  : ['pools', 'priority_fees', 'blockhash'];

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

let stats = {
  poolUpdates: 0,
  priorityFees: 0,
  blockhashes: 0,
  errors: 0,
  startTime: Date.now(),
};

function printStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log(`\n📊 Stats (${elapsed}s):`);
  console.log(`   Pool updates: ${stats.poolUpdates}`);
  console.log(`   Priority fees: ${stats.priorityFees}`);
  console.log(`   Blockhashes: ${stats.blockhashes}`);
  console.log(`   Errors: ${stats.errors}`);
  if (stats.poolUpdates > 0) {
    const rate = (stats.poolUpdates / parseFloat(elapsed)).toFixed(1);
    console.log(`   Pool update rate: ${rate}/sec`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create WebSocket Client
// ─────────────────────────────────────────────────────────────────────────────

const client = new K256WebSocketClient({
  apiKey: API_KEY,
  mode: 'binary', // Use efficient binary protocol (default)
  
  // Connection callbacks
  onConnect: () => {
    console.log('✅ Connected to K256');
    stats.startTime = Date.now();
  },
  
  onDisconnect: (code, reason, wasClean) => {
    console.log(`❌ Disconnected: ${code} - ${reason} (clean: ${wasClean})`);
    printStats();
  },
  
  onReconnecting: (attempt, delayMs) => {
    console.log(`🔄 Reconnecting (attempt ${attempt}, delay ${delayMs}ms)...`);
  },
  
  onStateChange: (state, prevState) => {
    console.log(`📡 State: ${prevState} → ${state}`);
  },
  
  // Message callbacks
  onSubscribed: (msg) => {
    // Note: Server sends snake_case JSON fields
    const data = msg.data as Record<string, unknown>;
    console.log('\n📋 Subscription confirmed:');
    console.log(`   Channels: ${(data.channels as string[]).join(', ')}`);
    console.log(`   Pool count: ${data.pool_count ?? 'all'}`);
    console.log(`   Summary: ${data.summary}`);
    console.log('\n📥 Waiting for updates...\n');
  },
  
  onPoolUpdate: (update) => {
    stats.poolUpdates++;
    const { data } = update;
    
    // Print every 100th update to avoid spam
    if (stats.poolUpdates % 100 === 1 || stats.poolUpdates <= 5) {
      console.log(`🏊 Pool #${stats.poolUpdates}:`);
      console.log(`   Address: ${data.poolAddress}`);
      console.log(`   Protocol: ${data.protocol}`);
      console.log(`   Slot: ${data.slot}`);
      console.log(`   Balances: [${data.tokenBalances.map(b => BigInt(b).toLocaleString()).join(', ')}]`);
    }
  },
  
  onPoolUpdateBatch: (updates) => {
    // Called when receiving batched updates (more efficient)
    // Individual updates are also emitted via onPoolUpdate
    if (updates.length > 10) {
      console.log(`📦 Received batch of ${updates.length} pool updates`);
    }
  },
  
  onPriorityFees: (msg) => {
    stats.priorityFees++;
    const { data } = msg;
    
    console.log(`⚡ Priority Fees #${stats.priorityFees}:`);
    console.log(`   Recommended: ${data.recommended.toLocaleString()} microlamports`);
    console.log(`   State: ${['Low', 'Normal', 'High', 'Congested'][data.state] || data.state}`);
    console.log(`   Swap P50/P90/P99: ${data.swapP50}/${data.swapP90}/${data.swapP99}`);
    console.log(`   Stale: ${data.isStale}`);
  },
  
  onBlockhash: (msg) => {
    stats.blockhashes++;
    const { data } = msg;
    
    console.log(`🔗 Blockhash #${stats.blockhashes}:`);
    console.log(`   Hash: ${data.blockhash}`);
    console.log(`   Slot: ${data.slot}`);
    console.log(`   Block height: ${data.blockHeight}`);
    console.log(`   Valid until: ${data.lastValidBlockHeight}`);
  },
  
  onHeartbeat: (msg) => {
    // Note: Server sends snake_case JSON fields
    const data = msg.data as Record<string, unknown>;
    console.log(`💓 Heartbeat: uptime ${data.uptime_secs}s, sent ${data.messages_sent}, dropped ${data.messages_dropped}`);
  },
  
  onPong: (latencyMs) => {
    console.log(`🏓 Pong: ${latencyMs}ms latency`);
  },
  
  onError: (error) => {
    stats.errors++;
    console.error(`❗ Error [${error.code}]: ${error.message}`);
    if (error.closeCode) {
      console.error(`   Close code: ${error.closeCode} - ${error.closeReason}`);
    }
    if (!error.isRecoverable) {
      console.error('   This error is not recoverable. Check your API key.');
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Connect and Subscribe
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 K256 WebSocket Example');
  console.log('─'.repeat(50));
  console.log(`Channels: ${channels.join(', ')}`);
  if (protocolArg) console.log(`Protocol filter: ${protocolArg}`);
  if (poolArg) console.log(`Pool filter: ${poolArg}`);
  console.log('─'.repeat(50));
  
  try {
    await client.connect();
    
    // Subscribe to channels with optional filters
    client.subscribe({
      channels,
      ...(protocolArg && { protocols: [protocolArg] }),
      ...(poolArg && { pools: [poolArg] }),
    });
    
    // Print stats every 30 seconds
    setInterval(printStats, 30000);
    
  } catch (error) {
    console.error('Failed to connect:', error);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown
// ─────────────────────────────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  printStats();
  client.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  client.disconnect();
  process.exit(0);
});

// Run
main();
