import Foundation

/// Priority fee recommendations from K256.
/// Wire format: 119 bytes, little-endian.
public struct K256PriorityFees: Sendable, Equatable {
    /// Current Solana slot (offset 0)
    public let slot: UInt64
    /// Unix timestamp in milliseconds (offset 8)
    public let timestampMs: UInt64
    /// Recommended fee in microlamports per CU (offset 16)
    public let recommended: UInt64
    /// Network congestion state (offset 24)
    public let state: K256NetworkState
    /// Whether data may be stale (offset 25)
    public let isStale: Bool
    /// 50th percentile swap fee (offset 26)
    public let swapP50: UInt64
    /// 75th percentile swap fee (offset 34)
    public let swapP75: UInt64
    /// 90th percentile swap fee (offset 42)
    public let swapP90: UInt64
    /// 99th percentile swap fee (offset 50)
    public let swapP99: UInt64
    /// Number of samples used (offset 58)
    public let swapSamples: UInt32
    /// Fee to land with 50% probability (offset 62)
    public let landingP50Fee: UInt64
    /// Fee to land with 75% probability (offset 70)
    public let landingP75Fee: UInt64
    /// Fee to land with 90% probability (offset 78)
    public let landingP90Fee: UInt64
    /// Fee to land with 99% probability (offset 86)
    public let landingP99Fee: UInt64
    /// Fee at top 10% tier (offset 94)
    public let top10Fee: UInt64
    /// Fee at top 25% tier (offset 102)
    public let top25Fee: UInt64
    /// True if fee spike detected (offset 110)
    public let spikeDetected: Bool
    /// Fee during spike condition (offset 111)
    public let spikeFee: UInt64

    public init(
        slot: UInt64,
        timestampMs: UInt64,
        recommended: UInt64,
        state: K256NetworkState,
        isStale: Bool,
        swapP50: UInt64,
        swapP75: UInt64,
        swapP90: UInt64,
        swapP99: UInt64,
        swapSamples: UInt32,
        landingP50Fee: UInt64,
        landingP75Fee: UInt64,
        landingP90Fee: UInt64,
        landingP99Fee: UInt64,
        top10Fee: UInt64,
        top25Fee: UInt64,
        spikeDetected: Bool,
        spikeFee: UInt64
    ) {
        self.slot = slot
        self.timestampMs = timestampMs
        self.recommended = recommended
        self.state = state
        self.isStale = isStale
        self.swapP50 = swapP50
        self.swapP75 = swapP75
        self.swapP90 = swapP90
        self.swapP99 = swapP99
        self.swapSamples = swapSamples
        self.landingP50Fee = landingP50Fee
        self.landingP75Fee = landingP75Fee
        self.landingP90Fee = landingP90Fee
        self.landingP99Fee = landingP99Fee
        self.top10Fee = top10Fee
        self.top25Fee = top25Fee
        self.spikeDetected = spikeDetected
        self.spikeFee = spikeFee
    }
}
