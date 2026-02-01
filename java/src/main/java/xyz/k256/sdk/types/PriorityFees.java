package xyz.k256.sdk.types;

/**
 * Priority fee recommendations from K256.
 * Wire format: 119 bytes, little-endian.
 */
public record PriorityFees(
    /** Current Solana slot (offset 0) */
    long slot,
    /** Unix timestamp in milliseconds (offset 8) */
    long timestampMs,
    /** Recommended fee in microlamports per CU (offset 16) */
    long recommended,
    /** Network congestion state (offset 24) */
    NetworkState state,
    /** Whether data may be stale (offset 25) */
    boolean isStale,
    /** 50th percentile swap fee (offset 26) */
    long swapP50,
    /** 75th percentile swap fee (offset 34) */
    long swapP75,
    /** 90th percentile swap fee (offset 42) */
    long swapP90,
    /** 99th percentile swap fee (offset 50) */
    long swapP99,
    /** Number of samples used (offset 58) */
    int swapSamples,
    /** Fee to land with 50% probability (offset 62) */
    long landingP50Fee,
    /** Fee to land with 75% probability (offset 70) */
    long landingP75Fee,
    /** Fee to land with 90% probability (offset 78) */
    long landingP90Fee,
    /** Fee to land with 99% probability (offset 86) */
    long landingP99Fee,
    /** Fee at top 10% tier (offset 94) */
    long top10Fee,
    /** Fee at top 25% tier (offset 102) */
    long top25Fee,
    /** True if fee spike detected (offset 110) */
    boolean spikeDetected,
    /** Fee during spike condition (offset 111) */
    long spikeFee
) {}
