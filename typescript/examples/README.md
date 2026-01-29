# K256 SDK Examples

Runnable examples for the [@k256/sdk](https://npmjs.com/package/@k256/sdk) TypeScript package.

## Setup

```bash
npm install
```

## Running Examples

All examples require a K256 API key. Get one at [k256.xyz](https://k256.xyz).

### WebSocket - All Channels

Subscribe to all real-time data (pools, priority fees, blockhash):

```bash
K256_API_KEY=your-key npx tsx websocket.ts
```

### WebSocket - Specific Channel

Subscribe to a single channel:

```bash
# Pool updates only
K256_API_KEY=your-key npx tsx websocket.ts --channel=pools

# Priority fees only
K256_API_KEY=your-key npx tsx websocket.ts --channel=priority_fees

# Blockhash only
K256_API_KEY=your-key npx tsx websocket.ts --channel=blockhash
```

### WebSocket - With Filters

Filter by protocol or pool address:

```bash
# Only Raydium AMM pools
K256_API_KEY=your-key npx tsx websocket.ts --protocol="Raydium AMM"

# Only Orca Whirlpool
K256_API_KEY=your-key npx tsx websocket.ts --protocol="Orca Whirlpool"

# Specific pool address
K256_API_KEY=your-key npx tsx websocket.ts --pool=PoolAddressHere
```

## Available Channels

| Channel | Description | Update Frequency |
|---------|-------------|------------------|
| `pools` | DEX pool state changes (balances, prices) | Real-time (high volume) |
| `priority_fees` | Solana priority fee estimates | ~400ms |
| `blockhash` | Recent blockhash for transactions | ~400ms |

## Output

The examples print formatted output showing:

- Connection state changes
- Subscription confirmations
- Real-time data updates
- Statistics (message counts, rates)

Press `Ctrl+C` to stop and see final statistics.
