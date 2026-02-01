"""Binary message decoder for K256 WebSocket protocol."""

import json
import struct
from typing import Union

from k256.types import (
    PoolUpdate,
    PriorityFees,
    Blockhash,
    Quote,
    Heartbeat,
    OrderLevel,
    NetworkState,
    MessageType,
)
from k256.utils import base58_encode


def decode_message(
    msg_type: int,
    payload: bytes,
) -> Union[PoolUpdate, PriorityFees, Blockhash, Quote, Heartbeat, list[PoolUpdate], str, None]:
    """Decode a binary WebSocket message.
    
    Args:
        msg_type: Message type byte
        payload: Message payload (without type byte)
        
    Returns:
        Decoded message object, or None for unhandled types
        
    Raises:
        ValueError: If the message format is invalid
    """
    if msg_type == MessageType.POOL_UPDATE:
        return _decode_pool_update(payload)
    elif msg_type == MessageType.POOL_UPDATE_BATCH:
        return _decode_pool_update_batch(payload)
    elif msg_type == MessageType.PRIORITY_FEES:
        return _decode_priority_fees(payload)
    elif msg_type == MessageType.BLOCKHASH:
        return _decode_blockhash(payload)
    elif msg_type == MessageType.QUOTE:
        return _decode_quote(payload)
    elif msg_type == MessageType.HEARTBEAT:
        return _decode_heartbeat(payload)
    elif msg_type == MessageType.ERROR:
        return payload.decode("utf-8", errors="replace")
    elif msg_type == MessageType.PONG:
        return None
    else:
        return None


def _decode_pool_update(data: bytes) -> PoolUpdate:
    """Decode a single pool update from bincode format."""
    offset = 0
    
    # serialized_state: Bytes (u64 len + bytes)
    state_len = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    serialized_state = data[offset:offset + state_len]
    offset += state_len
    
    # sequence: u64
    sequence = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # slot: u64
    slot = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # write_version: u64
    write_version = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # protocol_name: String (u64 len + UTF-8)
    name_len = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    protocol_name = data[offset:offset + name_len].decode("utf-8")
    offset += name_len
    
    # pool_address: [u8; 32]
    pool_address = base58_encode(data[offset:offset + 32])
    offset += 32
    
    # all_token_mints: Vec<[u8; 32]>
    num_mints = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    token_mints = []
    for _ in range(num_mints):
        token_mints.append(base58_encode(data[offset:offset + 32]))
        offset += 32
    
    # all_token_balances: Vec<u64>
    num_balances = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    token_balances = []
    for _ in range(num_balances):
        token_balances.append(struct.unpack_from("<Q", data, offset)[0])
        offset += 8
    
    # all_token_decimals: Vec<i32>
    num_decimals = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    token_decimals = []
    for _ in range(num_decimals):
        token_decimals.append(struct.unpack_from("<i", data, offset)[0])
        offset += 4
    
    # best_bid: Option<OrderLevel>
    best_bid = None
    if data[offset] == 1:
        offset += 1
        best_bid = OrderLevel(
            price=struct.unpack_from("<Q", data, offset)[0],
            size=struct.unpack_from("<Q", data, offset + 8)[0],
        )
        offset += 16
    else:
        offset += 1
    
    # best_ask: Option<OrderLevel>
    best_ask = None
    if offset < len(data) and data[offset] == 1:
        offset += 1
        best_ask = OrderLevel(
            price=struct.unpack_from("<Q", data, offset)[0],
            size=struct.unpack_from("<Q", data, offset + 8)[0],
        )
        offset += 16
    else:
        offset += 1
    
    return PoolUpdate(
        sequence=sequence,
        slot=slot,
        write_version=write_version,
        protocol_name=protocol_name,
        pool_address=pool_address,
        token_mints=token_mints,
        token_balances=token_balances,
        token_decimals=token_decimals,
        best_bid=best_bid,
        best_ask=best_ask,
        serialized_state=serialized_state,
    )


def _decode_pool_update_batch(data: bytes) -> list[PoolUpdate]:
    """Decode a batch of pool updates."""
    offset = 0
    
    # count: u16 LE
    count = struct.unpack_from("<H", data, offset)[0]
    offset += 2
    
    updates = []
    for _ in range(count):
        # length: u32 LE
        length = struct.unpack_from("<I", data, offset)[0]
        offset += 4
        
        # payload (without type byte)
        update = _decode_pool_update(data[offset:offset + length])
        updates.append(update)
        offset += length
    
    return updates


def _decode_priority_fees(data: bytes) -> PriorityFees:
    """Decode priority fees from bincode format (119 bytes)."""
    if len(data) < 119:
        raise ValueError(f"PriorityFees payload too short: {len(data)} < 119")
    
    return PriorityFees(
        slot=struct.unpack_from("<Q", data, 0)[0],
        timestamp_ms=struct.unpack_from("<Q", data, 8)[0],
        recommended=struct.unpack_from("<Q", data, 16)[0],
        state=NetworkState(data[24]),
        is_stale=bool(data[25]),
        swap_p50=struct.unpack_from("<Q", data, 26)[0],
        swap_p75=struct.unpack_from("<Q", data, 34)[0],
        swap_p90=struct.unpack_from("<Q", data, 42)[0],
        swap_p99=struct.unpack_from("<Q", data, 50)[0],
        swap_samples=struct.unpack_from("<I", data, 58)[0],
        landing_p50_fee=struct.unpack_from("<Q", data, 62)[0],
        landing_p75_fee=struct.unpack_from("<Q", data, 70)[0],
        landing_p90_fee=struct.unpack_from("<Q", data, 78)[0],
        landing_p99_fee=struct.unpack_from("<Q", data, 86)[0],
        top_10_fee=struct.unpack_from("<Q", data, 94)[0],
        top_25_fee=struct.unpack_from("<Q", data, 102)[0],
        spike_detected=bool(data[110]),
        spike_fee=struct.unpack_from("<Q", data, 111)[0],
    )


def _decode_blockhash(data: bytes) -> Blockhash:
    """Decode blockhash from bincode format (65 bytes)."""
    if len(data) < 65:
        raise ValueError(f"Blockhash payload too short: {len(data)} < 65")
    
    offset = 0
    
    slot = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    timestamp_ms = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    blockhash = base58_encode(data[offset:offset + 32])
    offset += 32
    
    block_height = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    last_valid_block_height = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    is_stale = bool(data[offset])
    
    return Blockhash(
        slot=slot,
        timestamp_ms=timestamp_ms,
        blockhash=blockhash,
        block_height=block_height,
        last_valid_block_height=last_valid_block_height,
        is_stale=is_stale,
    )


def _decode_quote(data: bytes) -> Quote:
    """Decode a quote from bincode format."""
    offset = 0
    
    # Helper to read bincode String (u64 len + UTF-8 bytes)
    def read_string() -> tuple[str, int]:
        nonlocal offset
        str_len = struct.unpack_from("<Q", data, offset)[0]
        offset += 8
        s = data[offset:offset + str_len].decode("utf-8")
        offset += str_len
        return s
    
    # topic_id (String) - we don't store this in Quote type
    read_string()
    
    # timestamp_ms (u64)
    timestamp_ms = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # sequence (u64) - we don't store this in Quote type
    struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # input_mint ([u8; 32])
    input_mint = base58_encode(data[offset:offset + 32])
    offset += 32
    
    # output_mint ([u8; 32])
    output_mint = base58_encode(data[offset:offset + 32])
    offset += 32
    
    # in_amount (u64)
    in_amount = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # out_amount (u64)
    out_amount = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # price_impact_bps (i32)
    price_impact_bps = struct.unpack_from("<i", data, offset)[0]
    offset += 4
    
    # context_slot (u64)
    slot = struct.unpack_from("<Q", data, offset)[0]
    offset += 8
    
    # algorithm (String) - we don't store this in Quote type
    read_string()
    
    # is_improvement (bool) - skip
    offset += 1
    
    # is_cached (bool) - skip
    offset += 1
    
    # is_stale (bool) - skip
    offset += 1
    
    # route_plan_json (String)
    route_plan_json = read_string()
    route_plan = json.loads(route_plan_json) if route_plan_json else []
    
    return Quote(
        input_mint=input_mint,
        output_mint=output_mint,
        in_amount=in_amount,
        out_amount=out_amount,
        price_impact_pct=price_impact_bps / 100.0,  # Convert bps to percentage
        slot=slot,
        timestamp_ms=timestamp_ms,
        route_plan=route_plan,
    )


def _decode_heartbeat(data: bytes) -> Heartbeat:
    """Decode heartbeat from JSON format."""
    text = data.decode("utf-8")
    obj = json.loads(text)
    
    return Heartbeat(
        timestamp_ms=obj.get("timestamp_ms", 0),
        uptime_seconds=obj.get("uptime_seconds", 0),
        messages_received=obj.get("messages_received", 0),
        messages_sent=obj.get("messages_sent", 0),
        subscriptions=obj.get("subscriptions", 0),
    )
