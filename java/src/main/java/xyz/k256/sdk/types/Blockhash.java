package xyz.k256.sdk.types;

/**
 * Recent blockhash from K256.
 * Wire format: 65 bytes, little-endian.
 */
public record Blockhash(
    /** Solana slot of the blockhash (offset 0) */
    long slot,
    /** Unix timestamp in milliseconds (offset 8) */
    long timestampMs,
    /** Base58-encoded recent blockhash (offset 16, 32 bytes) */
    String blockhash,
    /** Block height (offset 48) */
    long blockHeight,
    /** Last valid block height for transactions (offset 56) */
    long lastValidBlockHeight,
    /** Whether data may be stale (offset 64) */
    boolean isStale
) {}
