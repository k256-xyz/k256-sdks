<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Recent blockhash from K256.
 * Wire format: 65 bytes, little-endian.
 */
readonly class Blockhash
{
    public function __construct(
        /** Solana slot of the blockhash (offset 0) */
        public int $slot,
        /** Unix timestamp in milliseconds (offset 8) */
        public int $timestampMs,
        /** Base58-encoded recent blockhash (offset 16, 32 bytes) */
        public string $blockhash,
        /** Block height (offset 48) */
        public int $blockHeight,
        /** Last valid block height for transactions (offset 56) */
        public int $lastValidBlockHeight,
        /** Whether data may be stale (offset 64) */
        public bool $isStale,
    ) {}
}
