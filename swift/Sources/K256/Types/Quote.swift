import Foundation

/// Swap quote from K256.
public struct K256Quote: Sendable, Equatable {
    /// Topic ID for the quote subscription
    public let topicId: String
    /// Unix timestamp in milliseconds
    public let timestampMs: UInt64
    /// Sequence number
    public let sequence: UInt64
    /// Input token mint address
    public let inputMint: String
    /// Output token mint address
    public let outputMint: String
    /// Input amount in base units
    public let inAmount: UInt64
    /// Output amount in base units
    public let outAmount: UInt64
    /// Price impact in basis points
    public let priceImpactBps: Int32
    /// Solana slot of the quote
    public let contextSlot: UInt64
    /// Algorithm used for routing
    public let algorithm: String
    /// Whether this is an improvement over previous quote
    public let isImprovement: Bool
    /// Whether this quote is from cache
    public let isCached: Bool
    /// Whether this quote may be stale
    public let isStale: Bool
    /// JSON route plan
    public let routePlanJson: String?

    public init(
        topicId: String,
        timestampMs: UInt64,
        sequence: UInt64,
        inputMint: String,
        outputMint: String,
        inAmount: UInt64,
        outAmount: UInt64,
        priceImpactBps: Int32,
        contextSlot: UInt64,
        algorithm: String,
        isImprovement: Bool,
        isCached: Bool,
        isStale: Bool,
        routePlanJson: String?
    ) {
        self.topicId = topicId
        self.timestampMs = timestampMs
        self.sequence = sequence
        self.inputMint = inputMint
        self.outputMint = outputMint
        self.inAmount = inAmount
        self.outAmount = outAmount
        self.priceImpactBps = priceImpactBps
        self.contextSlot = contextSlot
        self.algorithm = algorithm
        self.isImprovement = isImprovement
        self.isCached = isCached
        self.isStale = isStale
        self.routePlanJson = routePlanJson
    }
}
