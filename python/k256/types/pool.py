"""Pool and pool update types."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class OrderLevel:
    """Order book level with price and size.
    
    Attributes:
        price: Price in base units (u64)
        size: Size in base units (u64)
    """
    
    price: int
    size: int


@dataclass(frozen=True, slots=True)
class PoolUpdate:
    """Real-time pool state update from K256 WebSocket.
    
    Attributes:
        sequence: Global sequence number for ordering
        slot: Solana slot number
        write_version: Write version within slot
        protocol_name: DEX protocol name (e.g., "RaydiumClmm", "Whirlpool")
        pool_address: Base58-encoded pool address
        token_mints: List of token mint addresses
        token_balances: List of token balances (same order as mints)
        token_decimals: List of token decimals (same order as mints)
        best_bid: Best bid order level, if available
        best_ask: Best ask order level, if available
        serialized_state: Opaque pool state bytes
    """
    
    sequence: int
    slot: int
    write_version: int
    protocol_name: str
    pool_address: str
    token_mints: list[str]
    token_balances: list[int]
    token_decimals: list[int]
    best_bid: Optional[OrderLevel]
    best_ask: Optional[OrderLevel]
    serialized_state: bytes


@dataclass(frozen=True, slots=True)
class Pool:
    """DEX pool metadata.
    
    Attributes:
        address: Base58-encoded pool address
        protocol: DEX protocol name
        token_a_mint: First token mint address
        token_b_mint: Second token mint address
        token_a_vault: First token vault address
        token_b_vault: Second token vault address
        fee_rate: Fee rate in basis points
    """
    
    address: str
    protocol: str
    token_a_mint: str
    token_b_mint: str
    token_a_vault: str
    token_b_vault: str
    fee_rate: int
