# K256 Swift SDK

Official Swift SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Swift 5.9+](https://img.shields.io/badge/Swift-5.9+-orange.svg)](https://swift.org)
[![Platforms](https://img.shields.io/badge/Platforms-macOS%20|%20iOS%20|%20tvOS%20|%20watchOS-lightgray.svg)](https://swift.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/k256-xyz/k256-sdks.git", from: "0.1.0")
]
```

Or add via Xcode: File → Add Package Dependencies → Enter URL:
```
https://github.com/k256-xyz/k256-sdks.git
```

## Quick Start

```swift
import K256SDK

// Decode priority fees from binary payload
if let fees = K256Decoder.decodePriorityFees(payload) {
    print("Slot: \(fees.slot)")
    print("Recommended fee: \(fees.recommended) microlamports")
    print("Network state: \(fees.state)")
}

// Decode blockhash
if let bh = K256Decoder.decodeBlockhash(payload) {
    print("Blockhash: \(bh.blockhash)")
    print("Block height: \(bh.blockHeight)")
}

// Base58 encoding
let address = Base58.encode(pubkeyBytes)
if Base58.isValidPubkey(address) {
    print("Valid pubkey: \(address)")
}
```

## Module Structure

```
K256/
├── K256.swift              # Main module exports
├── Decoder.swift           # Binary message decoder
├── Types/
│   ├── MessageType.swift   # Message type enum
│   ├── NetworkState.swift  # Network state enum
│   ├── PoolUpdate.swift    # Pool state update
│   ├── PriorityFees.swift  # Priority fees struct
│   ├── Blockhash.swift     # Recent blockhash struct
│   ├── Quote.swift         # Swap quote struct
│   ├── OrderLevel.swift    # Order level struct
│   ├── Token.swift         # Token struct
│   └── Heartbeat.swift     # Heartbeat struct
└── Utils/
    └── Base58.swift        # Base58 encoding utilities
```

> **Note:** This SDK provides binary message decoders and types. For WebSocket client functionality, use a Swift networking library like URLSession or Starscream.

## Platforms

- macOS 12+
- iOS 15+
- tvOS 15+
- watchOS 8+

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
