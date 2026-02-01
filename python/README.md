# K256 Python SDK

Official Python SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![PyPI version](https://badge.fury.io/py/k256-sdk.svg)](https://badge.fury.io/py/k256-sdk)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

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
k256/
├── __init__.py          # Main package exports
├── ws/
│   ├── __init__.py
│   ├── client.py        # WebSocket client
│   └── decoder.py       # Binary message decoder
├── types/
│   ├── __init__.py
│   ├── pool.py          # PoolUpdate
│   ├── fees.py          # PriorityFees
│   ├── blockhash.py     # Blockhash
│   ├── quote.py         # Quote
│   ├── token.py         # Token
│   ├── heartbeat.py     # Heartbeat
│   └── messages.py      # MessageType, NetworkState
└── utils/
    ├── __init__.py
    └── base58.py        # Base58 encoding
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
