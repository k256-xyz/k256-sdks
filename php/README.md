# K256 PHP SDK

Official PHP SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Packagist Version](https://img.shields.io/packagist/v/k256/sdk.svg)](https://packagist.org/packages/k256/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
composer require k256/sdk
```

## Quick Start

```php
<?php

require 'vendor/autoload.php';

use K256\K256Client;
use K256\Types\{PoolUpdate, FeeMarket, Blockhash};

$client = new K256Client(apiKey: $_ENV['K256_API_KEY']);

$client->onPoolUpdate(function (PoolUpdate $update) {
    echo "Pool {$update->poolAddress}: slot={$update->slot}\n";
});

$client->onFeeMarket(function (FeeMarket $fees) {
    echo "Recommended fee: {$fees->recommended} microlamports\n";
});

$client->onBlockhash(function (Blockhash $bh) {
    echo "Blockhash: {$bh->blockhash} (slot {$bh->slot})\n";
});

$client->onError(function (string $err) {
    echo "Error: {$err}\n";
});

$client->connect();
$client->subscribe(['pools', 'priority_fees', 'blockhash']);
```

## Module Structure

```
K256\
├── K256Client        # WebSocket client
├── Decoder           # Binary message decoder
├── MessageType       # Message type constants
├── Types\
│   ├── PoolUpdate    # Pool state update
│   ├── FeeMarket     # Fee market
│   ├── Blockhash     # Recent blockhash
│   ├── Quote         # Swap quote
│   └── ...
└── Utils\
    └── Base58        # Base58 encoding
```

## Requirements

- PHP 8.1+
- GMP extension (for Base58)

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
