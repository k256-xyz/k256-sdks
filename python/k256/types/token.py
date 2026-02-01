"""Token types."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class Token:
    """Token metadata.
    
    Attributes:
        address: Token mint address
        symbol: Token symbol (e.g., "SOL", "USDC")
        name: Token name
        decimals: Token decimals
        logo_uri: URL to token logo
        tags: List of tags
        extensions: Additional metadata
    """
    
    address: str
    symbol: str
    name: str
    decimals: int
    logo_uri: Optional[str] = None
    tags: Optional[list[str]] = None
    extensions: Optional[dict] = None
