//! Priority fees types.

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

/// Priority fee recommendations from K256.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PriorityFees {
    /// Current Solana slot
    pub slot: u64,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Recommended fee in microlamports per CU
    pub recommended: u64,
    /// Network congestion state
    pub state: NetworkState,
    /// Whether data may be stale
    pub is_stale: bool,
    /// 50th percentile swap fee (≥50K CU txns)
    pub swap_p50: u64,
    /// 75th percentile swap fee
    pub swap_p75: u64,
    /// 90th percentile swap fee
    pub swap_p90: u64,
    /// 99th percentile swap fee
    pub swap_p99: u64,
    /// Number of samples used
    pub swap_samples: u32,
    /// Fee to land with 50% probability
    pub landing_p50_fee: u64,
    /// Fee to land with 75% probability
    pub landing_p75_fee: u64,
    /// Fee to land with 90% probability
    pub landing_p90_fee: u64,
    /// Fee to land with 99% probability
    pub landing_p99_fee: u64,
    /// Fee at top 10% tier
    pub top_10_fee: u64,
    /// Fee at top 25% tier
    pub top_25_fee: u64,
    /// True if fee spike detected
    pub spike_detected: bool,
    /// Fee during spike condition
    pub spike_fee: u64,
}
