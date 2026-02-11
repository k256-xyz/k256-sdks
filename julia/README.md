# K256 Julia SDK

Official Julia SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Julia 1.9+](https://img.shields.io/badge/Julia-1.9+-blueviolet.svg)](https://julialang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```julia
using Pkg
Pkg.add(url="https://github.com/k256-xyz/k256-sdks", subdir="julia")
```

Or in the package REPL (press `]`):
```
add https://github.com/k256-xyz/k256-sdks#julia
```

## Quick Start

```julia
using K256

# Decode fee market from binary payload
fees = K256.decode_fee_market(payload)
if fees !== nothing
    println("Slot: $(fees.slot)")
    println("Recommended fee: $(fees.recommended) microlamports")
    println("Network state: $(fees.state)")
    println("Accounts: $(length(fees.accounts))")
end

# Decode blockhash
bh = K256.decode_blockhash(payload)
if bh !== nothing
    println("Blockhash: $(bh.blockhash)")
    println("Block height: $(bh.block_height)")
end

# Base58 encoding
address = K256.base58_encode(pubkey_bytes)
if K256.is_valid_pubkey(address)
    println("Valid pubkey: $address")
end
```

## Module Structure

```
K256
├── MessageType       # Message type constants
├── NetworkState      # Network state constants
├── Types
│   ├── PoolUpdate    # Pool state update
│   ├── FeeMarket     # Fee market
│   ├── Blockhash     # Recent blockhash
│   ├── Quote         # Swap quote
│   └── ...
├── Decoder           # Binary message decoder
└── Base58            # Base58 encoding utilities
```

## Exported Functions

### Decoding

- `decode_fee_market(data)` - Decode fee market
- `decode_blockhash(data)` - Decode blockhash
- `decode_pool_update(data)` - Decode single pool update
- `decode_pool_update_batch(data)` - Decode batch of pool updates
- `decode_quote(data)` - Decode quote

### Utilities

- `base58_encode(bytes)` - Encode bytes to Base58
- `base58_decode(str)` - Decode Base58 to bytes
- `is_valid_pubkey(address)` - Validate Solana address

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
