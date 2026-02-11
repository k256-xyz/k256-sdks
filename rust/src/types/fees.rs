//! Fee market types (per-writable-account model).

use serde::{Deserialize, Serialize};

/// Network congestion state.
#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum NetworkState {
    /// Low congestion - minimal fees needed
    Low = 0,
    /// Normal congestion
    Normal = 1,
    /// High congestion - higher fees recommended
    High = 2,
    /// Extreme congestion - maximum fees recommended
    Extreme = 3,
}

impl TryFrom<u8> for NetworkState {
    type Error = u8;

    fn try_from(value: u8) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(Self::Low),
            1 => Ok(Self::Normal),
            2 => Ok(Self::High),
            3 => Ok(Self::Extreme),
            other => Err(other),
        }
    }
}

/// Per-writable-account fee data.
///
/// Solana's scheduler limits each writable account to 12M CU per block.
/// Fee pricing is per-account: `max(p75(account) for account in writable_accounts)`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AccountFee {
    /// Account public key (base58)
    pub pubkey: String,
    /// Total transactions touching this account in the window
    pub total_txs: u32,
    /// Number of slots where this account was active
    pub active_slots: u32,
    /// Total CU consumed by transactions touching this account
    pub cu_consumed: u64,
    /// Account utilization percentage (0-100) of 12M CU limit
    pub utilization_pct: f32,
    /// 25th percentile fee in microlamports/CU
    pub p25: u64,
    /// 50th percentile fee in microlamports/CU
    pub p50: u64,
    /// 75th percentile fee in microlamports/CU
    pub p75: u64,
    /// 90th percentile fee in microlamports/CU
    pub p90: u64,
    /// Minimum non-zero fee observed
    pub min_nonzero_price: u64,
}

/// Fee market update (per-writable-account model).
///
/// Replaces the old flat `PriorityFees` struct. Now provides per-account
/// fee data so clients can price transactions based on the specific
/// writable accounts they touch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FeeMarket {
    /// Current Solana slot
    pub slot: u64,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Recommended fee in microlamports/CU (max p75 across hottest accounts)
    pub recommended: u64,
    /// Network congestion state
    pub state: NetworkState,
    /// Whether data may be stale
    pub is_stale: bool,
    /// Block utilization percentage (0-100)
    pub block_utilization_pct: f32,
    /// Number of blocks in the observation window
    pub blocks_in_window: u32,
    /// Per-account fee data
    pub accounts: Vec<AccountFee>,
}
