import Foundation

/// Real-time pool state update from K256 WebSocket.
public struct K256PoolUpdate: Sendable, Equatable {
    /// Global sequence number for ordering
    public let sequence: UInt64
    /// Solana slot number
    public let slot: UInt64
    /// Write version within slot
    public let writeVersion: UInt64
    /// DEX protocol name (e.g., "RaydiumClmm", "Whirlpool")
    public let protocolName: String
    /// Base58-encoded pool address
    public let poolAddress: String
    /// List of token mint addresses
    public let tokenMints: [String]
    /// List of token balances (same order as mints)
    public let tokenBalances: [UInt64]
    /// List of token decimals (same order as mints)
    public let tokenDecimals: [Int32]
    /// Best bid order level, if available
    public let bestBid: K256OrderLevel?
    /// Best ask order level, if available
    public let bestAsk: K256OrderLevel?
    /// Opaque pool state bytes
    public let serializedState: Data

    public init(
        sequence: UInt64,
        slot: UInt64,
        writeVersion: UInt64,
        protocolName: String,
        poolAddress: String,
        tokenMints: [String],
        tokenBalances: [UInt64],
        tokenDecimals: [Int32],
        bestBid: K256OrderLevel?,
        bestAsk: K256OrderLevel?,
        serializedState: Data
    ) {
        self.sequence = sequence
        self.slot = slot
        self.writeVersion = writeVersion
        self.protocolName = protocolName
        self.poolAddress = poolAddress
        self.tokenMints = tokenMints
        self.tokenBalances = tokenBalances
        self.tokenDecimals = tokenDecimals
        self.bestBid = bestBid
        self.bestAsk = bestAsk
        self.serializedState = serializedState
    }
}
