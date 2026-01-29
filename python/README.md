# K256 Python SDK

Official Python SDK for the K256 Solana swap aggregator.

**Status:** Planned

## Installation (Future)

```bash
pip install k256-sdk
```

## Usage (Future)

```python
import asyncio
from k256.ws import create_websocket, decode_message
from k256.types import PoolUpdate, PriorityFees

async def main():
    # Create WebSocket client
    ws = await create_websocket(
        url="wss://gateway.k256.xyz/v1/ws",
        api_key="your-api-key"
    )

    # Handle messages
    @ws.on_message
    async def handle_message(data: bytes):
        message = decode_message(data)
        
        if message.type == "pool_update":
            update: PoolUpdate = message.data
            print(f"Pool {update.pool_address} updated: slot={update.slot}")
        
        elif message.type == "priority_fees":
            fees: PriorityFees = message.data
            print(f"Priority fees: {fees.recommended} microlamports")

    # Subscribe to channels
    await ws.subscribe(
        channels=["pools", "priority_fees"],
        protocols=["Raydium CLMM"]
    )

    # Keep connection alive
    await ws.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

## Synchronous API (Future)

```python
from k256.ws import create_websocket_sync, decode_message

# Synchronous client for simpler use cases
ws = create_websocket_sync(
    url="wss://gateway.k256.xyz/v1/ws",
    api_key="your-api-key"
)

ws.subscribe(channels=["priority_fees"])

for message in ws.messages():
    print(f"Received: {message.type}")
```

## Module Structure

```
k256-sdk/
├── k256/
│   ├── __init__.py
│   ├── ws/
│   │   ├── __init__.py
│   │   ├── client.py       # WebSocket connection
│   │   ├── decoder.py      # Binary message decoder
│   │   └── types.py        # WS types
│   ├── api/
│   │   ├── __init__.py
│   │   ├── client.py       # HTTP client
│   │   ├── quote.py        # Quote endpoint
│   │   └── swap.py         # Swap endpoint
│   ├── types/
│   │   ├── __init__.py
│   │   ├── pool.py         # Pool, PoolUpdate
│   │   ├── token.py        # Token
│   │   └── quote.py        # Quote
│   └── utils/
│       ├── __init__.py
│       └── base58.py       # Base58 encoding
├── tests/
├── pyproject.toml
└── README.md
```

## Architecture

This SDK follows the cross-language conventions defined in [../ARCHITECTURE.md](../ARCHITECTURE.md).

## Contributing

1. Read [ARCHITECTURE.md](../ARCHITECTURE.md) for naming conventions
2. Use Python 3.9+ type hints
3. Format with `black` and lint with `ruff`
4. Write tests with `pytest`

## License

MIT
