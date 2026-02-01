import Foundation

/// Recent blockhash from K256.
/// Wire format: 65 bytes, little-endian.
public struct K256Blockhash: Sendable, Equatable {
    /// Solana slot of the blockhash (offset 0)
    public let slot: UInt64
    /// Unix timestamp in milliseconds (offset 8)
    public let timestampMs: UInt64
    /// Base58-encoded recent blockhash (offset 16, 32 bytes)
    public let blockhash: String
    /// Block height (offset 48)
    public let blockHeight: UInt64
    /// Last valid block height for transactions (offset 56)
    public let lastValidBlockHeight: UInt64
    /// Whether data may be stale (offset 64)
    public let isStale: Bool

    public init(
        slot: UInt64,
        timestampMs: UInt64,
        blockhash: String,
        blockHeight: UInt64,
        lastValidBlockHeight: UInt64,
        isStale: Bool
    ) {
        self.slot = slot
        self.timestampMs = timestampMs
        self.blockhash = blockhash
        self.blockHeight = blockHeight
        self.lastValidBlockHeight = lastValidBlockHeight
        self.isStale = isStale
    }
}
