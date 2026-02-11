package xyz.k256.sdk.types;

import java.util.List;

/**
 * Fee market update from K256 (per-writable-account model).
 * Variable-length wire format: 42-byte header + N × 92 bytes per account.
 */
public record FeeMarket(
    /** Current Solana slot */
    long slot,
    /** Unix timestamp in milliseconds */
    long timestampMs,
    /** Recommended fee in microlamports/CU (max p75 across hottest accounts) */
    long recommended,
    /** Network congestion state */
    NetworkState state,
    /** Whether data may be stale */
    boolean isStale,
    /** Block utilization percentage (0-100) */
    float blockUtilizationPct,
    /** Number of blocks in the observation window */
    int blocksInWindow,
    /** Per-account fee data */
    List<AccountFee> accounts
) {}
