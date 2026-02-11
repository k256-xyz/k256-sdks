"""Fee market types (per-writable-account model)."""

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
class AccountFee:
    """Per-writable-account fee data.

    Solana's scheduler limits each writable account to 12M CU per block.
    Fee pricing is per-account: max(p75(account) for account in writable_accounts).

    Attributes:
        pubkey: Account public key (base58)
        total_txs: Total transactions touching this account in the window
        active_slots: Number of slots where this account was active
        cu_consumed: Total CU consumed by transactions touching this account
        utilization_pct: Account utilization percentage (0-100) of 12M CU limit
        p25: 25th percentile fee in microlamports/CU
        p50: 50th percentile fee in microlamports/CU
        p75: 75th percentile fee in microlamports/CU
        p90: 90th percentile fee in microlamports/CU
        min_nonzero_price: Minimum non-zero fee observed
    """

    pubkey: str
    total_txs: int
    active_slots: int
    cu_consumed: int
    utilization_pct: float
    p25: int
    p50: int
    p75: int
    p90: int
    min_nonzero_price: int


@dataclass(frozen=True, slots=True)
class FeeMarket:
    """Fee market update (per-writable-account model).

    Replaces the old flat PriorityFees struct. Now provides per-account
    fee data so clients can price transactions based on the specific
    writable accounts they touch.

    Attributes:
        slot: Current Solana slot
        timestamp_ms: Unix timestamp in milliseconds
        recommended: Recommended fee in microlamports/CU (max p75 across hottest accounts)
        state: Network congestion state
        is_stale: Whether data may be stale
        block_utilization_pct: Block utilization percentage (0-100)
        blocks_in_window: Number of blocks in the observation window
        accounts: Per-account fee data
    """

    slot: int
    timestamp_ms: int
    recommended: int
    state: NetworkState
    is_stale: bool
    block_utilization_pct: float
    blocks_in_window: int
    accounts: list[AccountFee]
