# K256 Java SDK

Official Java SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Maven Central](https://img.shields.io/maven-central/v/xyz.k256/sdk.svg)](https://search.maven.org/artifact/xyz.k256/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

### Maven

```xml
<dependency>
    <groupId>xyz.k256</groupId>
    <artifactId>sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'xyz.k256:sdk:0.1.0'
```

## Quick Start

```java
import xyz.k256.sdk.ws.K256WebSocketClient;
import xyz.k256.sdk.types.*;

import java.util.List;

public class Example {
    public static void main(String[] args) {
        K256WebSocketClient client = new K256WebSocketClient.Builder()
            .apiKey(System.getenv("K256_API_KEY"))
            .onPoolUpdate(update -> {
                System.out.printf("Pool %s: slot=%d%n",
                    update.poolAddress(), update.slot());
            })
            .onFeeMarket(fees -> {
                System.out.printf("Recommended fee: %d microlamports%n",
                    fees.recommended());
            })
            .onBlockhash(bh -> {
                System.out.printf("Blockhash: %s (slot %d)%n",
                    bh.blockhash(), bh.slot());
            })
            .onError(err -> System.err.println("Error: " + err))
            .build();

        client.start();
        client.subscribe(List.of("pools", "priority_fees", "blockhash"));

        // Keep running
        Runtime.getRuntime().addShutdownHook(new Thread(client::stop));
    }
}
```

## Module Structure

```
xyz.k256.sdk/
├── ws/
│   ├── K256WebSocketClient   # WebSocket client
│   └── MessageDecoder        # Binary message decoder
├── types/
│   ├── PoolUpdate           # Pool state update
│   ├── FeeMarket            # Per-writable-account fee market
│   ├── Blockhash            # Recent blockhash
│   ├── Quote                # Swap quote
│   └── ...
└── utils/
    └── Base58               # Base58 encoding
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
