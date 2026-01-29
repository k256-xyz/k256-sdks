# K256 Python SDK

Official Python SDK for [K256](https://k256.xyz) - the fastest Solana swap aggregator.

**Status:** Planned

## Installation (Coming Soon)

```bash
pip install k256-sdk
```

## Quick Start

```python
import asyncio
from k256 import K256WebSocketClient

async def main():
    # Create WebSocket client
    client = K256WebSocketClient(api_key="your-api-key")

    # Handle pool updates
    @client.on_pool_update
    def handle_pool(update):
        print(f"Pool {update.pool_address}: slot={update.slot}")
        print(f"  Balances: {update.token_balances}")

    # Handle priority fees
    @client.on_priority_fees
    def handle_fees(fees):
        print(f"Recommended fee: {fees.recommended} microlamports")
        print(f"Network state: {fees.state}")

    # Handle errors
    @client.on_error
    def handle_error(error):
        print(f"Error: {error}")

    # Connect and subscribe
    await client.connect()
    
    client.subscribe(
        channels=["pools", "priority_fees", "blockhash"],
        # Optional filters:
        # protocols=["Raydium AMM", "Orca Whirlpool"],
    )

    # Keep running
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
```

## Examples

See the `examples/` directory for runnable examples:

```bash
cd examples
K256_API_KEY=your-key python websocket.py
```

## Module Structure

```
k256-sdk/
├── k256/
│   ├── __init__.py
│   ├── ws/
│   │   ├── __init__.py
│   │   ├── client.py     # WebSocket connection
│   │   ├── decoder.py    # Binary message decoder
│   │   └── types.py      # WS types
│   ├── types/
│   │   ├── __init__.py
│   │   ├── pool.py       # Pool, PoolUpdate
│   │   └── quote.py      # Quote
│   └── utils/
│       ├── __init__.py
│       └── base58.py     # Base58 encoding
└── examples/
    └── websocket.py      # WebSocket example
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
