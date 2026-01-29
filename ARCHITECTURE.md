# K256 SDK Architecture

This document defines the cross-language conventions for all K256 SDKs. **All SDKs MUST follow these patterns** to ensure consistency for developers working across multiple languages.

## Table of Contents

- [Package Names](#package-names)
- [Module Structure](#module-structure)
- [Type Names](#type-names)
- [Function Names](#function-names)
- [Message Types](#message-types)
- [Binary Wire Format](#binary-wire-format)
- [WebSocket Protocol](#websocket-protocol)
- [Error Handling](#error-handling)

---

## Package Names

| Language | Package/Module Name | Import Statement |
|----------|---------------------|------------------|
| TypeScript | `@k256/sdk` | `import { ... } from '@k256/sdk'` |
| Go | `github.com/quiknode-labs/k256-sdk-go` | `import k256 "github.com/quiknode-labs/k256-sdk-go"` |
| Python | `k256-sdk` (PyPI) | `from k256 import ...` |
| Rust | `k256-sdk` (crates.io) | `use k256_sdk::...` |

---

## Module Structure

All SDKs MUST have the same module/package structure:

```
k256-sdk-{lang}/
├── ws/                 # WebSocket client and binary decoder
│   ├── client          # WebSocket connection management
│   ├── decoder         # Binary message decoder
│   └── types           # WS-specific types (if needed)
├── api/                # REST API client
│   ├── client          # HTTP client with retry logic
│   ├── quote           # /v1/quote endpoint
│   ├── swap            # /v1/swap endpoint
│   └── tokens          # /v1/tokens endpoint
├── types/              # Shared type definitions
│   ├── pool            # Pool, PoolUpdate
│   ├── token           # Token
│   ├── quote           # Quote, SwapInstruction
│   └── order           # OrderLevel, OrderBook
└── utils/              # Utility functions
    ├── base58          # Base58 encode/decode
    └── pubkey          # Solana pubkey validation
```

---

## Type Names

Type names are **language-agnostic** (same concept, same name). Only casing follows language conventions.

### Core Types

| Concept | TypeScript | Go | Python | Rust |
|---------|------------|-----|--------|------|
| Pool state update | `PoolUpdate` | `PoolUpdate` | `PoolUpdate` | `PoolUpdate` |
| Priority fees | `PriorityFees` | `PriorityFees` | `PriorityFees` | `PriorityFees` |
| Recent blockhash | `Blockhash` | `Blockhash` | `Blockhash` | `Blockhash` |
| Swap quote | `Quote` | `Quote` | `Quote` | `Quote` |
| Token metadata | `Token` | `Token` | `Token` | `Token` |
| DEX pool | `Pool` | `Pool` | `Pool` | `Pool` |
| Order book level | `OrderLevel` | `OrderLevel` | `OrderLevel` | `OrderLevel` |
| Heartbeat stats | `Heartbeat` | `Heartbeat` | `Heartbeat` | `Heartbeat` |

### DO NOT Use These Names

| Wrong | Correct | Reason |
|-------|---------|--------|
| `PoolUpdateMessage` | `PoolUpdate` | Redundant suffix |
| `PriorityFeesData` | `PriorityFees` | Redundant suffix |
| `QuoteResponse` | `Quote` | "Response" is context-dependent |
| `TokenInfo` | `Token` | "Info" is vague |
| `PoolState` | `Pool` | "State" is implementation detail |

---

## Function Names

Function names follow each language's conventions but represent the **same operations**.

### WebSocket Functions

| Operation | TypeScript | Go | Python | Rust |
|-----------|------------|-----|--------|------|
| Create WebSocket | `createWebSocket()` | `NewWebSocket()` | `create_websocket()` | `WebSocket::new()` |
| Decode binary message | `decodeMessage()` | `DecodeMessage()` | `decode_message()` | `decode_message()` |
| Subscribe to channels | `subscribe()` | `Subscribe()` | `subscribe()` | `subscribe()` |
| Unsubscribe | `unsubscribe()` | `Unsubscribe()` | `unsubscribe()` | `unsubscribe()` |

### API Functions

| Operation | TypeScript | Go | Python | Rust |
|-----------|------------|-----|--------|------|
| Create API client | `createClient()` | `NewClient()` | `create_client()` | `Client::new()` |
| Get quote | `getQuote()` | `GetQuote()` | `get_quote()` | `get_quote()` |
| Get swap instructions | `getSwap()` | `GetSwap()` | `get_swap()` | `get_swap()` |
| Search tokens | `searchTokens()` | `SearchTokens()` | `search_tokens()` | `search_tokens()` |

### Utility Functions

| Operation | TypeScript | Go | Python | Rust |
|-----------|------------|-----|--------|------|
| Encode base58 | `base58Encode()` | `Base58Encode()` | `base58_encode()` | `base58_encode()` |
| Decode base58 | `base58Decode()` | `Base58Decode()` | `base58_decode()` | `base58_decode()` |
| Validate pubkey | `isValidPubkey()` | `IsValidPubkey()` | `is_valid_pubkey()` | `is_valid_pubkey()` |

---

## Message Types

WebSocket message types are identified by a single byte prefix. **All SDKs MUST use these exact values.**

```
// Message Type Constants (hex values)
POOL_UPDATE       = 0x01  // Server → Client: Single pool update
SUBSCRIBE         = 0x02  // Client → Server: Subscribe request (JSON)
SUBSCRIBED        = 0x03  // Server → Client: Subscription confirmed (JSON)
UNSUBSCRIBE       = 0x04  // Client → Server: Unsubscribe all
PRIORITY_FEES     = 0x05  // Server → Client: Priority fee update
BLOCKHASH         = 0x06  // Server → Client: Recent blockhash
QUOTE             = 0x07  // Server → Client: Streaming quote update
QUOTE_SUBSCRIBED  = 0x08  // Server → Client: Quote subscription confirmed
SUBSCRIBE_QUOTE   = 0x09  // Client → Server: Subscribe to quote stream
UNSUBSCRIBE_QUOTE = 0x0A  // Client → Server: Unsubscribe from quote
PING              = 0x0B  // Client → Server: Ping (keepalive)
PONG              = 0x0C  // Server → Client: Pong response
HEARTBEAT         = 0x0D  // Server → Client: Connection stats (JSON)
POOL_UPDATE_BATCH = 0x0E  // Server → Client: Batched pool updates
ERROR             = 0xFF  // Server → Client: Error message (UTF-8)
```

### Language-Specific Constants

**TypeScript:**
```typescript
export const MessageType = {
  PoolUpdate: 0x01,
  Subscribe: 0x02,
  Subscribed: 0x03,
  // ...
} as const;
```

**Go:**
```go
const (
    MessageTypePoolUpdate      = 0x01
    MessageTypeSubscribe       = 0x02
    MessageTypeSubscribed      = 0x03
    // ...
)
```

**Python:**
```python
class MessageType:
    POOL_UPDATE = 0x01
    SUBSCRIBE = 0x02
    SUBSCRIBED = 0x03
    # ...
```

**Rust:**
```rust
#[repr(u8)]
pub enum MessageType {
    PoolUpdate = 0x01,
    Subscribe = 0x02,
    Subscribed = 0x03,
    // ...
}
```

---

## Binary Wire Format

### General Format

All binary messages follow this structure:
```
[1 byte: MessageType][N bytes: Payload]
```

### PoolUpdateBatch (0x0E)

High-throughput batched pool updates:
```
[0x0E][u16 count LE][u32 len1 LE][payload1][u32 len2 LE][payload2]...
```

- `count`: Number of updates in batch (little-endian u16)
- `lenN`: Length of each payload (little-endian u32)
- `payloadN`: Bincode-encoded PoolUpdate (WITHOUT the 0x01 type prefix)

### PoolUpdate Payload (bincode)

```
Field                   Type              Description
─────────────────────────────────────────────────────────────
serialized_state        Bytes             Opaque pool state (u64 len + bytes)
sequence                u64               Global sequence number
slot                    u64               Solana slot
write_version           u64               Write version within slot
protocol_name           String            DEX name (u64 len + UTF-8)
pool_address            [u8; 32]          Pool pubkey
all_token_mints         Vec<[u8; 32]>     Token mints (u64 len + n*32)
all_token_balances      Vec<u64>          Token balances (u64 len + n*8)
all_token_decimals      Vec<i32>          Token decimals (u64 len + n*4)
is_valid                bool              Pool validity flag
best_bid                Option<OrderLevel> Best bid (0=None, 1+data=Some)
best_ask                Option<OrderLevel> Best ask (0=None, 1+data=Some)
```

### OrderLevel (bincode)

```
Field     Type    Description
──────────────────────────────
price     u64     Price in base units
size      u64     Size in base units
```

### PriorityFees Payload (bincode)

Full wire format from K2 (119 bytes):

```
Offset  Field              Type    Description
──────────────────────────────────────────────────────────────────
0       slot               u64     Current slot
8       timestamp_ms       u64     Unix timestamp (ms)
16      recommended        u64     Recommended fee (microlamports)
24      state              u8      Network state (0=low, 1=normal, 2=high, 3=extreme)
25      is_stale           bool    Data staleness flag
26      swap_p50           u64     50th percentile swap fee (≥50K CU txns)
34      swap_p75           u64     75th percentile
42      swap_p90           u64     90th percentile
50      swap_p99           u64     99th percentile
58      swap_samples       u32     Number of samples used
62      landing_p50_fee    u64     Fee to land with 50% probability
70      landing_p75_fee    u64     Fee to land with 75% probability
78      landing_p90_fee    u64     Fee to land with 90% probability
86      landing_p99_fee    u64     Fee to land with 99% probability
94      top_10_fee         u64     Fee at top 10% tier
102     top_25_fee         u64     Fee at top 25% tier
110     spike_detected     bool    True if fee spike detected
111     spike_fee          u64     Fee during spike condition
```

### Blockhash Payload (bincode)

```
Field                    Type       Description
──────────────────────────────────────────────────
slot                     u64        Slot of blockhash
timestamp_ms             u64        Unix timestamp (ms)
blockhash                [u8; 32]   Recent blockhash bytes
block_height             u64        Block height
last_valid_block_height  u64        Last valid block height
is_stale                 bool       Data staleness flag
```

---

## WebSocket Protocol

### Connection

```
URL: wss://gateway.k256.xyz/v1/ws?apiKey={API_KEY}
```

Or with header:
```
URL: wss://gateway.k256.xyz/v1/ws
Header: X-API-Key: {API_KEY}
```

### Subscribe Request

```json
{
  "type": "subscribe",
  "channels": ["pools", "priority_fees", "blockhash"],
  "format": "json",  // Optional: "json" or omit for binary (default)
  "protocols": ["Raydium CLMM", "Orca Whirlpool"],  // Optional filter
  "pools": ["PoolAddress1", "PoolAddress2"],        // Optional filter
  "token_pairs": [["MintA", "MintB"]]               // Optional filter
}
```

### Format Modes

| Mode | Request | Response Format |
|------|---------|-----------------|
| Binary (default) | No `format` field or `format: "binary"` | Raw binary messages |
| JSON | `format: "json"` | JSON-encoded messages |

**Binary mode** is recommended for backend services (lower latency, smaller payloads).
**JSON mode** is for browser clients or debugging.

---

## Error Handling

### Error Message (0xFF)

```
[0xFF][UTF-8 error message]
```

### WebSocket Close Codes

SDKs MUST handle these close codes appropriately:

| Code | Name | Client Action |
|------|------|---------------|
| 1000 | Normal | Clean close, no action needed |
| 1001 | Going Away | Reconnect immediately |
| 1002 | Protocol Error | Fix client code |
| 1003 | Unsupported Data | Use binary protocol |
| 1008 | Policy Violation | Check rate limits |
| 1013 | Try Again Later | Reconnect with backoff |

### Reconnection Strategy

All SDKs SHOULD implement automatic reconnection with exponential backoff:

```
Initial delay: 1 second
Max delay: 60 seconds
Backoff multiplier: 2
Jitter: 0-500ms random
```

---

## Development Status

| SDK | Status | Notes |
|-----|--------|-------|
| TypeScript | **In Development** | Located at `k256-app-dashboard/lib/k256-sdk/` |
| Go | Planned | Stub at `k256-sdks/go/` |
| Python | Planned | Stub at `k256-sdks/python/` |
| Rust | Planned | Stub at `k256-sdks/rust/` |

When TypeScript SDK is ready for npm publish, it will be extracted to `k256-sdks/typescript/` and published as `@k256/sdk`.
