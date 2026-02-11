package xyz.k256.sdk.types;

/**
 * Per-writable-account fee data.
 * Solana's scheduler limits each writable account to 12M CU per block.
 */
public record AccountFee(
    /** Account public key (Base58) */
    String pubkey,
    /** Total transactions touching this account in the window */
    int totalTxs,
    /** Number of slots where this account was active */
    int activeSlots,
    /** Total CU consumed by transactions touching this account */
    long cuConsumed,
    /** Account utilization percentage (0-100) of 12M CU limit */
    float utilizationPct,
    /** 25th percentile fee in microlamports/CU */
    long p25,
    /** 50th percentile fee in microlamports/CU */
    long p50,
    /** 75th percentile fee in microlamports/CU */
    long p75,
    /** 90th percentile fee in microlamports/CU */
    long p90,
    /** Minimum non-zero fee observed */
    long minNonzeroPrice
) {}
