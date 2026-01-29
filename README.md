# K256 SDKs

Official SDKs for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

## Available SDKs

| Language | Package | Status | Install |
|----------|---------|--------|---------|
| TypeScript | [`@k256/sdk`](https://npmjs.com/package/@k256/sdk) | **Published** | `npm install @k256/sdk` |
| Go | `github.com/k256-xyz/sdk-go` | Planned | - |
| Python | `k256-sdk` | Planned | - |
| Rust | `k256-sdk` | Planned | - |

## Repository Structure

```
k256-sdks/
├── typescript/          # TypeScript SDK (@k256/sdk)
│   ├── src/             # Source code
│   └── examples/        # Runnable examples
├── go/                  # Go SDK (planned)
├── python/              # Python SDK (planned)
├── rust/                # Rust SDK (planned)
└── ARCHITECTURE.md      # Cross-language conventions
```

## Quick Start

### TypeScript

```bash
npm install @k256/sdk
```

```typescript
import { K256WebSocketClient } from '@k256/sdk';

const client = new K256WebSocketClient({
  apiKey: 'your-api-key',
  onPoolUpdate: (update) => {
    console.log(`Pool: ${update.data.poolAddress}`);
    console.log(`Protocol: ${update.data.protocol}`);
    console.log(`Balances: ${update.data.tokenBalances.join(', ')}`);
  },
  onPriorityFees: (fees) => {
    console.log(`Recommended fee: ${fees.data.recommended} microlamports`);
    console.log(`Network state: ${fees.data.state}`);
  },
  onBlockhash: (bh) => {
    console.log(`Blockhash: ${bh.data.blockhash}`);
  },
  onError: (error) => console.error(error.message),
});

await client.connect();

// Subscribe to real-time data
client.subscribe({
  channels: ['pools', 'priority_fees', 'blockhash'],
});
```

### Running Examples

Each SDK has an `examples/` folder with runnable examples:

```bash
# TypeScript
cd typescript/examples
npm install
K256_API_KEY=your-key npx tsx websocket.ts
```

## Features

All SDKs provide:

| Module | Description |
|--------|-------------|
| `ws/` | WebSocket client - real-time pool updates, priority fees, blockhash, streaming quotes |
| `types/` | Type definitions - Pool, Token, Quote, PriorityFees, etc. |
| `utils/` | Utilities - Base58 encoding, address validation |
| `api/` | REST API client (planned) - Quote, swap instructions, token search |

## Channels

Subscribe to these real-time data channels:

| Channel | Description | Update Frequency |
|---------|-------------|------------------|
| `pools` | DEX pool state changes (balances, prices) | Real-time |
| `priority_fees` | Solana priority fee estimates | ~400ms |
| `blockhash` | Recent blockhash for transactions | ~400ms |

## Architecture

All SDKs follow the same patterns documented in [ARCHITECTURE.md](./ARCHITECTURE.md):

- Consistent module structure across languages
- Same type names (language casing conventions apply)
- Identical binary protocol decoding
- Same message type constants

## Links

- [K256 Website](https://k256.xyz)
- [API Documentation](https://docs.k256.xyz)
- [GitHub](https://github.com/k256-xyz)

## License

MIT
