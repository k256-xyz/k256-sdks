//! Quote types.

use serde::{Deserialize, Serialize};

/// Swap quote from K256.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Quote {
    /// Input token mint address
    pub input_mint: String,
    /// Output token mint address
    pub output_mint: String,
    /// Input amount in base units
    pub in_amount: u64,
    /// Output amount in base units
    pub out_amount: u64,
    /// Price impact percentage
    pub price_impact_pct: f64,
    /// Solana slot of the quote
    pub slot: u64,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
    /// List of route steps
    pub route_plan: Vec<serde_json::Value>,
    /// Minimum output (or max input for exactOut)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_amount_threshold: Option<u64>,
    /// "ExactIn" or "ExactOut"
    #[serde(default = "default_swap_mode")]
    pub swap_mode: String,
}

fn default_swap_mode() -> String {
    "ExactIn".to_string()
}
