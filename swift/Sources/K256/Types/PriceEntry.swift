import Foundation

/// Single token price from the price feed.
///
/// Wire format per entry: 56 bytes
///   [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
///
/// `usd_price` uses fixed-point with 10^12 precision.
public struct PriceEntry: Equatable, Sendable {
    /// Base58-encoded token mint address
    public let mint: String
    /// USD price (divided by 1e12)
    public let usdPrice: Double
    /// Solana slot of the observation
    public let slot: UInt64
    /// Unix timestamp in milliseconds
    public let timestampMs: UInt64
}
