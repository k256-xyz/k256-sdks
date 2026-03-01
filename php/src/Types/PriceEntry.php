<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Single token price from the price feed.
 * Wire format per entry: 56 bytes [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
 */
final readonly class PriceEntry
{
    public function __construct(
        public string $mint,
        public float $usdPrice,
        public int $slot,
        public int $timestampMs,
    ) {}
}
