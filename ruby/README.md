# K256 Ruby SDK

Official Ruby SDK for [K256](https://k256.xyz) - the gateway to decentralized finance.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

[![Gem Version](https://badge.fury.io/rb/k256-sdk.svg)](https://badge.fury.io/rb/k256-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

Add to your Gemfile:

```ruby
gem 'k256-sdk'
```

Or install directly:

```bash
gem install k256-sdk
```

## Quick Start

```ruby
require 'k256'

client = K256::Client.new(api_key: ENV['K256_API_KEY'])

client.on_pool_update do |update|
  puts "Pool #{update.pool_address}: slot=#{update.slot}"
end

client.on_priority_fees do |fees|
  puts "Recommended fee: #{fees.recommended} microlamports"
end

client.on_blockhash do |bh|
  puts "Blockhash: #{bh.blockhash} (slot #{bh.slot})"
end

client.on_error do |err|
  puts "Error: #{err}"
end

client.connect
client.subscribe(channels: ['pools', 'priority_fees', 'blockhash'])

# Keep running
sleep
```

## Module Structure

```
K256
├── Client          # WebSocket client
├── Decoder         # Binary message decoder
├── Base58          # Base58 encoding utilities
├── MessageType     # Message type constants
├── PoolUpdate      # Pool state update struct
├── PriorityFees    # Priority fees struct
├── Blockhash       # Blockhash struct
└── Quote           # Quote struct
```

## Architecture

This SDK follows the cross-language conventions defined in [ARCHITECTURE.md](../ARCHITECTURE.md).

## License

MIT
