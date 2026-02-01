<?php

declare(strict_types=1);

namespace K256\Types;

/**
 * Connection heartbeat with stats.
 */
readonly class Heartbeat
{
    public function __construct(
        /** Unix timestamp in milliseconds */
        public int $timestampMs,
        /** Connection uptime in seconds */
        public int $uptimeSeconds,
        /** Total messages received */
        public int $messagesReceived,
        /** Total messages sent */
        public int $messagesSent,
        /** Number of active subscriptions */
        public int $subscriptions,
    ) {}
}
