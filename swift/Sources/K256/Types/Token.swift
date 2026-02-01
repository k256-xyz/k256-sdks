import Foundation

/// Token metadata.
public struct K256Token: Sendable, Equatable, Codable {
    /// Token mint address
    public let address: String
    /// Token symbol (e.g., "SOL", "USDC")
    public let symbol: String
    /// Token name
    public let name: String
    /// Token decimals
    public let decimals: UInt8
    /// URL to token logo
    public let logoUri: String?
    /// List of tags
    public let tags: [String]?

    public init(
        address: String,
        symbol: String,
        name: String,
        decimals: UInt8,
        logoUri: String? = nil,
        tags: [String]? = nil
    ) {
        self.address = address
        self.symbol = symbol
        self.name = name
        self.decimals = decimals
        self.logoUri = logoUri
        self.tags = tags
    }

    enum CodingKeys: String, CodingKey {
        case address
        case symbol
        case name
        case decimals
        case logoUri = "logo_uri"
        case tags
    }
}
