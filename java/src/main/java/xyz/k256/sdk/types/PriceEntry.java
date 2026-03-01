package xyz.k256.sdk.types;

/**
 * Single token price from the price feed.
 * Wire format per entry: 56 bytes [mint:32B][usd_price:u64 LE][slot:u64 LE][timestamp_ms:u64 LE]
 * usd_price uses fixed-point with 10^12 precision.
 */
public record PriceEntry(
    String mint,
    double usdPrice,
    long slot,
    long timestampMs
) {}
