package xyz.k256.sdk.types;

/**
 * Swap quote from K256.
 */
public record Quote(
    /** Topic ID for the quote subscription */
    String topicId,
    /** Unix timestamp in milliseconds */
    long timestampMs,
    /** Sequence number */
    long sequence,
    /** Input token mint address */
    String inputMint,
    /** Output token mint address */
    String outputMint,
    /** Input amount in base units */
    long inAmount,
    /** Output amount in base units */
    long outAmount,
    /** Price impact in basis points */
    int priceImpactBps,
    /** Solana slot of the quote */
    long contextSlot,
    /** Algorithm used for routing */
    String algorithm,
    /** Whether this is an improvement over previous quote */
    boolean isImprovement,
    /** Whether this quote is from cache */
    boolean isCached,
    /** Whether this quote may be stale */
    boolean isStale,
    /** JSON route plan */
    String routePlanJson
) {}
