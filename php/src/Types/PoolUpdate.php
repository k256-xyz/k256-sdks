<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Real-time pool state update from K256 WebSocket.
 */
readonly class PoolUpdate
{
    public function __construct(
        /** Global sequence number for ordering */
        public int $sequence,
        /** Solana slot number */
        public int $slot,
        /** Write version within slot */
        public int $writeVersion,
        /** DEX protocol name (e.g., "RaydiumClmm", "Whirlpool") */
        public string $protocolName,
        /** Base58-encoded pool address */
        public string $poolAddress,
        /** @var string[] List of token mint addresses */
        public array $tokenMints,
        /** @var int[] List of token balances */
        public array $tokenBalances,
        /** @var int[] List of token decimals */
        public array $tokenDecimals,
        /** Best bid order level, if available */
        public ?OrderLevel $bestBid,
        /** Best ask order level, if available */
        public ?OrderLevel $bestAsk,
        /** Opaque pool state bytes */
        public string $serializedState,
    ) {}
}
