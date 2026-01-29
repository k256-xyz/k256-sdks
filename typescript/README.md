# @k256/sdk

Official TypeScript SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

## Installation

```bash
npm install @k256/sdk
# or
yarn add @k256/sdk
# or
pnpm add @k256/sdk
```

## Quick Start

```typescript
import { K256WebSocketClient } from '@k256/sdk';

const client = new K256WebSocketClient({
  apiKey: 'your-api-key',
  mode: 'binary', // 'binary' (default, fastest) or 'json' (debugging)
  
  // Message callbacks
  onPoolUpdate: (update) => console.log('Pool:', update.data.poolAddress),
  onPriorityFees: (fees) => console.log('Fees:', fees.data.recommended),
  onBlockhash: (bh) => console.log('Blockhash:', bh.data.blockhash),
  
  // Connection callbacks
  onConnect: () => console.log('Connected'),
  onDisconnect: (code, reason) => console.log(`Disconnected: ${code}`),
  onError: (error) => console.error('Error:', error.message),
});

// Connect and subscribe
await client.connect();
client.subscribe({
  channels: ['pools', 'priority_fees', 'blockhash'],
});

// Streaming quotes
client.subscribeQuote({
  inputMint: 'So11111111111111111111111111111111111111112',  // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 1_000_000_000, // 1 SOL in lamports
  slippageBps: 50,
  refreshIntervalMs: 1000,
});

// Graceful disconnect
client.disconnect();
```

## Features

- **Binary Protocol**: Direct decoding of K2's high-performance bincode format
- **Automatic Reconnection**: Exponential backoff with configurable limits  
- **Ping/Pong Keepalive**: Automatic connection health monitoring
- **Heartbeat Tracking**: Server status and connection stats
- **Type-Safe Events**: Full TypeScript types for all message types
- **RFC 6455 Close Codes**: Proper WebSocket close code handling

## Message Types

| Type | Description |
|------|-------------|
| `pool_update` | DEX pool state change |
| `priority_fees` | Fee estimates (~400ms updates) |
| `blockhash` | Latest blockhash (~400ms updates) |
| `quote` | Streaming quote update |
| `subscribed` | Subscription confirmed |
| `heartbeat` | Connection stats |
| `error` | Server error message |

## Connection States

```typescript
type ConnectionState = 
  | 'disconnected'    // Not connected
  | 'connecting'      // Initial connection in progress
  | 'connected'       // Active connection
  | 'reconnecting'    // Auto-reconnecting after disconnect
  | 'closed';         // Explicitly closed, won't reconnect
```

## Error Handling

```typescript
import { K256WebSocketClient, K256WebSocketError } from '@k256/sdk';

const client = new K256WebSocketClient({
  apiKey: 'your-api-key',
  onError: (error: K256WebSocketError) => {
    console.error(`[${error.code}] ${error.message}`);
    
    if (error.isAuthError) {
      // Invalid API key - don't retry
    }
    
    if (error.isRecoverable) {
      // Will auto-reconnect
    }
  },
});
```

## Low-Level Decoder

For advanced usage, you can use the decoder directly:

```typescript
import { decodeMessage, decodePoolUpdateBatch, MessageType } from '@k256/sdk/ws';

const ws = new WebSocket('wss://gateway.k256.xyz/v1/ws?apiKey=...');
ws.binaryType = 'arraybuffer';

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    const message = decodeMessage(event.data);
    
    // Handle batched pool updates
    if (message && new DataView(event.data).getUint8(0) === MessageType.PoolUpdateBatch) {
      const updates = decodePoolUpdateBatch(event.data.slice(1));
      for (const update of updates) {
        console.log(update.data.poolAddress);
      }
    }
  }
};
```

## Configuration

```typescript
interface K256WebSocketClientConfig {
  apiKey: string;
  url?: string;              // Default: wss://gateway.k256.xyz/v1/ws
  mode?: 'binary' | 'json';  // Default: 'binary'
  
  // Reconnection
  autoReconnect?: boolean;        // Default: true
  reconnectDelayMs?: number;      // Default: 1000
  maxReconnectDelayMs?: number;   // Default: 30000
  maxReconnectAttempts?: number;  // Default: Infinity
  
  // Keepalive
  pingIntervalMs?: number;        // Default: 30000
  pongTimeoutMs?: number;         // Default: 10000
  heartbeatTimeoutMs?: number;    // Default: 15000
}
```

## Examples

Runnable examples are available in the GitHub repository:

```bash
git clone https://github.com/k256-xyz/k256-sdks.git
cd k256-sdks/typescript/examples
npm install

# Run with your API key (all channels)
K256_API_KEY=your-key npx tsx websocket.ts

# Subscribe to specific channel
K256_API_KEY=your-key npx tsx websocket.ts --channel=priority_fees

# Subscribe to blockhash only
K256_API_KEY=your-key npx tsx websocket.ts --channel=blockhash
```

See [examples/](https://github.com/k256-xyz/k256-sdks/tree/main/typescript/examples) for all available examples.

## Links

- [K256 Website](https://k256.xyz)
- [API Documentation](https://docs.k256.xyz)
- [GitHub](https://github.com/k256-xyz/k256-sdks)

## License

MIT
