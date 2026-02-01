/**
 * Binary message decoder for K256 WebSocket protocol
 * 
 * Decodes binary messages from K2 server into typed JavaScript objects.
 * Supports both single messages and batched pool updates.
 * 
 * Wire format: [1 byte MessageType][N bytes Payload]
 */

import { base58Encode } from '../utils/base58';
import { MessageType, type DecodedMessage, type PoolUpdateMessage } from './types';

/**
 * Decode a binary WebSocket message from K2
 * 
 * @param data - Raw binary data from WebSocket
 * @returns Decoded message or null if unrecognized type
 * 
 * @example
 * ```typescript
 * ws.onmessage = (event) => {
 *   if (event.data instanceof ArrayBuffer) {
 *     const message = decodeMessage(event.data);
 *     if (message?.type === 'pool_update') {
 *       console.log(message.data.poolAddress);
 *     }
 *   }
 * };
 * ```
 */
export function decodeMessage(data: ArrayBuffer): DecodedMessage | null {
  const view = new DataView(data);
  if (data.byteLength < 1) return null;

  const msgType = view.getUint8(0);
  const payload = data.slice(1);
  const payloadView = new DataView(payload);

  switch (msgType) {
    case MessageType.Subscribed:
    case MessageType.QuoteSubscribed:
    case MessageType.Heartbeat: {
      // JSON payload
      const decoder = new TextDecoder();
      const text = decoder.decode(payload);
      try {
        let type: string;
        if (msgType === MessageType.QuoteSubscribed) {
          type = 'quote_subscribed';
        } else if (msgType === MessageType.Heartbeat) {
          type = 'heartbeat';
        } else {
          type = 'subscribed';
        }
        return {
          type,
          data: JSON.parse(text),
        } as DecodedMessage;
      } catch {
        return { type: 'error', data: { message: text } };
      }
    }

    case MessageType.Error: {
      // UTF-8 string payload
      const decoder = new TextDecoder();
      const text = decoder.decode(payload);
      return { type: 'error', data: { message: text } };
    }

    case MessageType.PriorityFees: {
      // PriorityFeesWire bincode layout:
      // Offset 0:  slot: u64
      // Offset 8:  timestamp_ms: u64
      // Offset 16: recommended: u64
      // Offset 24: state: u8 (0=low, 1=normal, 2=high, 3=extreme)
      // Offset 25: is_stale: bool
      // Offset 26: swap_p50: u64
      // Offset 34: swap_p75: u64
      // Offset 42: swap_p90: u64
      // Offset 50: swap_p99: u64
      // Offset 58: swap_samples: u32
      // Offset 62: landing_p50_fee: u64
      // Offset 70: landing_p75_fee: u64
      // Offset 78: landing_p90_fee: u64
      // Offset 86: landing_p99_fee: u64
      // Offset 94: top_10_fee: u64
      // Offset 102: top_25_fee: u64
      // Offset 110: spike_detected: bool
      // Offset 111: spike_fee: u64
      // Total: 119 bytes
      if (payload.byteLength < 24) return null;

      const slot = Number(payloadView.getBigUint64(0, true));
      const timestampMs = Number(payloadView.getBigUint64(8, true));
      const recommended = Number(payloadView.getBigUint64(16, true));
      const state = payload.byteLength > 24 ? payloadView.getUint8(24) : 1;
      const isStale = payload.byteLength > 25 ? payloadView.getUint8(25) !== 0 : false;

      // Swap percentiles (offset 26-57)
      let swapP50 = 0, swapP75 = 0, swapP90 = 0, swapP99 = 0;
      if (payload.byteLength >= 58) {
        swapP50 = Number(payloadView.getBigUint64(26, true));
        swapP75 = Number(payloadView.getBigUint64(34, true));
        swapP90 = Number(payloadView.getBigUint64(42, true));
        swapP99 = Number(payloadView.getBigUint64(50, true));
      }

      // Extended fields (offset 58+)
      let swapSamples = 0;
      let landingP50Fee = 0, landingP75Fee = 0, landingP90Fee = 0, landingP99Fee = 0;
      let top10Fee = 0, top25Fee = 0;
      let spikeDetected = false, spikeFee = 0;

      if (payload.byteLength >= 119) {
        swapSamples = payloadView.getUint32(58, true);
        landingP50Fee = Number(payloadView.getBigUint64(62, true));
        landingP75Fee = Number(payloadView.getBigUint64(70, true));
        landingP90Fee = Number(payloadView.getBigUint64(78, true));
        landingP99Fee = Number(payloadView.getBigUint64(86, true));
        top10Fee = Number(payloadView.getBigUint64(94, true));
        top25Fee = Number(payloadView.getBigUint64(102, true));
        spikeDetected = payloadView.getUint8(110) !== 0;
        spikeFee = Number(payloadView.getBigUint64(111, true));
      }

      return {
        type: 'priority_fees',
        data: {
          slot,
          timestampMs,
          recommended,
          state,
          isStale,
          swapP50,
          swapP75,
          swapP90,
          swapP99,
          swapSamples,
          landingP50Fee,
          landingP75Fee,
          landingP90Fee,
          landingP99Fee,
          top10Fee,
          top25Fee,
          spikeDetected,
          spikeFee,
        },
      };
    }

    case MessageType.Blockhash: {
      // BlockhashWire bincode layout
      if (payload.byteLength < 65) return null;

      const slot = Number(payloadView.getBigUint64(0, true));
      const timestampMs = Number(payloadView.getBigUint64(8, true));
      const blockhashBytes = new Uint8Array(payload, 16, 32);
      const blockHeight = Number(payloadView.getBigUint64(48, true));
      const lastValidBlockHeight = Number(payloadView.getBigUint64(56, true));
      const isStale = payloadView.getUint8(64) !== 0;

      return {
        type: 'blockhash',
        data: {
          slot,
          timestampMs,
          blockhash: base58Encode(blockhashBytes),
          blockHeight,
          lastValidBlockHeight,
          isStale,
        },
      };
    }

    case MessageType.PoolUpdate: {
      return decodePoolUpdate(payload, payloadView);
    }

    case MessageType.PoolUpdateBatch: {
      // Batched pool updates: [u16 count][u32 len][payload]...
      // Returns array of individual updates
      if (payload.byteLength < 2) return null;

      const updates = decodePoolUpdateBatch(payload);
      if (updates.length === 0) return null;

      // Return first update for single-message interface
      // Use decodePoolUpdateBatch() directly for batch handling
      return updates[0];
    }

    case MessageType.Quote: {
      return decodeQuote(payload, payloadView);
    }

    case MessageType.Pong: {
      if (payload.byteLength < 8) return null;
      return {
        type: 'pong',
        data: {
          timestampMs: Number(payloadView.getBigUint64(0, true)),
        },
      };
    }

    default:
      return null;
  }
}

/**
 * Decode a batch of pool updates
 * 
 * Use this when you need to process all updates in a batch.
 * For high-throughput scenarios, batches can contain 50-200 updates.
 * 
 * @param data - Raw payload (without the 0x0E type prefix)
 * @returns Array of decoded pool updates
 * 
 * @example
 * ```typescript
 * if (msgType === MessageType.PoolUpdateBatch) {
 *   const updates = decodePoolUpdateBatch(payload);
 *   for (const update of updates) {
 *     console.log(update.data.poolAddress);
 *   }
 * }
 * ```
 */
export function decodePoolUpdateBatch(payload: ArrayBuffer): PoolUpdateMessage[] {
  const view = new DataView(payload);
  if (payload.byteLength < 2) return [];

  const count = view.getUint16(0, true);
  const updates: PoolUpdateMessage[] = [];
  let offset = 2;

  for (let i = 0; i < count && offset + 4 <= payload.byteLength; i++) {
    const payloadLen = view.getUint32(offset, true);
    offset += 4;

    if (offset + payloadLen > payload.byteLength) break;

    // Decode individual pool update (payload is WITHOUT the 0x01 type prefix)
    const updatePayload = payload.slice(offset, offset + payloadLen);
    const updateView = new DataView(updatePayload);
    const decoded = decodePoolUpdate(updatePayload, updateView);

    if (decoded) {
      updates.push(decoded);
    }

    offset += payloadLen;
  }

  return updates;
}

/**
 * Decode a single pool update payload
 */
function decodePoolUpdate(payload: ArrayBuffer, payloadView: DataView): PoolUpdateMessage | null {
  if (payload.byteLength < 50) return null;

  try {
    let offset = 0;
    const decoder = new TextDecoder();

    // Skip serialized_state (Bytes: u64 len + bytes)
    const serializedStateLen = Number(payloadView.getBigUint64(offset, true));
    offset += 8 + serializedStateLen;

    if (payload.byteLength < offset + 24) return null;

    // sequence (u64)
    const sequence = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // slot (u64)
    const slot = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // write_version (u64)
    const writeVersion = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // protocol_name (String: u64 len + utf8 bytes)
    const protocolLen = Number(payloadView.getBigUint64(offset, true));
    offset += 8;
    const protocolBytes = new Uint8Array(payload, offset, protocolLen);
    const protocol = decoder.decode(protocolBytes);
    offset += protocolLen;

    // pool_address ([u8; 32])
    const poolAddr = new Uint8Array(payload, offset, 32);
    offset += 32;

    // all_token_mints (Vec<[u8; 32]>)
    const tokenMintCount = Number(payloadView.getBigUint64(offset, true));
    offset += 8;
    const tokenMints: string[] = [];
    for (let i = 0; i < tokenMintCount && offset + 32 <= payload.byteLength; i++) {
      const mint = new Uint8Array(payload, offset, 32);
      tokenMints.push(base58Encode(mint));
      offset += 32;
    }

    // all_token_balances (Vec<u64>)
    const balanceCount = Number(payloadView.getBigUint64(offset, true));
    offset += 8;
    const tokenBalances: string[] = [];
    for (let i = 0; i < balanceCount && offset + 8 <= payload.byteLength; i++) {
      tokenBalances.push(payloadView.getBigUint64(offset, true).toString());
      offset += 8;
    }

    // all_token_decimals (Vec<i32>)
    const decimalsCount = Number(payloadView.getBigUint64(offset, true));
    offset += 8;
    const tokenDecimals: number[] = [];
    for (let i = 0; i < decimalsCount && offset + 4 <= payload.byteLength; i++) {
      tokenDecimals.push(payloadView.getInt32(offset, true));
      offset += 4;
    }

    // best_bid and best_ask (Option<OrderLevel>) - skip for now
    // They use bincode Option encoding: 0 = None, 1 + data = Some

    return {
      type: 'pool_update',
      data: {
        sequence,
        slot,
        writeVersion,
        protocol,
        poolAddress: base58Encode(poolAddr),
        tokenMints,
        tokenBalances,
        tokenDecimals,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Decode a quote message payload
 */
function decodeQuote(payload: ArrayBuffer, payloadView: DataView): DecodedMessage | null {
  if (payload.byteLength < 8) return null;

  try {
    let offset = 0;
    const decoder = new TextDecoder();

    // Helper to read bincode String (u64 len + UTF-8 bytes)
    const readString = (): string => {
      const len = Number(payloadView.getBigUint64(offset, true));
      offset += 8;
      const bytes = new Uint8Array(payload, offset, len);
      offset += len;
      return decoder.decode(bytes);
    };

    // topic_id (String)
    const topicId = readString();

    // timestamp_ms (u64)
    const timestampMs = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // sequence (u64)
    const sequence = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // input_mint ([u8; 32])
    const inputMintBytes = new Uint8Array(payload, offset, 32);
    offset += 32;

    // output_mint ([u8; 32])
    const outputMintBytes = new Uint8Array(payload, offset, 32);
    offset += 32;

    // in_amount (u64)
    const inAmount = payloadView.getBigUint64(offset, true).toString();
    offset += 8;

    // out_amount (u64)
    const outAmount = payloadView.getBigUint64(offset, true).toString();
    offset += 8;

    // price_impact_bps (i32)
    const priceImpactBps = payloadView.getInt32(offset, true);
    offset += 4;

    // context_slot (u64)
    const contextSlot = Number(payloadView.getBigUint64(offset, true));
    offset += 8;

    // algorithm (String)
    const algorithm = readString();

    // is_improvement (bool)
    const isImprovement = payloadView.getUint8(offset) !== 0;
    offset += 1;

    // is_cached (bool)
    const isCached = payloadView.getUint8(offset) !== 0;
    offset += 1;

    // is_stale (bool)
    const isStale = payloadView.getUint8(offset) !== 0;
    offset += 1;

    // route_plan_json (Vec<u8> - bincode: u64 len + bytes)
    let routePlan = null;
    if (offset + 8 <= payload.byteLength) {
      const routePlanLen = Number(payloadView.getBigUint64(offset, true));
      offset += 8;
      if (routePlanLen > 0 && offset + routePlanLen <= payload.byteLength) {
        const routePlanBytes = new Uint8Array(payload, offset, routePlanLen);
        try {
          routePlan = JSON.parse(decoder.decode(routePlanBytes));
        } catch {
          // Route plan JSON parsing failed, leave as null
        }
      }
    }

    return {
      type: 'quote',
      data: {
        topicId,
        timestampMs,
        sequence,
        inputMint: base58Encode(inputMintBytes),
        outputMint: base58Encode(outputMintBytes),
        inAmount,
        outAmount,
        priceImpactBps,
        contextSlot,
        algorithm,
        isImprovement,
        isCached,
        isStale,
        routePlan,
      },
    };
  } catch {
    return null;
  }
}
