package k256

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"

	"github.com/mr-tron/base58"
)

// DecodePoolUpdate decodes a single pool update from bincode format.
func DecodePoolUpdate(data []byte) (*PoolUpdate, error) {
	if len(data) < 8 {
		return nil, fmt.Errorf("payload too short for state length")
	}

	offset := 0

	// serialized_state: Bytes (u64 len + bytes)
	stateLen := binary.LittleEndian.Uint64(data[offset:])
	offset += 8
	if offset+int(stateLen) > len(data) {
		return nil, fmt.Errorf("insufficient data for serialized_state")
	}
	serializedState := make([]byte, stateLen)
	copy(serializedState, data[offset:offset+int(stateLen)])
	offset += int(stateLen)

	// sequence: u64
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for sequence")
	}
	sequence := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	// slot: u64
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for slot")
	}
	slot := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	// write_version: u64
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for write_version")
	}
	writeVersion := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	// protocol_name: String (u64 len + UTF-8)
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for protocol_name length")
	}
	nameLen := binary.LittleEndian.Uint64(data[offset:])
	offset += 8
	if offset+int(nameLen) > len(data) {
		return nil, fmt.Errorf("insufficient data for protocol_name")
	}
	protocolName := string(data[offset : offset+int(nameLen)])
	offset += int(nameLen)

	// pool_address: [u8; 32]
	if offset+32 > len(data) {
		return nil, fmt.Errorf("insufficient data for pool_address")
	}
	poolAddress := base58.Encode(data[offset : offset+32])
	offset += 32

	// all_token_mints: Vec<[u8; 32]>
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_mints count")
	}
	numMints := binary.LittleEndian.Uint64(data[offset:])
	offset += 8
	if offset+int(numMints)*32 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_mints")
	}
	tokenMints := make([]string, numMints)
	for i := uint64(0); i < numMints; i++ {
		tokenMints[i] = base58.Encode(data[offset : offset+32])
		offset += 32
	}

	// all_token_balances: Vec<u64>
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_balances count")
	}
	numBalances := binary.LittleEndian.Uint64(data[offset:])
	offset += 8
	if offset+int(numBalances)*8 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_balances")
	}
	tokenBalances := make([]uint64, numBalances)
	for i := uint64(0); i < numBalances; i++ {
		tokenBalances[i] = binary.LittleEndian.Uint64(data[offset:])
		offset += 8
	}

	// all_token_decimals: Vec<i32>
	if offset+8 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_decimals count")
	}
	numDecimals := binary.LittleEndian.Uint64(data[offset:])
	offset += 8
	if offset+int(numDecimals)*4 > len(data) {
		return nil, fmt.Errorf("insufficient data for token_decimals")
	}
	tokenDecimals := make([]int32, numDecimals)
	for i := uint64(0); i < numDecimals; i++ {
		tokenDecimals[i] = int32(binary.LittleEndian.Uint32(data[offset:]))
		offset += 4
	}

	// best_bid: Option<OrderLevel>
	if offset >= len(data) {
		return nil, fmt.Errorf("insufficient data for best_bid option")
	}
	var bestBid *OrderLevel
	if data[offset] == 1 {
		offset++
		if offset+16 > len(data) {
			return nil, fmt.Errorf("insufficient data for best_bid")
		}
		bestBid = &OrderLevel{
			Price: binary.LittleEndian.Uint64(data[offset:]),
			Size:  binary.LittleEndian.Uint64(data[offset+8:]),
		}
		offset += 16
	} else {
		offset++
	}

	// best_ask: Option<OrderLevel>
	if offset >= len(data) {
		return nil, fmt.Errorf("insufficient data for best_ask option")
	}
	var bestAsk *OrderLevel
	if data[offset] == 1 {
		offset++
		if offset+16 > len(data) {
			return nil, fmt.Errorf("insufficient data for best_ask")
		}
		bestAsk = &OrderLevel{
			Price: binary.LittleEndian.Uint64(data[offset:]),
			Size:  binary.LittleEndian.Uint64(data[offset+8:]),
		}
		offset += 16
	} else {
		offset++
	}
	_ = offset // Final offset not used but maintained for consistency

	return &PoolUpdate{
		Sequence:        sequence,
		Slot:            slot,
		WriteVersion:    writeVersion,
		ProtocolName:    protocolName,
		PoolAddress:     poolAddress,
		TokenMints:      tokenMints,
		TokenBalances:   tokenBalances,
		TokenDecimals:   tokenDecimals,
		BestBid:         bestBid,
		BestAsk:         bestAsk,
		SerializedState: serializedState,
	}, nil
}

// DecodePoolUpdateBatch decodes a batch of pool updates.
func DecodePoolUpdateBatch(data []byte) ([]*PoolUpdate, error) {
	if len(data) < 2 {
		return nil, fmt.Errorf("payload too short for batch count")
	}

	offset := 0

	// count: u16 LE
	count := binary.LittleEndian.Uint16(data[offset:])
	offset += 2

	updates := make([]*PoolUpdate, 0, count)
	for i := uint16(0); i < count; i++ {
		// length: u32 LE
		if offset+4 > len(data) {
			return nil, fmt.Errorf("insufficient data for update %d length", i)
		}
		length := binary.LittleEndian.Uint32(data[offset:])
		offset += 4

		// payload (without type byte)
		if offset+int(length) > len(data) {
			return nil, fmt.Errorf("insufficient data for update %d payload", i)
		}
		update, err := DecodePoolUpdate(data[offset : offset+int(length)])
		if err != nil {
			return nil, fmt.Errorf("error decoding update %d: %w", i, err)
		}
		updates = append(updates, update)
		offset += int(length)
	}

	return updates, nil
}

// DecodeFeeMarket decodes fee market from bincode format (variable length).
// Header: 42 bytes. Per account: 92 bytes each.
func DecodeFeeMarket(data []byte) (*FeeMarket, error) {
	if len(data) < 42 {
		return nil, fmt.Errorf("payload too short: %d < 42", len(data))
	}

	slot := binary.LittleEndian.Uint64(data[0:])
	timestampMs := binary.LittleEndian.Uint64(data[8:])
	recommended := binary.LittleEndian.Uint64(data[16:])
	state := NetworkState(data[24])
	isStale := data[25] != 0
	blockUtilPct := math.Float32frombits(binary.LittleEndian.Uint32(data[26:]))
	blocksInWindow := binary.LittleEndian.Uint32(data[30:])
	accountCount := binary.LittleEndian.Uint64(data[34:])

	offset := 42
	accounts := make([]AccountFee, 0, accountCount)
	for i := uint64(0); i < accountCount; i++ {
		if offset+92 > len(data) {
			return nil, fmt.Errorf("insufficient data for account %d", i)
		}
		pubkey := base58.Encode(data[offset : offset+32])
		totalTxs := binary.LittleEndian.Uint32(data[offset+32:])
		activeSlots := binary.LittleEndian.Uint32(data[offset+36:])
		cuConsumed := binary.LittleEndian.Uint64(data[offset+40:])
		utilizationPct := math.Float32frombits(binary.LittleEndian.Uint32(data[offset+48:]))
		p25 := binary.LittleEndian.Uint64(data[offset+52:])
		p50 := binary.LittleEndian.Uint64(data[offset+60:])
		p75 := binary.LittleEndian.Uint64(data[offset+68:])
		p90 := binary.LittleEndian.Uint64(data[offset+76:])
		minNonzeroPrice := binary.LittleEndian.Uint64(data[offset+84:])

		accounts = append(accounts, AccountFee{
			Pubkey:          pubkey,
			TotalTxs:        totalTxs,
			ActiveSlots:     activeSlots,
			CuConsumed:      cuConsumed,
			UtilizationPct:  utilizationPct,
			P25:             p25,
			P50:             p50,
			P75:             p75,
			P90:             p90,
			MinNonzeroPrice: minNonzeroPrice,
		})
		offset += 92
	}

	return &FeeMarket{
		Slot:                slot,
		TimestampMs:         timestampMs,
		Recommended:         recommended,
		State:               state,
		IsStale:             isStale,
		BlockUtilizationPct: blockUtilPct,
		BlocksInWindow:      blocksInWindow,
		Accounts:            accounts,
	}, nil
}

// DecodeBlockhash decodes blockhash from bincode format.
func DecodeBlockhash(data []byte) (*Blockhash, error) {
	if len(data) < 65 {
		return nil, fmt.Errorf("payload too short")
	}

	offset := 0

	slot := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	timestampMs := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	blockhash := base58.Encode(data[offset : offset+32])
	offset += 32

	blockHeight := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	lastValidBlockHeight := binary.LittleEndian.Uint64(data[offset:])
	offset += 8

	isStale := data[offset] != 0

	return &Blockhash{
		Slot:                 slot,
		TimestampMs:          timestampMs,
		Blockhash:            blockhash,
		BlockHeight:          blockHeight,
		LastValidBlockHeight: lastValidBlockHeight,
		IsStale:              isStale,
	}, nil
}

// DecodeQuote decodes a quote message (JSON format).
func DecodeQuote(data []byte) (*Quote, error) {
	var quote Quote
	if err := json.Unmarshal(data, &quote); err != nil {
		return nil, fmt.Errorf("error decoding quote: %w", err)
	}
	return &quote, nil
}
