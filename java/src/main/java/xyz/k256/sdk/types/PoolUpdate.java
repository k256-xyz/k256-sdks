package xyz.k256.sdk.types;

import java.util.List;
import java.util.Optional;

/**
 * Real-time pool state update from K256 WebSocket.
 */
public record PoolUpdate(
    /** Global sequence number for ordering */
    long sequence,
    /** Solana slot number */
    long slot,
    /** Write version within slot */
    long writeVersion,
    /** DEX protocol name (e.g., "RaydiumClmm", "Whirlpool") */
    String protocolName,
    /** Base58-encoded pool address */
    String poolAddress,
    /** List of token mint addresses */
    List<String> tokenMints,
    /** List of token balances (same order as mints) */
    List<Long> tokenBalances,
    /** List of token decimals (same order as mints) */
    List<Integer> tokenDecimals,
    /** Best bid order level, if available */
    Optional<OrderLevel> bestBid,
    /** Best ask order level, if available */
    Optional<OrderLevel> bestAsk,
    /** Opaque pool state bytes */
    byte[] serializedState
) {}
