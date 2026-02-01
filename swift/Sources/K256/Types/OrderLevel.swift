import Foundation

/// Order book level with price and size.
public struct K256OrderLevel: Sendable, Codable, Equatable {
    /// Price in base units
    public let price: UInt64
    /// Size in base units
    public let size: UInt64

    public init(price: UInt64, size: UInt64) {
        self.price = price
        self.size = size
    }
}
