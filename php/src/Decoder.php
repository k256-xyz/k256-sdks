<?php

declare(strict_types=1);

namespace K256;

use K256\Types\{Blockhash, NetworkState, OrderLevel, PoolUpdate, PriorityFees, Quote};
use K256\Utils\Base58;

/**
 * Binary message decoder for K256 WebSocket protocol.
 */
final class Decoder
{
    private function __construct()
    {
        // Prevent instantiation
    }

    /**
     * Decode priority fees from binary payload.
     * Wire format: 119 bytes, little-endian.
     *
     * @param string $data Binary payload (without message type byte)
     * @return PriorityFees|null Decoded fees or null if too short
     */
    public static function decodePriorityFees(string $data): ?PriorityFees
    {
        if (strlen($data) < 119) {
            return null;
        }

        return new PriorityFees(
            slot: self::readU64LE($data, 0),
            timestampMs: self::readU64LE($data, 8),
            recommended: self::readU64LE($data, 16),
            state: NetworkState::tryFrom(ord($data[24])) ?? NetworkState::Normal,
            isStale: ord($data[25]) !== 0,
            swapP50: self::readU64LE($data, 26),
            swapP75: self::readU64LE($data, 34),
            swapP90: self::readU64LE($data, 42),
            swapP99: self::readU64LE($data, 50),
            swapSamples: self::readU32LE($data, 58),
            landingP50Fee: self::readU64LE($data, 62),
            landingP75Fee: self::readU64LE($data, 70),
            landingP90Fee: self::readU64LE($data, 78),
            landingP99Fee: self::readU64LE($data, 86),
            top10Fee: self::readU64LE($data, 94),
            top25Fee: self::readU64LE($data, 102),
            spikeDetected: ord($data[110]) !== 0,
            spikeFee: self::readU64LE($data, 111),
        );
    }

    /**
     * Decode blockhash from binary payload.
     * Wire format: 65 bytes, little-endian.
     *
     * @param string $data Binary payload (without message type byte)
     * @return Blockhash|null Decoded blockhash or null if too short
     */
    public static function decodeBlockhash(string $data): ?Blockhash
    {
        if (strlen($data) < 65) {
            return null;
        }

        return new Blockhash(
            slot: self::readU64LE($data, 0),
            timestampMs: self::readU64LE($data, 8),
            blockhash: Base58::encode(substr($data, 16, 32)),
            blockHeight: self::readU64LE($data, 48),
            lastValidBlockHeight: self::readU64LE($data, 56),
            isStale: ord($data[64]) !== 0,
        );
    }

    /**
     * Decode a single pool update from binary payload.
     *
     * @param string $data Binary payload (without message type byte)
     * @return PoolUpdate|null Decoded update or null if decoding fails
     */
    public static function decodePoolUpdate(string $data): ?PoolUpdate
    {
        $dataLen = strlen($data);
        if ($dataLen < 8) {
            return null;
        }

        try {
            $offset = 0;

            // serialized_state: Bytes (u64 len + bytes)
            $stateLen = self::readU64LE($data, $offset);
            $offset += 8;
            if ($offset + $stateLen > $dataLen) {
                return null;
            }
            $serializedState = substr($data, $offset, $stateLen);
            $offset += $stateLen;

            // sequence (u64)
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $sequence = self::readU64LE($data, $offset);
            $offset += 8;

            // slot (u64)
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $slot = self::readU64LE($data, $offset);
            $offset += 8;

            // write_version (u64)
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $writeVersion = self::readU64LE($data, $offset);
            $offset += 8;

            // protocol_name: String (u64 len + UTF-8 bytes)
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $protocolLen = self::readU64LE($data, $offset);
            $offset += 8;
            if ($offset + $protocolLen > $dataLen) {
                return null;
            }
            $protocolName = substr($data, $offset, $protocolLen);
            $offset += $protocolLen;

            // pool_address: [u8; 32]
            if ($offset + 32 > $dataLen) {
                return null;
            }
            $poolAddress = Base58::encode(substr($data, $offset, 32));
            $offset += 32;

            // all_token_mints: Vec<[u8; 32]>
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $mintCount = self::readU64LE($data, $offset);
            $offset += 8;
            if ($offset + $mintCount * 32 > $dataLen) {
                return null;
            }
            $tokenMints = [];
            for ($i = 0; $i < $mintCount; $i++) {
                $tokenMints[] = Base58::encode(substr($data, $offset, 32));
                $offset += 32;
            }

            // all_token_balances: Vec<u64>
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $balanceCount = self::readU64LE($data, $offset);
            $offset += 8;
            if ($offset + $balanceCount * 8 > $dataLen) {
                return null;
            }
            $tokenBalances = [];
            for ($i = 0; $i < $balanceCount; $i++) {
                $tokenBalances[] = self::readU64LE($data, $offset);
                $offset += 8;
            }

            // all_token_decimals: Vec<i32>
            if ($offset + 8 > $dataLen) {
                return null;
            }
            $decimalsCount = self::readU64LE($data, $offset);
            $offset += 8;
            if ($offset + $decimalsCount * 4 > $dataLen) {
                return null;
            }
            $tokenDecimals = [];
            for ($i = 0; $i < $decimalsCount; $i++) {
                $tokenDecimals[] = self::readI32LE($data, $offset);
                $offset += 4;
            }

            // best_bid: Option<OrderLevel>
            $bestBid = null;
            if ($offset < $dataLen && ord($data[$offset]) === 1) {
                $offset++;
                if ($offset + 16 > $dataLen) {
                    return null;
                }
                $bestBid = new OrderLevel(
                    price: self::readU64LE($data, $offset),
                    size: self::readU64LE($data, $offset + 8),
                );
                $offset += 16;
            } elseif ($offset < $dataLen) {
                $offset++;
            }

            // best_ask: Option<OrderLevel>
            $bestAsk = null;
            if ($offset < $dataLen && ord($data[$offset]) === 1) {
                $offset++;
                if ($offset + 16 > $dataLen) {
                    return null;
                }
                $bestAsk = new OrderLevel(
                    price: self::readU64LE($data, $offset),
                    size: self::readU64LE($data, $offset + 8),
                );
            }

            return new PoolUpdate(
                sequence: $sequence,
                slot: $slot,
                writeVersion: $writeVersion,
                protocolName: $protocolName,
                poolAddress: $poolAddress,
                tokenMints: $tokenMints,
                tokenBalances: $tokenBalances,
                tokenDecimals: $tokenDecimals,
                bestBid: $bestBid,
                bestAsk: $bestAsk,
                serializedState: $serializedState,
            );
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Decode a batch of pool updates.
     * Wire format: [u16 count][u32 len1][payload1]...
     *
     * @param string $data Binary payload (without message type byte)
     * @return PoolUpdate[] Decoded updates
     */
    public static function decodePoolUpdateBatch(string $data): array
    {
        if (strlen($data) < 2) {
            return [];
        }

        $count = self::readU16LE($data, 0);
        $offset = 2;

        $updates = [];
        for ($i = 0; $i < $count && $offset + 4 <= strlen($data); $i++) {
            $payloadLen = self::readU32LE($data, $offset);
            $offset += 4;

            if ($offset + $payloadLen > strlen($data)) {
                break;
            }

            $updateData = substr($data, $offset, $payloadLen);
            $update = self::decodePoolUpdate($updateData);
            if ($update !== null) {
                $updates[] = $update;
            }

            $offset += $payloadLen;
        }

        return $updates;
    }

    /**
     * Decode a quote from binary payload.
     *
     * @param string $data Binary payload (without message type byte)
     * @return Quote|null Decoded quote or null if decoding fails
     */
    public static function decodeQuote(string $data): ?Quote
    {
        if (strlen($data) < 8) {
            return null;
        }

        try {
            $offset = 0;

            // topic_id: String (u64 len + UTF-8 bytes)
            $topicLen = self::readU64LE($data, $offset);
            $offset += 8;
            $topicId = substr($data, $offset, $topicLen);
            $offset += $topicLen;

            // timestamp_ms (u64)
            $timestampMs = self::readU64LE($data, $offset);
            $offset += 8;

            // sequence (u64)
            $sequence = self::readU64LE($data, $offset);
            $offset += 8;

            // input_mint ([u8; 32])
            $inputMint = Base58::encode(substr($data, $offset, 32));
            $offset += 32;

            // output_mint ([u8; 32])
            $outputMint = Base58::encode(substr($data, $offset, 32));
            $offset += 32;

            // in_amount (u64)
            $inAmount = self::readU64LE($data, $offset);
            $offset += 8;

            // out_amount (u64)
            $outAmount = self::readU64LE($data, $offset);
            $offset += 8;

            // price_impact_bps (i32)
            $priceImpactBps = self::readI32LE($data, $offset);
            $offset += 4;

            // context_slot (u64)
            $contextSlot = self::readU64LE($data, $offset);
            $offset += 8;

            // algorithm: String (u64 len + UTF-8 bytes)
            $algoLen = self::readU64LE($data, $offset);
            $offset += 8;
            $algorithm = substr($data, $offset, $algoLen);
            $offset += $algoLen;

            // is_improvement (bool)
            $isImprovement = ord($data[$offset++]) !== 0;

            // is_cached (bool)
            $isCached = ord($data[$offset++]) !== 0;

            // is_stale (bool)
            $isStale = ord($data[$offset++]) !== 0;

            // route_plan_json: Vec<u8> (u64 len + bytes)
            $routePlanJson = null;
            if ($offset + 8 <= strlen($data)) {
                $routeLen = self::readU64LE($data, $offset);
                $offset += 8;
                if ($routeLen > 0 && $offset + $routeLen <= strlen($data)) {
                    $routePlanJson = substr($data, $offset, $routeLen);
                }
            }

            return new Quote(
                topicId: $topicId,
                timestampMs: $timestampMs,
                sequence: $sequence,
                inputMint: $inputMint,
                outputMint: $outputMint,
                inAmount: $inAmount,
                outAmount: $outAmount,
                priceImpactBps: $priceImpactBps,
                contextSlot: $contextSlot,
                algorithm: $algorithm,
                isImprovement: $isImprovement,
                isCached: $isCached,
                isStale: $isStale,
                routePlanJson: $routePlanJson,
            );
        } catch (\Throwable) {
            return null;
        }
    }

    private static function readU64LE(string $data, int $offset): int
    {
        $values = unpack('P', substr($data, $offset, 8));
        return $values[1];
    }

    private static function readU32LE(string $data, int $offset): int
    {
        $values = unpack('V', substr($data, $offset, 4));
        return $values[1];
    }

    private static function readU16LE(string $data, int $offset): int
    {
        $values = unpack('v', substr($data, $offset, 2));
        return $values[1];
    }

    private static function readI32LE(string $data, int $offset): int
    {
        $values = unpack('l', substr($data, $offset, 4));
        return $values[1];
    }
}
