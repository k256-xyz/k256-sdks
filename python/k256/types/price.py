"""Price feed types."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PriceEntry:
    """Single token price from the price feed.

    Wire format per entry: 56 bytes
        [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]

    usd_price uses fixed-point with 10^12 precision (divide by 1e12 to get USD).

    Attributes:
        mint: Base58-encoded token mint address
        usd_price: USD price (float, already divided by 1e12)
        slot: Solana slot of the price observation
        timestamp_ms: Unix timestamp in milliseconds
    """

    mint: str
    usd_price: float
    slot: int
    timestamp_ms: int
