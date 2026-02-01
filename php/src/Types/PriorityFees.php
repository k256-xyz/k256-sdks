<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Priority fee recommendations from K256.
 * Wire format: 119 bytes, little-endian.
 */
readonly class PriorityFees
{
    public function __construct(
        /** Current Solana slot (offset 0) */
        public int $slot,
        /** Unix timestamp in milliseconds (offset 8) */
        public int $timestampMs,
        /** Recommended fee in microlamports per CU (offset 16) */
        public int $recommended,
        /** Network congestion state (offset 24) */
        public NetworkState $state,
        /** Whether data may be stale (offset 25) */
        public bool $isStale,
        /** 50th percentile swap fee (offset 26) */
        public int $swapP50,
        /** 75th percentile swap fee (offset 34) */
        public int $swapP75,
        /** 90th percentile swap fee (offset 42) */
        public int $swapP90,
        /** 99th percentile swap fee (offset 50) */
        public int $swapP99,
        /** Number of samples used (offset 58) */
        public int $swapSamples,
        /** Fee to land with 50% probability (offset 62) */
        public int $landingP50Fee,
        /** Fee to land with 75% probability (offset 70) */
        public int $landingP75Fee,
        /** Fee to land with 90% probability (offset 78) */
        public int $landingP90Fee,
        /** Fee to land with 99% probability (offset 86) */
        public int $landingP99Fee,
        /** Fee at top 10% tier (offset 94) */
        public int $top10Fee,
        /** Fee at top 25% tier (offset 102) */
        public int $top25Fee,
        /** True if fee spike detected (offset 110) */
        public bool $spikeDetected,
        /** Fee during spike condition (offset 111) */
        public int $spikeFee,
    ) {}
}
