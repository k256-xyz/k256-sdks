import Foundation

/// Per-writable-account fee data.
/// Solana's scheduler limits each writable account to 12M CU per block.
public struct K256AccountFee: Sendable, Equatable {
    /// Account public key (Base58)
    public let pubkey: String
    /// Total transactions touching this account in the window
    public let totalTxs: UInt32
    /// Number of slots where this account was active
    public let activeSlots: UInt32
    /// Total CU consumed by transactions touching this account
    public let cuConsumed: UInt64
    /// Account utilization percentage (0-100) of 12M CU limit
    public let utilizationPct: Float
    /// 25th percentile fee in microlamports/CU
    public let p25: UInt64
    /// 50th percentile fee in microlamports/CU
    public let p50: UInt64
    /// 75th percentile fee in microlamports/CU
    public let p75: UInt64
    /// 90th percentile fee in microlamports/CU
    public let p90: UInt64
    /// Minimum non-zero fee observed
    public let minNonzeroPrice: UInt64

    public init(
        pubkey: String,
        totalTxs: UInt32,
        activeSlots: UInt32,
        cuConsumed: UInt64,
        utilizationPct: Float,
        p25: UInt64,
        p50: UInt64,
        p75: UInt64,
        p90: UInt64,
        minNonzeroPrice: UInt64
    ) {
        self.pubkey = pubkey
        self.totalTxs = totalTxs
        self.activeSlots = activeSlots
        self.cuConsumed = cuConsumed
        self.utilizationPct = utilizationPct
        self.p25 = p25
        self.p50 = p50
        self.p75 = p75
        self.p90 = p90
        self.minNonzeroPrice = minNonzeroPrice
    }
}

/// Fee market update from K256 (per-writable-account model).
/// Variable-length wire format: 42-byte header + N × 92 bytes per account.
public struct K256FeeMarket: Sendable, Equatable {
    /// Current Solana slot
    public let slot: UInt64
    /// Unix timestamp in milliseconds
    public let timestampMs: UInt64
    /// Recommended fee in microlamports/CU (max p75 across hottest accounts)
    public let recommended: UInt64
    /// Network congestion state
    public let state: K256NetworkState
    /// Whether data may be stale
    public let isStale: Bool
    /// Block utilization percentage (0-100)
    public let blockUtilizationPct: Float
    /// Number of blocks in the observation window
    public let blocksInWindow: UInt32
    /// Per-account fee data
    public let accounts: [K256AccountFee]

    public init(
        slot: UInt64,
        timestampMs: UInt64,
        recommended: UInt64,
        state: K256NetworkState,
        isStale: Bool,
        blockUtilizationPct: Float,
        blocksInWindow: UInt32,
        accounts: [K256AccountFee]
    ) {
        self.slot = slot
        self.timestampMs = timestampMs
        self.recommended = recommended
        self.state = state
        self.isStale = isStale
        self.blockUtilizationPct = blockUtilizationPct
        self.blocksInWindow = blocksInWindow
        self.accounts = accounts
    }
}
