//! Binary message decoder for K256 WebSocket protocol.

use thiserror::Error;

use crate::types::{AccountFee, Blockhash, FeeMarket, MessageType, NetworkState, OrderLevel, PoolUpdate};
use crate::ws::client::DecodedMessage;

/// Decoder error types.
#[derive(Debug, Error)]
pub enum DecodeError {
    /// Payload is too short
    #[error("Payload too short: expected {expected}, got {actual}")]
    PayloadTooShort { expected: usize, actual: usize },

    /// Invalid UTF-8 string
    #[error("Invalid UTF-8: {0}")]
    InvalidUtf8(#[from] std::string::FromUtf8Error),

    /// Invalid message type
    #[error("Invalid message type: {0}")]
    InvalidMessageType(u8),

    /// Invalid network state
    #[error("Invalid network state: {0}")]
    InvalidNetworkState(u8),
}

/// Decode a binary WebSocket message.
///
/// # Arguments
///
/// * `msg_type` - Message type byte
/// * `payload` - Message payload (without type byte)
///
/// # Returns
///
/// Decoded message, or None for unhandled types
pub fn decode_message(msg_type: u8, payload: &[u8]) -> Result<Option<DecodedMessage>, DecodeError> {
    let msg_type = MessageType::try_from(msg_type).map_err(DecodeError::InvalidMessageType)?;

    match msg_type {
        MessageType::PoolUpdate => {
            let update = decode_pool_update(payload)?;
            Ok(Some(DecodedMessage::PoolUpdate(update)))
        }
        MessageType::PoolUpdateBatch => {
            let updates = decode_pool_update_batch(payload)?;
            Ok(Some(DecodedMessage::PoolUpdateBatch(updates)))
        }
        MessageType::PriorityFees => {
            let fees = decode_fee_market(payload)?;
            Ok(Some(DecodedMessage::FeeMarket(fees)))
        }
        MessageType::Blockhash => {
            let bh = decode_blockhash(payload)?;
            Ok(Some(DecodedMessage::Blockhash(bh)))
        }
        MessageType::Error => {
            let msg = String::from_utf8(payload.to_vec())?;
            Ok(Some(DecodedMessage::Error(msg)))
        }
        MessageType::Pong => Ok(None),
        _ => Ok(None),
    }
}

fn decode_pool_update(data: &[u8]) -> Result<PoolUpdate, DecodeError> {
    let mut offset = 0;

    // serialized_state: Bytes (u64 len + bytes)
    let state_len = read_u64(data, &mut offset)?;
    if offset + state_len as usize > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: offset + state_len as usize,
            actual: data.len(),
        });
    }
    let serialized_state = data[offset..offset + state_len as usize].to_vec();
    offset += state_len as usize;

    // sequence: u64
    let sequence = read_u64(data, &mut offset)?;

    // slot: u64
    let slot = read_u64(data, &mut offset)?;

    // write_version: u64
    let write_version = read_u64(data, &mut offset)?;

    // protocol_name: String (u64 len + UTF-8)
    let name_len = read_u64(data, &mut offset)?;
    if offset + name_len as usize > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: offset + name_len as usize,
            actual: data.len(),
        });
    }
    let protocol_name = String::from_utf8(data[offset..offset + name_len as usize].to_vec())?;
    offset += name_len as usize;

    // pool_address: [u8; 32]
    if offset + 32 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: offset + 32,
            actual: data.len(),
        });
    }
    let pool_address = bs58::encode(&data[offset..offset + 32]).into_string();
    offset += 32;

    // all_token_mints: Vec<[u8; 32]>
    let num_mints = read_u64(data, &mut offset)?;
    if offset + (num_mints as usize) * 32 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: offset + (num_mints as usize) * 32,
            actual: data.len(),
        });
    }
    let mut token_mints = Vec::with_capacity(num_mints as usize);
    for _ in 0..num_mints {
        token_mints.push(bs58::encode(&data[offset..offset + 32]).into_string());
        offset += 32;
    }

    // all_token_balances: Vec<u64>
    let num_balances = read_u64(data, &mut offset)?;
    let mut token_balances = Vec::with_capacity(num_balances as usize);
    for _ in 0..num_balances {
        token_balances.push(read_u64(data, &mut offset)?);
    }

    // all_token_decimals: Vec<i32>
    let num_decimals = read_u64(data, &mut offset)?;
    let mut token_decimals = Vec::with_capacity(num_decimals as usize);
    for _ in 0..num_decimals {
        token_decimals.push(read_i32(data, &mut offset)?);
    }

    // best_bid: Option<OrderLevel>
    let best_bid = decode_optional_order_level(data, &mut offset)?;

    // best_ask: Option<OrderLevel>
    let best_ask = decode_optional_order_level(data, &mut offset)?;

    Ok(PoolUpdate {
        sequence,
        slot,
        write_version,
        protocol_name,
        pool_address,
        token_mints,
        token_balances,
        token_decimals,
        best_bid,
        best_ask,
        serialized_state,
    })
}

fn decode_optional_order_level(data: &[u8], offset: &mut usize) -> Result<Option<OrderLevel>, DecodeError> {
    if *offset >= data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: *offset + 1,
            actual: data.len(),
        });
    }
    if data[*offset] == 0 {
        *offset += 1;
        return Ok(None);
    }

    *offset += 1;
    let price = read_u64(data, offset)?;
    let size = read_u64(data, offset)?;
    Ok(Some(OrderLevel { price, size }))
}

fn decode_pool_update_batch(data: &[u8]) -> Result<Vec<PoolUpdate>, DecodeError> {
    let mut offset = 0;

    // count: u16 LE
    let count = read_u16(data, &mut offset)?;

    let mut updates = Vec::with_capacity(count as usize);
    for _ in 0..count {
        // length: u32 LE
        let length = read_u32(data, &mut offset)?;

        // payload (without type byte)
        if offset + length as usize > data.len() {
            return Err(DecodeError::PayloadTooShort {
                expected: offset + length as usize,
                actual: data.len(),
            });
        }
        let update = decode_pool_update(&data[offset..offset + length as usize])?;
        updates.push(update);
        offset += length as usize;
    }

    Ok(updates)
}

fn decode_fee_market(data: &[u8]) -> Result<FeeMarket, DecodeError> {
    if data.len() < 42 {
        return Err(DecodeError::PayloadTooShort {
            expected: 42,
            actual: data.len(),
        });
    }

    let mut offset = 0;

    let slot = read_u64(data, &mut offset)?;
    let timestamp_ms = read_u64(data, &mut offset)?;
    let recommended = read_u64(data, &mut offset)?;
    let state = NetworkState::try_from(data[offset]).map_err(DecodeError::InvalidNetworkState)?;
    offset += 1;
    let is_stale = data[offset] != 0;
    offset += 1;
    let block_utilization_pct = f32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
    offset += 4;
    let blocks_in_window = read_u32(data, &mut offset)?;
    let account_count = read_u64(data, &mut offset)?;

    let mut accounts = Vec::with_capacity(account_count as usize);
    for _ in 0..account_count {
        if offset + 92 > data.len() {
            return Err(DecodeError::PayloadTooShort {
                expected: offset + 92,
                actual: data.len(),
            });
        }
        let pubkey = bs58::encode(&data[offset..offset + 32]).into_string();
        offset += 32;
        let total_txs = read_u32(data, &mut offset)?;
        let active_slots = read_u32(data, &mut offset)?;
        let cu_consumed = read_u64(data, &mut offset)?;
        let utilization_pct = f32::from_le_bytes(data[offset..offset + 4].try_into().unwrap());
        offset += 4;
        let p25 = read_u64(data, &mut offset)?;
        let p50 = read_u64(data, &mut offset)?;
        let p75 = read_u64(data, &mut offset)?;
        let p90 = read_u64(data, &mut offset)?;
        let min_nonzero_price = read_u64(data, &mut offset)?;

        accounts.push(AccountFee {
            pubkey,
            total_txs,
            active_slots,
            cu_consumed,
            utilization_pct,
            p25, p50, p75, p90,
            min_nonzero_price,
        });
    }

    Ok(FeeMarket {
        slot,
        timestamp_ms,
        recommended,
        state,
        is_stale,
        block_utilization_pct,
        blocks_in_window,
        accounts,
    })
}

fn decode_blockhash(data: &[u8]) -> Result<Blockhash, DecodeError> {
    if data.len() < 65 {
        return Err(DecodeError::PayloadTooShort {
            expected: 65,
            actual: data.len(),
        });
    }

    let mut offset = 0;

    let slot = read_u64(data, &mut offset)?;
    let timestamp_ms = read_u64(data, &mut offset)?;
    let blockhash = bs58::encode(&data[offset..offset + 32]).into_string();
    offset += 32;
    let block_height = read_u64(data, &mut offset)?;
    let last_valid_block_height = read_u64(data, &mut offset)?;
    let is_stale = data[offset] != 0;

    Ok(Blockhash {
        slot,
        timestamp_ms,
        blockhash,
        block_height,
        last_valid_block_height,
        is_stale,
    })
}

// Helper functions for reading little-endian integers
fn read_u64(data: &[u8], offset: &mut usize) -> Result<u64, DecodeError> {
    if *offset + 8 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: *offset + 8,
            actual: data.len(),
        });
    }
    let value = u64::from_le_bytes(data[*offset..*offset + 8].try_into().unwrap());
    *offset += 8;
    Ok(value)
}

fn read_u32(data: &[u8], offset: &mut usize) -> Result<u32, DecodeError> {
    if *offset + 4 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: *offset + 4,
            actual: data.len(),
        });
    }
    let value = u32::from_le_bytes(data[*offset..*offset + 4].try_into().unwrap());
    *offset += 4;
    Ok(value)
}

fn read_u16(data: &[u8], offset: &mut usize) -> Result<u16, DecodeError> {
    if *offset + 2 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: *offset + 2,
            actual: data.len(),
        });
    }
    let value = u16::from_le_bytes(data[*offset..*offset + 2].try_into().unwrap());
    *offset += 2;
    Ok(value)
}

fn read_i32(data: &[u8], offset: &mut usize) -> Result<i32, DecodeError> {
    if *offset + 4 > data.len() {
        return Err(DecodeError::PayloadTooShort {
            expected: *offset + 4,
            actual: data.len(),
        });
    }
    let value = i32::from_le_bytes(data[*offset..*offset + 4].try_into().unwrap());
    *offset += 4;
    Ok(value)
}
