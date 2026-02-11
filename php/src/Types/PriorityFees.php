<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Per-writable-account fee data.
 * Solana's scheduler limits each writable account to 12M CU per block.
 */
readonly class AccountFee
{
    public function __construct(
        /** Account public key (Base58) */
        public string $pubkey,
        /** Total transactions touching this account in the window */
        public int $totalTxs,
        /** Number of slots where this account was active */
        public int $activeSlots,
        /** Total CU consumed by transactions touching this account */
        public int $cuConsumed,
        /** Account utilization percentage (0-100) of 12M CU limit */
        public float $utilizationPct,
        /** 25th percentile fee in microlamports/CU */
        public int $p25,
        /** 50th percentile fee in microlamports/CU */
        public int $p50,
        /** 75th percentile fee in microlamports/CU */
        public int $p75,
        /** 90th percentile fee in microlamports/CU */
        public int $p90,
        /** Minimum non-zero fee observed */
        public int $minNonzeroPrice,
    ) {}
}

/**
 * Fee market update from K256 (per-writable-account model).
 * Variable-length wire format: 42-byte header + N × 92 bytes per account.
 */
readonly class FeeMarket
{
    public function __construct(
        /** Current Solana slot */
        public int $slot,
        /** Unix timestamp in milliseconds */
        public int $timestampMs,
        /** Recommended fee in microlamports/CU (max p75 across hottest accounts) */
        public int $recommended,
        /** Network congestion state */
        public NetworkState $state,
        /** Whether data may be stale */
        public bool $isStale,
        /** Block utilization percentage (0-100) */
        public float $blockUtilizationPct,
        /** Number of blocks in the observation window */
        public int $blocksInWindow,
        /** Per-account fee data @var AccountFee[] */
        public array $accounts,
    ) {}
}
