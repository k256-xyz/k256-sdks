<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Order book level with price and size.
 */
readonly class OrderLevel
{
    public function __construct(
        /** Price in base units */
        public int $price,
        /** Size in base units */
        public int $size,
    ) {}
}
