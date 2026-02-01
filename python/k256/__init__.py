"""
K256 SDK - The gateway to Solana's liquidity ecosystem.

Official Python SDK for K256. Connect any application to Solana's
liquidity ecosystem. One API. All venues. Full observability.

Example:
    >>> from k256 import K256WebSocketClient
    >>> client = K256WebSocketClient(api_key="your-api-key")
    >>> await client.connect()
"""

from k256.ws import K256WebSocketClient, decode_message
from k256.types import (
    PoolUpdate,
    PriorityFees,
    NetworkState,
    Blockhash,
    Quote,
    Token,
    Pool,
    OrderLevel,
    Heartbeat,
    MessageType,
)

__version__ = "0.1.0"
__author__ = "K256"
__email__ = "support@k256.xyz"

__all__ = [
    # Client
    "K256WebSocketClient",
    # Functions
    "decode_message",
    # Types
    "PoolUpdate",
    "PriorityFees",
    "NetworkState",
    "Blockhash",
    "Quote",
    "Token",
    "Pool",
    "OrderLevel",
    "Heartbeat",
    "MessageType",
    # Metadata
    "__version__",
]
