//! Blockhash types.

use serde::{Deserialize, Serialize};

/// Recent blockhash from K256.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Blockhash {
    /// Solana slot of the blockhash
    pub slot: u64,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// Base58-encoded recent blockhash
    pub blockhash: String,
    /// Block height
    pub block_height: u64,
    /// Last valid block height for transactions
    pub last_valid_block_height: u64,
    /// Whether data may be stale
    pub is_stale: bool,
}
