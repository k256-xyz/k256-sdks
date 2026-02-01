"""Blockhash types."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Blockhash:
    """Recent blockhash from K256.
    
    Attributes:
        slot: Solana slot of the blockhash
        timestamp_ms: Unix timestamp in milliseconds
        blockhash: Base58-encoded recent blockhash
        block_height: Block height
        last_valid_block_height: Last valid block height for transactions
        is_stale: Whether data may be stale
    """
    
    slot: int
    timestamp_ms: int
    blockhash: str
    block_height: int
    last_valid_block_height: int
    is_stale: bool
