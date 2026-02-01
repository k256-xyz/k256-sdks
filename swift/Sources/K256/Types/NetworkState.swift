import Foundation

/// Network congestion state.
public enum K256NetworkState: UInt8, Sendable, Codable {
    /// Low congestion - minimal fees needed
    case low = 0
    /// Normal congestion
    case normal = 1
    /// High congestion - higher fees recommended
    case high = 2
    /// Extreme congestion - maximum fees recommended
    case extreme = 3
}
