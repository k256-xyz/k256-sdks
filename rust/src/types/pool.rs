//! Pool and pool update types.

use serde::{Deserialize, Serialize};

/// Order book level with price and size.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct OrderLevel {
    /// Price in base units (u64)
    pub price: u64,
    /// Size in base units (u64)
    pub size: u64,
}

/// Real-time pool state update from K256 WebSocket.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PoolUpdate {
    /// Global sequence number for ordering
    pub sequence: u64,
    /// Solana slot number
    pub slot: u64,
    /// Write version within slot
    pub write_version: u64,
    /// DEX protocol name (e.g., "RaydiumClmm", "Whirlpool")
    pub protocol_name: String,
    /// Base58-encoded pool address
    pub pool_address: String,
    /// List of token mint addresses
    pub token_mints: Vec<String>,
    /// List of token balances (same order as mints)
    pub token_balances: Vec<u64>,
    /// List of token decimals (same order as mints)
    pub token_decimals: Vec<i32>,
    /// Best bid order level, if available
    pub best_bid: Option<OrderLevel>,
    /// Best ask order level, if available
    pub best_ask: Option<OrderLevel>,
    /// Opaque pool state bytes
    #[serde(with = "serde_bytes")]
    pub serialized_state: Vec<u8>,
}

/// DEX pool metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Pool {
    /// Base58-encoded pool address
    pub address: String,
    /// DEX protocol name
    pub protocol: String,
    /// First token mint address
    pub token_a_mint: String,
    /// Second token mint address
    pub token_b_mint: String,
    /// First token vault address
    pub token_a_vault: String,
    /// Second token vault address
    pub token_b_vault: String,
    /// Fee rate in basis points
    pub fee_rate: u32,
}

mod serde_bytes {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S>(bytes: &Vec<u8>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_bytes(bytes)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bytes: &[u8] = Deserialize::deserialize(deserializer)?;
        Ok(bytes.to_vec())
    }
}
