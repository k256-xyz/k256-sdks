package k256

// MessageType represents WebSocket binary message type identifiers.
type MessageType uint8

const (
	// MessageTypePoolUpdate is Server → Client: Single pool update
	MessageTypePoolUpdate MessageType = 0x01
	// MessageTypeSubscribe is Client → Server: Subscribe request (JSON)
	MessageTypeSubscribe MessageType = 0x02
	// MessageTypeSubscribed is Server → Client: Subscription confirmed (JSON)
	MessageTypeSubscribed MessageType = 0x03
	// MessageTypeUnsubscribe is Client → Server: Unsubscribe all
	MessageTypeUnsubscribe MessageType = 0x04
	// MessageTypePriorityFees is Server → Client: Priority fee update
	MessageTypePriorityFees MessageType = 0x05
	// MessageTypeBlockhash is Server → Client: Recent blockhash
	MessageTypeBlockhash MessageType = 0x06
	// MessageTypeQuote is Server → Client: Streaming quote update
	MessageTypeQuote MessageType = 0x07
	// MessageTypeQuoteSubscribed is Server → Client: Quote subscription confirmed
	MessageTypeQuoteSubscribed MessageType = 0x08
	// MessageTypeSubscribeQuote is Client → Server: Subscribe to quote stream
	MessageTypeSubscribeQuote MessageType = 0x09
	// MessageTypeUnsubscribeQuote is Client → Server: Unsubscribe from quote
	MessageTypeUnsubscribeQuote MessageType = 0x0A
	// MessageTypePing is Client → Server: Ping (keepalive)
	MessageTypePing MessageType = 0x0B
	// MessageTypePong is Server → Client: Pong response
	MessageTypePong MessageType = 0x0C
	// MessageTypeHeartbeat is Server → Client: Connection stats (JSON)
	MessageTypeHeartbeat MessageType = 0x0D
	// MessageTypePoolUpdateBatch is Server → Client: Batched pool updates
	MessageTypePoolUpdateBatch MessageType = 0x0E
	// MessageTypeError is Server → Client: Error message (UTF-8)
	MessageTypeError MessageType = 0xFF
)

// NetworkState represents network congestion state.
type NetworkState uint8

const (
	// NetworkStateLow is low congestion - minimal fees needed
	NetworkStateLow NetworkState = 0
	// NetworkStateNormal is normal congestion
	NetworkStateNormal NetworkState = 1
	// NetworkStateHigh is high congestion - higher fees recommended
	NetworkStateHigh NetworkState = 2
	// NetworkStateExtreme is extreme congestion - maximum fees recommended
	NetworkStateExtreme NetworkState = 3
)

// OrderLevel represents an order book level with price and size.
type OrderLevel struct {
	// Price in base units
	Price uint64 `json:"price"`
	// Size in base units
	Size uint64 `json:"size"`
}

// PoolUpdate represents a real-time pool state update from K256 WebSocket.
type PoolUpdate struct {
	// Global sequence number for ordering
	Sequence uint64 `json:"sequence"`
	// Solana slot number
	Slot uint64 `json:"slot"`
	// Write version within slot
	WriteVersion uint64 `json:"write_version"`
	// DEX protocol name (e.g., "RaydiumClmm", "Whirlpool")
	ProtocolName string `json:"protocol_name"`
	// Base58-encoded pool address
	PoolAddress string `json:"pool_address"`
	// List of token mint addresses
	TokenMints []string `json:"token_mints"`
	// List of token balances (same order as mints)
	TokenBalances []uint64 `json:"token_balances"`
	// List of token decimals (same order as mints)
	TokenDecimals []int32 `json:"token_decimals"`
	// Best bid order level, if available
	BestBid *OrderLevel `json:"best_bid,omitempty"`
	// Best ask order level, if available
	BestAsk *OrderLevel `json:"best_ask,omitempty"`
	// Opaque pool state bytes
	SerializedState []byte `json:"serialized_state"`
}

// Pool represents DEX pool metadata.
type Pool struct {
	// Base58-encoded pool address
	Address string `json:"address"`
	// DEX protocol name
	Protocol string `json:"protocol"`
	// First token mint address
	TokenAMint string `json:"token_a_mint"`
	// Second token mint address
	TokenBMint string `json:"token_b_mint"`
	// First token vault address
	TokenAVault string `json:"token_a_vault"`
	// Second token vault address
	TokenBVault string `json:"token_b_vault"`
	// Fee rate in basis points
	FeeRate uint32 `json:"fee_rate"`
}

// AccountFee represents per-writable-account fee data from K256.
// Solana's scheduler limits each writable account to 12M CU per block.
// Fee pricing is per-account: max(p75(account) for account in writable_accounts).
type AccountFee struct {
	// Base58-encoded account public key
	Pubkey string `json:"pubkey"`
	// Total transactions touching this account in the window
	TotalTxs uint32 `json:"total_txs"`
	// Number of slots where this account was active
	ActiveSlots uint32 `json:"active_slots"`
	// Total CU consumed by transactions touching this account
	CuConsumed uint64 `json:"cu_consumed"`
	// Account utilization percentage (0-100) of 12M CU limit
	UtilizationPct float32 `json:"utilization_pct"`
	// 25th percentile fee in microlamports/CU
	P25 uint64 `json:"p25"`
	// 50th percentile fee in microlamports/CU
	P50 uint64 `json:"p50"`
	// 75th percentile fee in microlamports/CU
	P75 uint64 `json:"p75"`
	// 90th percentile fee in microlamports/CU
	P90 uint64 `json:"p90"`
	// Minimum non-zero fee observed
	MinNonzeroPrice uint64 `json:"min_nonzero_price"`
}

// FeeMarket represents a fee market update from K256 (per-writable-account model).
type FeeMarket struct {
	// Current Solana slot
	Slot uint64 `json:"slot"`
	// Unix timestamp in milliseconds
	TimestampMs uint64 `json:"timestamp_ms"`
	// Recommended fee in microlamports/CU (max p75 across hottest accounts)
	Recommended uint64 `json:"recommended"`
	// Network congestion state
	State NetworkState `json:"state"`
	// Whether data may be stale
	IsStale bool `json:"is_stale"`
	// Block utilization percentage (0-100)
	BlockUtilizationPct float32 `json:"block_utilization_pct"`
	// Number of blocks in the observation window
	BlocksInWindow uint32 `json:"blocks_in_window"`
	// Per-account fee data
	Accounts []AccountFee `json:"accounts"`
}

// Blockhash represents a recent blockhash from K256.
type Blockhash struct {
	// Solana slot of the blockhash
	Slot uint64 `json:"slot"`
	// Unix timestamp in milliseconds
	TimestampMs uint64 `json:"timestamp_ms"`
	// Base58-encoded recent blockhash
	Blockhash string `json:"blockhash"`
	// Block height
	BlockHeight uint64 `json:"block_height"`
	// Last valid block height for transactions
	LastValidBlockHeight uint64 `json:"last_valid_block_height"`
	// Whether data may be stale
	IsStale bool `json:"is_stale"`
}

// Quote represents a swap quote from K256.
type Quote struct {
	// Input token mint address
	InputMint string `json:"input_mint"`
	// Output token mint address
	OutputMint string `json:"output_mint"`
	// Input amount in base units
	InAmount uint64 `json:"in_amount"`
	// Output amount in base units
	OutAmount uint64 `json:"out_amount"`
	// Price impact percentage
	PriceImpactPct float64 `json:"price_impact_pct"`
	// Solana slot of the quote
	Slot uint64 `json:"slot"`
	// Unix timestamp in milliseconds
	TimestampMs uint64 `json:"timestamp_ms"`
	// List of route steps
	RoutePlan []map[string]interface{} `json:"route_plan"`
	// Minimum output (or max input for exactOut)
	OtherAmountThreshold *uint64 `json:"other_amount_threshold,omitempty"`
	// "ExactIn" or "ExactOut"
	SwapMode string `json:"swap_mode"`
}

// Token represents token metadata.
type Token struct {
	// Token mint address
	Address string `json:"address"`
	// Token symbol (e.g., "SOL", "USDC")
	Symbol string `json:"symbol"`
	// Token name
	Name string `json:"name"`
	// Token decimals
	Decimals uint8 `json:"decimals"`
	// URL to token logo
	LogoURI *string `json:"logo_uri,omitempty"`
	// List of tags
	Tags []string `json:"tags,omitempty"`
	// Additional metadata
	Extensions map[string]interface{} `json:"extensions,omitempty"`
}

// Heartbeat represents a connection heartbeat with stats.
type Heartbeat struct {
	// Unix timestamp in milliseconds
	TimestampMs uint64 `json:"timestamp_ms"`
	// Connection uptime in seconds
	UptimeSeconds uint64 `json:"uptime_seconds"`
	// Total messages received
	MessagesReceived uint64 `json:"messages_received"`
	// Total messages sent
	MessagesSent uint64 `json:"messages_sent"`
	// Number of active subscriptions
	Subscriptions uint32 `json:"subscriptions"`
}
