<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Swap quote from K256.
 */
readonly class Quote
{
    public function __construct(
        /** Topic ID for the quote subscription */
        public string $topicId,
        /** Unix timestamp in milliseconds */
        public int $timestampMs,
        /** Sequence number */
        public int $sequence,
        /** Input token mint address */
        public string $inputMint,
        /** Output token mint address */
        public string $outputMint,
        /** Input amount in base units */
        public int $inAmount,
        /** Output amount in base units */
        public int $outAmount,
        /** Price impact in basis points */
        public int $priceImpactBps,
        /** Solana slot of the quote */
        public int $contextSlot,
        /** Algorithm used for routing */
        public string $algorithm,
        /** Whether this is an improvement over previous quote */
        public bool $isImprovement,
        /** Whether this quote is from cache */
        public bool $isCached,
        /** Whether this quote may be stale */
        public bool $isStale,
        /** JSON route plan */
        public ?string $routePlanJson,
    ) {}
}
