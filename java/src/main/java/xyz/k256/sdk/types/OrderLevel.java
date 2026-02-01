package xyz.k256.sdk.types;

/**
 * Order book level with price and size.
 */
public record OrderLevel(
    /** Price in base units */
    long price,
    /** Size in base units */
    long size
) {}
