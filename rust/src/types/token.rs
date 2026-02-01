//! Token types.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Token metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Token {
    /// Token mint address
    pub address: String,
    /// Token symbol (e.g., "SOL", "USDC")
    pub symbol: String,
    /// Token name
    pub name: String,
    /// Token decimals
    pub decimals: u8,
    /// URL to token logo
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_uri: Option<String>,
    /// List of tags
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    /// Additional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extensions: Option<HashMap<String, serde_json::Value>>,
}
