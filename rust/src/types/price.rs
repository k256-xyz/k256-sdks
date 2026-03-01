//! Price feed types.

/// Single token price from the price feed.
///
/// Wire format per entry: 56 bytes
///   [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
///
/// `usd_price` uses fixed-point with 10^12 precision (divide by 1e12 to get USD).
#[derive(Debug, Clone)]
pub struct PriceEntry {
    /// Base58-encoded token mint address
    pub mint: String,
    /// USD price (float, already divided by 1e12)
    pub usd_price: f64,
    /// Solana slot of the price observation
    pub slot: u64,
    /// Unix timestamp in milliseconds
    pub timestamp_ms: u64,
}
