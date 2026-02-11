/**
 * Binary message decoder for K256 WebSocket protocol
 * 
 * Decodes binary messages from K2 server into typed JavaScript objects.
 * Supports both single messages and batched pool updates.
 * 
 * Wire format: [1 byte MessageType][N bytes Payload]
 */

import { base58Encode } from '../utils/base58';
import type { BlockMiniStats, TrendDirection } from '../types';
import { MessageType, type DecodedMessage, type PoolUpdateMessage, type FeeMarketMessage } from './types';

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
      // FeeMarketWire bincode layout (per-writable-account model):
      // Header (42 bytes):
      //   Offset 0:  slot: u64 (8 bytes)
      //   Offset 8:  timestamp_ms: u64 (8 bytes)
      //   Offset 16: recommended: u64 (8 bytes)
      //   Offset 24: state: u8 (1 byte)
      //   Offset 25: is_stale: bool (1 byte)
      //   Offset 26: block_utilization_pct: f32 (4 bytes)
      //   Offset 30: blocks_in_window: u32 (4 bytes)
      //   Offset 34: account_count: u64 (8 bytes) [bincode Vec length]
      // Per account (92 bytes each):
      //   pubkey: [u8; 32], total_txs: u32, active_slots: u32,
      //   cu_consumed: u64, utilization_pct: f32,
      //   p25: u64, p50: u64, p75: u64, p90: u64, min_nonzero_price: u64
      if (payload.byteLength < 42) return null;

      const slot = Number(payloadView.getBigUint64(0, true));
      const timestampMs = Number(payloadView.getBigUint64(8, true));
      const recommended = Number(payloadView.getBigUint64(16, true));
      const state = payloadView.getUint8(24);
      const isStale = payloadView.getUint8(25) !== 0;
      const blockUtilizationPct = payloadView.getFloat32(26, true);
      const blocksInWindow = payloadView.getUint32(30, true);
      const accountCount = Number(payloadView.getBigUint64(34, true));

      const accounts: FeeMarketMessage['data']['accounts'] = [];
      let offset = 42;
      for (let i = 0; i < accountCount && offset + 92 <= payload.byteLength; i++) {
        const pubkeyBytes = new Uint8Array(payload, offset, 32);
        const pubkey = base58Encode(pubkeyBytes);
        const totalTxs = payloadView.getUint32(offset + 32, true);
        const activeSlots = payloadView.getUint32(offset + 36, true);
        const cuConsumed = Number(payloadView.getBigUint64(offset + 40, true));
        const utilizationPct = payloadView.getFloat32(offset + 48, true);
        const p25 = Number(payloadView.getBigUint64(offset + 52, true));
        const p50 = Number(payloadView.getBigUint64(offset + 60, true));
        const p75 = Number(payloadView.getBigUint64(offset + 68, true));
        const p90 = Number(payloadView.getBigUint64(offset + 76, true));
        const minNonzeroPrice = Number(payloadView.getBigUint64(offset + 84, true));

        accounts.push({
          pubkey, totalTxs, activeSlots, cuConsumed, utilizationPct,
          p25, p50, p75, p90, minNonzeroPrice,
        });
        offset += 92;
      }

      // Decode recent_blocks (Vec<BlockMiniStats>) — v3
      // Guard: need at least 8 bytes for count + 1 byte for trend after
      const recentBlocksCount = offset + 8 <= payload.byteLength
        ? Number(payloadView.getBigUint64(offset, true))
        : 0;
      offset += 8;
      const recentBlocks: BlockMiniStats[] = [];
      for (let i = 0; i < recentBlocksCount && offset + 32 <= payload.byteLength; i++) {
        const rbSlot = Number(payloadView.getBigUint64(offset, true)); offset += 8;
        const rbCuConsumed = Number(payloadView.getBigUint64(offset, true)); offset += 8;
        const rbTxCount = payloadView.getUint32(offset, true); offset += 4;
        const rbUtilizationPct = payloadView.getFloat32(offset, true); offset += 4;
        const rbAvgCuPrice = Number(payloadView.getBigUint64(offset, true)); offset += 8;
        recentBlocks.push({ slot: rbSlot, cuConsumed: rbCuConsumed, txCount: rbTxCount, utilizationPct: rbUtilizationPct, avgCuPrice: rbAvgCuPrice });
      }

      // Decode trend (u8) — v3
      const trendByte = offset < payload.byteLength ? payloadView.getUint8(offset) : 2;
      offset += 1;
      const trend: TrendDirection = trendByte === 0 ? 'rising' : trendByte === 1 ? 'falling' : 'stable';

      return {
        type: 'fee_market',
        data: {
          slot, timestampMs, recommended, state, isStale,
          blockUtilizationPct, blocksInWindow, accounts,
          recentBlocks, trend,
        },
      } as FeeMarketMessage;
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

    case MessageType.BlockStats: {
      // BlockStats (0x0F) — v3
      // Layout: slot(u64) + cu_consumed(u64) + execution_cu(u64) + cu_limit(u64) + cu_remaining(u64)
      //       + utilization_pct(f32) + tx_count(u32) + avg_cu_per_tx(u32) + avg_cu_price(u64)
      //       + min_cu_price(u64) + max_cu_price(u64) + timestamp_ms(u64)
      let offset = 0; // payload already has type byte stripped
      const slot = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const cuConsumed = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const executionCu = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const cuLimit = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const cuRemaining = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const utilizationPct = payloadView.getFloat32(offset, true); offset += 4;
      const txCount = payloadView.getUint32(offset, true); offset += 4;
      const avgCuPerTx = payloadView.getUint32(offset, true); offset += 4;
      const avgCuPrice = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const minCuPrice = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const maxCuPrice = Number(payloadView.getBigUint64(offset, true)); offset += 8;
      const timestampMs = Number(payloadView.getBigUint64(offset, true)); offset += 8;

      return {
        type: 'block_stats',
        data: {
          slot, cuConsumed, executionCu, cuLimit, cuRemaining, utilizationPct,
          txCount, avgCuPerTx, avgCuPrice, minCuPrice, maxCuPrice, timestampMs,
        },
        receivedAt: Date.now(),
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
