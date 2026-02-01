"""Quote types."""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True, slots=True)
class Quote:
    """Swap quote from K256.
    
    Attributes:
        input_mint: Input token mint address
        output_mint: Output token mint address
        in_amount: Input amount in base units
        out_amount: Output amount in base units
        price_impact_pct: Price impact percentage
        slot: Solana slot of the quote
        timestamp_ms: Unix timestamp in milliseconds
        route_plan: List of route steps
        other_amount_threshold: Minimum output (or max input for exactOut)
        swap_mode: "ExactIn" or "ExactOut"
    """
    
    input_mint: str
    output_mint: str
    in_amount: int
    out_amount: int
    price_impact_pct: float
    slot: int
    timestamp_ms: int
    route_plan: list[dict]
    other_amount_threshold: Optional[int] = None
    swap_mode: str = "ExactIn"
