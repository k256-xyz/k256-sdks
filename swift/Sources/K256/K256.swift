/// K256 SDK - The gateway to Solana's liquidity ecosystem
///
/// Official Swift SDK for K256. Connect any application to Solana's
/// liquidity ecosystem. One API. All venues. Full observability.
///
/// This SDK provides binary message decoders and types. For WebSocket
/// client functionality, use a Swift networking library like URLSession
/// or Starscream.
///
/// ## Example
///
/// ```swift
/// import K256SDK
///
/// // Decode fee market from binary payload
/// if let fees = K256Decoder.decodeFeeMarket(payload) {
///     print("Slot: \(fees.slot)")
///     print("Recommended fee: \(fees.recommended) microlamports")
/// }
///
/// // Decode blockhash
/// if let bh = K256Decoder.decodeBlockhash(payload) {
///     print("Blockhash: \(bh.blockhash)")
/// }
///
/// // Base58 encoding
/// let address = Base58.encode(pubkeyBytes)
/// ```

public enum K256 {
    /// SDK version
    public static let version = "0.1.0"
}

// Re-exports
public typealias MessageType = K256MessageType
public typealias NetworkState = K256NetworkState
public typealias OrderLevel = K256OrderLevel
public typealias PoolUpdate = K256PoolUpdate
public typealias AccountFee = K256AccountFee
public typealias FeeMarket = K256FeeMarket
public typealias Blockhash = K256Blockhash
public typealias Quote = K256Quote
public typealias Heartbeat = K256Heartbeat
public typealias Token = K256Token
