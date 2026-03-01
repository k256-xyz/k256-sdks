package xyz.k256.sdk.ws;

import xyz.k256.sdk.types.*;
import xyz.k256.sdk.utils.Base58;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Binary message decoder for K256 WebSocket protocol.
 * Decodes binary messages from K2 server into typed Java objects.
 *
 * Wire format: [1 byte MessageType][N bytes Payload]
 */
public final class MessageDecoder {

    private MessageDecoder() {
        // Prevent instantiation
    }

    /**
     * Decode fee market from binary payload (per-writable-account model).
     * Variable-length wire format: 42-byte header + N × 92 bytes per account.
     *
     * @param payload Binary payload (without message type byte)
     * @return Decoded FeeMarket or null if payload is too short
     */
    public static FeeMarket decodeFeeMarket(byte[] payload) {
        if (payload.length < 42) {
            return null;
        }

        ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);

        long slot = buf.getLong(0);
        long timestampMs = buf.getLong(8);
        long recommended = buf.getLong(16);
        NetworkState state = NetworkState.fromValue(buf.get(24) & 0xFF);
        boolean isStale = buf.get(25) != 0;
        float blockUtilizationPct = buf.getFloat(26);
        int blocksInWindow = buf.getInt(30);
        long accountCount = buf.getLong(34);

        int offset = 42;
        List<AccountFee> accounts = new ArrayList<>((int) accountCount);
        for (int i = 0; i < accountCount && offset + 92 <= payload.length; i++) {
            byte[] pubkeyBytes = new byte[32];
            System.arraycopy(payload, offset, pubkeyBytes, 0, 32);
            String pubkey = Base58.encode(pubkeyBytes);
            int totalTxs = buf.getInt(offset + 32);
            int activeSlots = buf.getInt(offset + 36);
            long cuConsumed = buf.getLong(offset + 40);
            float utilizationPct = buf.getFloat(offset + 48);
            long p25 = buf.getLong(offset + 52);
            long p50 = buf.getLong(offset + 60);
            long p75 = buf.getLong(offset + 68);
            long p90 = buf.getLong(offset + 76);
            long minNonzeroPrice = buf.getLong(offset + 84);

            accounts.add(new AccountFee(
                pubkey, totalTxs, activeSlots, cuConsumed, utilizationPct,
                p25, p50, p75, p90, minNonzeroPrice
            ));
            offset += 92;
        }

        return new FeeMarket(
            slot, timestampMs, recommended, state, isStale,
            blockUtilizationPct, blocksInWindow, accounts
        );
    }

    /**
     * Decode blockhash from binary payload.
     * Wire format: 65 bytes, little-endian.
     *
     * @param payload Binary payload (without message type byte)
     * @return Decoded Blockhash or null if payload is too short
     */
    public static Blockhash decodeBlockhash(byte[] payload) {
        if (payload.length < 65) {
            return null;
        }

        ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);

        long slot = buf.getLong(0);
        long timestampMs = buf.getLong(8);

        byte[] blockhashBytes = new byte[32];
        System.arraycopy(payload, 16, blockhashBytes, 0, 32);
        String blockhash = Base58.encode(blockhashBytes);

        long blockHeight = buf.getLong(48);
        long lastValidBlockHeight = buf.getLong(56);
        boolean isStale = buf.get(64) != 0;

        return new Blockhash(slot, timestampMs, blockhash, blockHeight, lastValidBlockHeight, isStale);
    }

    /**
     * Decode a single pool update from binary payload.
     * Uses bincode format with variable-length fields.
     *
     * @param payload Binary payload (without message type byte)
     * @return Decoded PoolUpdate or null if decoding fails
     */
    public static PoolUpdate decodePoolUpdate(byte[] payload) {
        if (payload.length < 8) {
            return null;
        }

        try {
            ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
            int offset = 0;

            // serialized_state: Bytes (u64 len + bytes)
            long stateLen = buf.getLong(offset);
            offset += 8;
            if (offset + (int) stateLen > payload.length) {
                return null;
            }
            byte[] serializedState = new byte[(int) stateLen];
            System.arraycopy(payload, offset, serializedState, 0, (int) stateLen);
            offset += (int) stateLen;

            // sequence (u64)
            if (offset + 8 > payload.length) {
                return null;
            }
            long sequence = buf.getLong(offset);
            offset += 8;

            // slot (u64)
            if (offset + 8 > payload.length) {
                return null;
            }
            long slot = buf.getLong(offset);
            offset += 8;

            // write_version (u64)
            if (offset + 8 > payload.length) {
                return null;
            }
            long writeVersion = buf.getLong(offset);
            offset += 8;

            // protocol_name: String (u64 len + UTF-8 bytes)
            if (offset + 8 > payload.length) {
                return null;
            }
            long protocolLen = buf.getLong(offset);
            offset += 8;
            if (offset + (int) protocolLen > payload.length) {
                return null;
            }
            String protocolName = new String(payload, offset, (int) protocolLen, StandardCharsets.UTF_8);
            offset += (int) protocolLen;

            // pool_address: [u8; 32]
            if (offset + 32 > payload.length) {
                return null;
            }
            byte[] poolAddrBytes = new byte[32];
            System.arraycopy(payload, offset, poolAddrBytes, 0, 32);
            String poolAddress = Base58.encode(poolAddrBytes);
            offset += 32;

            // all_token_mints: Vec<[u8; 32]>
            if (offset + 8 > payload.length) {
                return null;
            }
            long mintCount = buf.getLong(offset);
            offset += 8;
            if (offset + (int) mintCount * 32 > payload.length) {
                return null;
            }
            List<String> tokenMints = new ArrayList<>((int) mintCount);
            for (int i = 0; i < mintCount; i++) {
                byte[] mintBytes = new byte[32];
                System.arraycopy(payload, offset, mintBytes, 0, 32);
                tokenMints.add(Base58.encode(mintBytes));
                offset += 32;
            }

            // all_token_balances: Vec<u64>
            if (offset + 8 > payload.length) {
                return null;
            }
            long balanceCount = buf.getLong(offset);
            offset += 8;
            if (offset + (int) balanceCount * 8 > payload.length) {
                return null;
            }
            List<Long> tokenBalances = new ArrayList<>((int) balanceCount);
            for (int i = 0; i < balanceCount; i++) {
                tokenBalances.add(buf.getLong(offset));
                offset += 8;
            }

            // all_token_decimals: Vec<i32>
            if (offset + 8 > payload.length) {
                return null;
            }
            long decimalsCount = buf.getLong(offset);
            offset += 8;
            if (offset + (int) decimalsCount * 4 > payload.length) {
                return null;
            }
            List<Integer> tokenDecimals = new ArrayList<>((int) decimalsCount);
            for (int i = 0; i < decimalsCount; i++) {
                tokenDecimals.add(buf.getInt(offset));
                offset += 4;
            }

            // best_bid: Option<OrderLevel>
            Optional<OrderLevel> bestBid = Optional.empty();
            if (offset < payload.length && payload[offset] == 1) {
                offset++;
                if (offset + 16 > payload.length) {
                    return null;
                }
                long price = buf.getLong(offset);
                offset += 8;
                long size = buf.getLong(offset);
                offset += 8;
                bestBid = Optional.of(new OrderLevel(price, size));
            } else if (offset < payload.length) {
                offset++;
            }

            // best_ask: Option<OrderLevel>
            Optional<OrderLevel> bestAsk = Optional.empty();
            if (offset < payload.length && payload[offset] == 1) {
                offset++;
                if (offset + 16 > payload.length) {
                    return null;
                }
                long price = buf.getLong(offset);
                offset += 8;
                long size = buf.getLong(offset);
                bestAsk = Optional.of(new OrderLevel(price, size));
            }

            return new PoolUpdate(
                sequence, slot, writeVersion, protocolName, poolAddress,
                tokenMints, tokenBalances, tokenDecimals, bestBid, bestAsk, serializedState
            );
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Decode a batch of pool updates.
     * Wire format: [u16 count][u32 len1][payload1][u32 len2][payload2]...
     *
     * @param payload Binary payload (without message type byte)
     * @return List of decoded PoolUpdate objects
     */
    public static List<PoolUpdate> decodePoolUpdateBatch(byte[] payload) {
        if (payload.length < 2) {
            return List.of();
        }

        ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        int count = buf.getShort(0) & 0xFFFF;
        int offset = 2;

        List<PoolUpdate> updates = new ArrayList<>(count);
        for (int i = 0; i < count && offset + 4 <= payload.length; i++) {
            int length = buf.getInt(offset);
            offset += 4;

            if (offset + length > payload.length) {
                break;
            }

            byte[] updatePayload = new byte[length];
            System.arraycopy(payload, offset, updatePayload, 0, length);
            PoolUpdate update = decodePoolUpdate(updatePayload);
            if (update != null) {
                updates.add(update);
            }
            offset += length;
        }

        return updates;
    }

    /**
     * Decode a batch of price entries from binary payload.
     * Wire format: [u16 count][56B entry1][56B entry2]...
     *
     * @param payload Binary payload (without message type byte)
     * @return List of decoded PriceEntry objects
     */
    public static List<PriceEntry> decodePriceEntries(byte[] payload) {
        if (payload.length < 2) return List.of();
        ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        int count = buf.getShort(0) & 0xFFFF;
        int offset = 2;
        List<PriceEntry> entries = new ArrayList<>(count);
        for (int i = 0; i < count && offset + 56 <= payload.length; i++) {
            byte[] mintBytes = new byte[32];
            System.arraycopy(payload, offset, mintBytes, 0, 32);
            String mint = Base58.encode(mintBytes);
            long usdPriceRaw = buf.getLong(offset + 32);
            long slot = buf.getLong(offset + 40);
            long timestampMs = buf.getLong(offset + 48);
            entries.add(new PriceEntry(mint, (double) usdPriceRaw / 1e12, slot, timestampMs));
            offset += 56;
        }
        return entries;
    }

    /**
     * Decode a single price update from binary payload.
     * Wire format: 56 bytes [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
     *
     * @param payload Binary payload (without message type byte)
     * @return Decoded PriceEntry or null if payload is too short
     */
    public static PriceEntry decodePriceUpdate(byte[] payload) {
        if (payload.length < 56) return null;
        ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        byte[] mintBytes = new byte[32];
        System.arraycopy(payload, 0, mintBytes, 0, 32);
        String mint = Base58.encode(mintBytes);
        long usdPriceRaw = buf.getLong(32);
        long slot = buf.getLong(40);
        long timestampMs = buf.getLong(48);
        return new PriceEntry(mint, (double) usdPriceRaw / 1e12, slot, timestampMs);
    }

    /**
     * Decode a quote from binary payload.
     *
     * @param payload Binary payload (without message type byte)
     * @return Decoded Quote or null if decoding fails
     */
    public static Quote decodeQuote(byte[] payload) {
        if (payload.length < 8) {
            return null;
        }

        try {
            ByteBuffer buf = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
            int offset = 0;

            // topic_id: String (u64 len + UTF-8 bytes)
            long topicLen = buf.getLong(offset);
            offset += 8;
            String topicId = new String(payload, offset, (int) topicLen, StandardCharsets.UTF_8);
            offset += (int) topicLen;

            // timestamp_ms (u64)
            long timestampMs = buf.getLong(offset);
            offset += 8;

            // sequence (u64)
            long sequence = buf.getLong(offset);
            offset += 8;

            // input_mint ([u8; 32])
            byte[] inputMintBytes = new byte[32];
            System.arraycopy(payload, offset, inputMintBytes, 0, 32);
            String inputMint = Base58.encode(inputMintBytes);
            offset += 32;

            // output_mint ([u8; 32])
            byte[] outputMintBytes = new byte[32];
            System.arraycopy(payload, offset, outputMintBytes, 0, 32);
            String outputMint = Base58.encode(outputMintBytes);
            offset += 32;

            // in_amount (u64)
            long inAmount = buf.getLong(offset);
            offset += 8;

            // out_amount (u64)
            long outAmount = buf.getLong(offset);
            offset += 8;

            // price_impact_bps (i32)
            int priceImpactBps = buf.getInt(offset);
            offset += 4;

            // context_slot (u64)
            long contextSlot = buf.getLong(offset);
            offset += 8;

            // algorithm: String (u64 len + UTF-8 bytes)
            long algoLen = buf.getLong(offset);
            offset += 8;
            String algorithm = new String(payload, offset, (int) algoLen, StandardCharsets.UTF_8);
            offset += (int) algoLen;

            // is_improvement (bool)
            boolean isImprovement = payload[offset++] != 0;

            // is_cached (bool)
            boolean isCached = payload[offset++] != 0;

            // is_stale (bool)
            boolean isStale = payload[offset++] != 0;

            // route_plan_json: Vec<u8> (u64 len + bytes)
            String routePlanJson = null;
            if (offset + 8 <= payload.length) {
                long routePlanLen = buf.getLong(offset);
                offset += 8;
                if (routePlanLen > 0 && offset + routePlanLen <= payload.length) {
                    routePlanJson = new String(payload, offset, (int) routePlanLen, StandardCharsets.UTF_8);
                }
            }

            return new Quote(
                topicId, timestampMs, sequence, inputMint, outputMint,
                inAmount, outAmount, priceImpactBps, contextSlot, algorithm,
                isImprovement, isCached, isStale, routePlanJson
            );
        } catch (Exception e) {
            return null;
        }
    }
}
