package xyz.k256.sdk.types;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Token metadata.
 */
public record Token(
    /** Token mint address */
    String address,
    /** Token symbol (e.g., "SOL", "USDC") */
    String symbol,
    /** Token name */
    String name,
    /** Token decimals */
    int decimals,
    /** URL to token logo */
    Optional<String> logoUri,
    /** List of tags */
    Optional<List<String>> tags,
    /** Additional metadata */
    Optional<Map<String, Object>> extensions
) {}
