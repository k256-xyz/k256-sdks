"""Priority fees types."""

from dataclasses import dataclass
from enum import IntEnum


class NetworkState(IntEnum):
    """Network congestion state."""
    
    LOW = 0
    """Low congestion - minimal fees needed"""
    
    NORMAL = 1
    """Normal congestion"""
    
    HIGH = 2
    """High congestion - higher fees recommended"""
    
    EXTREME = 3
    """Extreme congestion - maximum fees recommended"""


@dataclass(frozen=True, slots=True)
class PriorityFees:
    """Priority fee recommendations from K256.
    
    Attributes:
        slot: Current Solana slot
        timestamp_ms: Unix timestamp in milliseconds
        recommended: Recommended fee in microlamports per CU
        state: Network congestion state
        is_stale: Whether data may be stale
        swap_p50: 50th percentile swap fee (≥50K CU txns)
        swap_p75: 75th percentile swap fee
        swap_p90: 90th percentile swap fee
        swap_p99: 99th percentile swap fee
        swap_samples: Number of samples used
        landing_p50_fee: Fee to land with 50% probability
        landing_p75_fee: Fee to land with 75% probability
        landing_p90_fee: Fee to land with 90% probability
        landing_p99_fee: Fee to land with 99% probability
        top_10_fee: Fee at top 10% tier
        top_25_fee: Fee at top 25% tier
        spike_detected: True if fee spike detected
        spike_fee: Fee during spike condition
    """
    
    slot: int
    timestamp_ms: int
    recommended: int
    state: NetworkState
    is_stale: bool
    swap_p50: int
    swap_p75: int
    swap_p90: int
    swap_p99: int
    swap_samples: int
    landing_p50_fee: int
    landing_p75_fee: int
    landing_p90_fee: int
    landing_p99_fee: int
    top_10_fee: int
    top_25_fee: int
    spike_detected: bool
    spike_fee: int
