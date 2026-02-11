# K256 C++ SDK

Official C++ SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![C++20](https://img.shields.io/badge/C%2B%2B-20-blue.svg)](https://en.cppreference.com/w/cpp/20)

## Installation

### CMake FetchContent

```cmake
include(FetchContent)
FetchContent_Declare(
    k256-sdk
    GIT_REPOSITORY https://github.com/k256-xyz/k256-sdks.git
    GIT_TAG main
    SOURCE_SUBDIR cpp
)
FetchContent_MakeAvailable(k256-sdk)

target_link_libraries(your_target PRIVATE k256::k256-sdk)
```

### Manual Installation

```bash
cd k256-sdks/cpp
mkdir build && cd build
cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local
cmake --build .
cmake --install .
```

## Quick Start

```cpp
#include <k256/k256.hpp>
#include <iostream>

int main() {
    // Example: Decode fee market from binary payload
    std::vector<uint8_t> payload = /* received from WebSocket */;

    auto fees = k256::decode_fee_market(payload.data(), payload.size());
    if (fees) {
        std::cout << "Slot: " << fees->slot << std::endl;
        std::cout << "Recommended fee: " << fees->recommended << " microlamports" << std::endl;
        std::cout << "Network state: " << static_cast<int>(fees->state) << std::endl;
        std::cout << "Accounts: " << fees->accounts.size() << std::endl;
    }

    // Example: Decode blockhash
    auto bh = k256::decode_blockhash(payload.data(), payload.size());
    if (bh) {
        std::cout << "Blockhash: " << bh->blockhash << std::endl;
        std::cout << "Block height: " << bh->block_height << std::endl;
    }

    // Example: Base58 encoding
    std::vector<uint8_t> pubkey(32, 0);
    std::string address = k256::base58_encode(pubkey);
    
    // Validate Solana address
    if (k256::is_valid_pubkey(address)) {
        std::cout << "Valid pubkey: " << address << std::endl;
    }

    return 0;
}
```

## Module Structure

```
k256/
├── k256.hpp      # Main header (include this)
├── types.hpp     # PoolUpdate, FeeMarket, AccountFee, Blockhash, etc.
├── decoder.hpp   # Binary message decoder
└── base58.hpp    # Base58 encoding utilities
```

## Message Types

```cpp
namespace k256 {
    enum class MessageType : uint8_t {
        PoolUpdate       = 0x01,
        Subscribe        = 0x02,
        Subscribed       = 0x03,
        Unsubscribe      = 0x04,
        PriorityFees     = 0x05,
        Blockhash        = 0x06,
        Quote            = 0x07,
        QuoteSubscribed  = 0x08,
        SubscribeQuote   = 0x09,
        UnsubscribeQuote = 0x0A,
        Ping             = 0x0B,
        Pong             = 0x0C,
        Heartbeat        = 0x0D,
        PoolUpdateBatch  = 0x0E,
        Error            = 0xFF
    };
}
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
