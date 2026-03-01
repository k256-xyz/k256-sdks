import Foundation

/// Binary message decoder for K256 WebSocket protocol.
public enum K256Decoder {
    /// Decode fee market from binary payload (per-writable-account model).
    /// Variable-length wire format: 42-byte header + N × 92 bytes per account.
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Decoded FeeMarket or nil if too short
    public static func decodeFeeMarket(_ data: Data) -> K256FeeMarket? {
        guard data.count >= 42 else { return nil }

        let slot = readU64LE(data, at: 0)
        let timestampMs = readU64LE(data, at: 8)
        let recommended = readU64LE(data, at: 16)
        let state = K256NetworkState(rawValue: data[24]) ?? .normal
        let isStale = data[25] != 0
        let blockUtilizationPct = readF32LE(data, at: 26)
        let blocksInWindow = readU32LE(data, at: 30)
        let accountCount = Int(readU64LE(data, at: 34))

        var accounts: [K256AccountFee] = []
        var offset = 42
        for _ in 0..<accountCount {
            guard offset + 92 <= data.count else { break }
            let pubkey = Base58.encode(data.subdata(in: offset..<(offset + 32)))
            let totalTxs = readU32LE(data, at: offset + 32)
            let activeSlots = readU32LE(data, at: offset + 36)
            let cuConsumed = readU64LE(data, at: offset + 40)
            let utilizationPct = readF32LE(data, at: offset + 48)
            let p25 = readU64LE(data, at: offset + 52)
            let p50 = readU64LE(data, at: offset + 60)
            let p75 = readU64LE(data, at: offset + 68)
            let p90 = readU64LE(data, at: offset + 76)
            let minNonzeroPrice = readU64LE(data, at: offset + 84)

            accounts.append(K256AccountFee(
                pubkey: pubkey,
                totalTxs: totalTxs,
                activeSlots: activeSlots,
                cuConsumed: cuConsumed,
                utilizationPct: utilizationPct,
                p25: p25, p50: p50, p75: p75, p90: p90,
                minNonzeroPrice: minNonzeroPrice
            ))
            offset += 92
        }

        return K256FeeMarket(
            slot: slot,
            timestampMs: timestampMs,
            recommended: recommended,
            state: state,
            isStale: isStale,
            blockUtilizationPct: blockUtilizationPct,
            blocksInWindow: blocksInWindow,
            accounts: accounts
        )
    }

    /// Decode blockhash from binary payload.
    /// Wire format: 65 bytes, little-endian.
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Decoded Blockhash or nil if too short
    public static func decodeBlockhash(_ data: Data) -> K256Blockhash? {
        guard data.count >= 65 else { return nil }

        let blockhashBytes = data.subdata(in: 16..<48)

        return K256Blockhash(
            slot: readU64LE(data, at: 0),
            timestampMs: readU64LE(data, at: 8),
            blockhash: Base58.encode(blockhashBytes),
            blockHeight: readU64LE(data, at: 48),
            lastValidBlockHeight: readU64LE(data, at: 56),
            isStale: data[64] != 0
        )
    }

    /// Decode a single pool update from binary payload.
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Decoded PoolUpdate or nil if decoding fails
    public static func decodePoolUpdate(_ data: Data) -> K256PoolUpdate? {
        guard data.count >= 50 else { return nil }

        var offset = 0

        // serialized_state: Bytes (u64 len + bytes)
        let stateLen = Int(readU64LE(data, at: offset))
        offset += 8
        guard offset + stateLen <= data.count else { return nil }
        let serializedState = data.subdata(in: offset..<(offset + stateLen))
        offset += stateLen

        // sequence (u64)
        guard offset + 8 <= data.count else { return nil }
        let sequence = readU64LE(data, at: offset)
        offset += 8

        // slot (u64)
        guard offset + 8 <= data.count else { return nil }
        let slot = readU64LE(data, at: offset)
        offset += 8

        // write_version (u64)
        guard offset + 8 <= data.count else { return nil }
        let writeVersion = readU64LE(data, at: offset)
        offset += 8

        // protocol_name: String (u64 len + UTF-8 bytes)
        guard offset + 8 <= data.count else { return nil }
        let protocolLen = Int(readU64LE(data, at: offset))
        offset += 8
        guard offset + protocolLen <= data.count else { return nil }
        let protocolName = String(data: data.subdata(in: offset..<(offset + protocolLen)), encoding: .utf8) ?? ""
        offset += protocolLen

        // pool_address: [u8; 32]
        guard offset + 32 <= data.count else { return nil }
        let poolAddress = Base58.encode(data.subdata(in: offset..<(offset + 32)))
        offset += 32

        // all_token_mints: Vec<[u8; 32]>
        guard offset + 8 <= data.count else { return nil }
        let mintCount = Int(readU64LE(data, at: offset))
        offset += 8
        var tokenMints: [String] = []
        for _ in 0..<mintCount {
            guard offset + 32 <= data.count else { return nil }
            tokenMints.append(Base58.encode(data.subdata(in: offset..<(offset + 32))))
            offset += 32
        }

        // all_token_balances: Vec<u64>
        guard offset + 8 <= data.count else { return nil }
        let balanceCount = Int(readU64LE(data, at: offset))
        offset += 8
        var tokenBalances: [UInt64] = []
        for _ in 0..<balanceCount {
            guard offset + 8 <= data.count else { return nil }
            tokenBalances.append(readU64LE(data, at: offset))
            offset += 8
        }

        // all_token_decimals: Vec<i32>
        guard offset + 8 <= data.count else { return nil }
        let decimalsCount = Int(readU64LE(data, at: offset))
        offset += 8
        var tokenDecimals: [Int32] = []
        for _ in 0..<decimalsCount {
            guard offset + 4 <= data.count else { return nil }
            tokenDecimals.append(readI32LE(data, at: offset))
            offset += 4
        }

        // best_bid: Option<OrderLevel>
        var bestBid: K256OrderLevel? = nil
        if offset < data.count && data[offset] == 1 {
            offset += 1
            guard offset + 16 <= data.count else { return nil }
            bestBid = K256OrderLevel(
                price: readU64LE(data, at: offset),
                size: readU64LE(data, at: offset + 8)
            )
            offset += 16
        } else if offset < data.count {
            offset += 1
        }

        // best_ask: Option<OrderLevel>
        var bestAsk: K256OrderLevel? = nil
        if offset < data.count && data[offset] == 1 {
            offset += 1
            guard offset + 16 <= data.count else { return nil }
            bestAsk = K256OrderLevel(
                price: readU64LE(data, at: offset),
                size: readU64LE(data, at: offset + 8)
            )
        }

        return K256PoolUpdate(
            sequence: sequence,
            slot: slot,
            writeVersion: writeVersion,
            protocolName: protocolName,
            poolAddress: poolAddress,
            tokenMints: tokenMints,
            tokenBalances: tokenBalances,
            tokenDecimals: tokenDecimals,
            bestBid: bestBid,
            bestAsk: bestAsk,
            serializedState: serializedState
        )
    }

    /// Decode a batch of pool updates.
    /// Wire format: [u16 count][u32 len1][payload1]...
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Array of decoded PoolUpdate objects
    public static func decodePoolUpdateBatch(_ data: Data) -> [K256PoolUpdate] {
        guard data.count >= 2 else { return [] }

        let count = Int(readU16LE(data, at: 0))
        var offset = 2

        var updates: [K256PoolUpdate] = []
        for _ in 0..<count {
            guard offset + 4 <= data.count else { break }
            let payloadLen = Int(readU32LE(data, at: offset))
            offset += 4

            guard offset + payloadLen <= data.count else { break }
            let updateData = data.subdata(in: offset..<(offset + payloadLen))
            if let update = decodePoolUpdate(updateData) {
                updates.append(update)
            }
            offset += payloadLen
        }

        return updates
    }

    /// Decode a quote from binary payload.
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Decoded Quote or nil if decoding fails
    public static func decodeQuote(_ data: Data) -> K256Quote? {
        guard data.count >= 8 else { return nil }

        var offset = 0

        // topic_id: String (u64 len + UTF-8 bytes)
        let topicLen = Int(readU64LE(data, at: offset))
        offset += 8
        guard offset + topicLen <= data.count else { return nil }
        let topicId = String(data: data.subdata(in: offset..<(offset + topicLen)), encoding: .utf8) ?? ""
        offset += topicLen

        // timestamp_ms (u64)
        guard offset + 8 <= data.count else { return nil }
        let timestampMs = readU64LE(data, at: offset)
        offset += 8

        // sequence (u64)
        guard offset + 8 <= data.count else { return nil }
        let sequence = readU64LE(data, at: offset)
        offset += 8

        // input_mint ([u8; 32])
        guard offset + 32 <= data.count else { return nil }
        let inputMint = Base58.encode(data.subdata(in: offset..<(offset + 32)))
        offset += 32

        // output_mint ([u8; 32])
        guard offset + 32 <= data.count else { return nil }
        let outputMint = Base58.encode(data.subdata(in: offset..<(offset + 32)))
        offset += 32

        // in_amount (u64)
        guard offset + 8 <= data.count else { return nil }
        let inAmount = readU64LE(data, at: offset)
        offset += 8

        // out_amount (u64)
        guard offset + 8 <= data.count else { return nil }
        let outAmount = readU64LE(data, at: offset)
        offset += 8

        // price_impact_bps (i32)
        guard offset + 4 <= data.count else { return nil }
        let priceImpactBps = readI32LE(data, at: offset)
        offset += 4

        // context_slot (u64)
        guard offset + 8 <= data.count else { return nil }
        let contextSlot = readU64LE(data, at: offset)
        offset += 8

        // algorithm: String (u64 len + UTF-8 bytes)
        guard offset + 8 <= data.count else { return nil }
        let algoLen = Int(readU64LE(data, at: offset))
        offset += 8
        guard offset + algoLen <= data.count else { return nil }
        let algorithm = String(data: data.subdata(in: offset..<(offset + algoLen)), encoding: .utf8) ?? ""
        offset += algoLen

        // is_improvement (bool)
        guard offset + 1 <= data.count else { return nil }
        let isImprovement = data[offset] != 0
        offset += 1

        // is_cached (bool)
        guard offset + 1 <= data.count else { return nil }
        let isCached = data[offset] != 0
        offset += 1

        // is_stale (bool)
        guard offset + 1 <= data.count else { return nil }
        let isStale = data[offset] != 0
        offset += 1

        // route_plan_json: Vec<u8> (u64 len + bytes)
        var routePlanJson: String? = nil
        if offset + 8 <= data.count {
            let routeLen = Int(readU64LE(data, at: offset))
            offset += 8
            if routeLen > 0 && offset + routeLen <= data.count {
                routePlanJson = String(data: data.subdata(in: offset..<(offset + routeLen)), encoding: .utf8)
            }
        }

        return K256Quote(
            topicId: topicId,
            timestampMs: timestampMs,
            sequence: sequence,
            inputMint: inputMint,
            outputMint: outputMint,
            inAmount: inAmount,
            outAmount: outAmount,
            priceImpactBps: priceImpactBps,
            contextSlot: contextSlot,
            algorithm: algorithm,
            isImprovement: isImprovement,
            isCached: isCached,
            isStale: isStale,
            routePlanJson: routePlanJson
        )
    }

    /// Decode price entries from PriceBatch/PriceSnapshot payload.
    /// Wire format: [count:u16 LE][entry_1:56B]...[entry_n:56B]
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Array of decoded PriceEntry objects
    public static func decodePriceEntries(_ data: Data) -> [PriceEntry] {
        guard data.count >= 2 else { return [] }

        let count = Int(readU16LE(data, at: 0))
        var offset = 2
        var entries: [PriceEntry] = []

        for _ in 0..<count {
            guard offset + 56 <= data.count else { break }
            let mint = Base58.encode(data.subdata(in: offset..<(offset + 32)))
            let usdPrice = Double(readU64LE(data, at: offset + 32)) / 1e12
            let slot = readU64LE(data, at: offset + 40)
            let timestampMs = readU64LE(data, at: offset + 48)
            entries.append(PriceEntry(
                mint: mint,
                usdPrice: usdPrice,
                slot: slot,
                timestampMs: timestampMs
            ))
            offset += 56
        }

        return entries
    }

    /// Decode a single price update (56 bytes, no count prefix).
    ///
    /// - Parameter data: Binary payload (without message type byte)
    /// - Returns: Decoded PriceEntry or nil if too short
    public static func decodePriceUpdate(_ data: Data) -> PriceEntry? {
        guard data.count >= 56 else { return nil }

        let mint = Base58.encode(data.subdata(in: 0..<32))
        let usdPrice = Double(readU64LE(data, at: 32)) / 1e12
        let slot = readU64LE(data, at: 40)
        let timestampMs = readU64LE(data, at: 48)

        return PriceEntry(
            mint: mint,
            usdPrice: usdPrice,
            slot: slot,
            timestampMs: timestampMs
        )
    }

    // MARK: - Private helpers

    private static func readU64LE(_ data: Data, at offset: Int) -> UInt64 {
        data.withUnsafeBytes { ptr in
            ptr.loadUnaligned(fromByteOffset: offset, as: UInt64.self).littleEndian
        }
    }

    private static func readU32LE(_ data: Data, at offset: Int) -> UInt32 {
        data.withUnsafeBytes { ptr in
            ptr.loadUnaligned(fromByteOffset: offset, as: UInt32.self).littleEndian
        }
    }

    private static func readU16LE(_ data: Data, at offset: Int) -> UInt16 {
        data.withUnsafeBytes { ptr in
            ptr.loadUnaligned(fromByteOffset: offset, as: UInt16.self).littleEndian
        }
    }

    private static func readI32LE(_ data: Data, at offset: Int) -> Int32 {
        data.withUnsafeBytes { ptr in
            ptr.loadUnaligned(fromByteOffset: offset, as: Int32.self).littleEndian
        }
    }

    private static func readF32LE(_ data: Data, at offset: Int) -> Float {
        let bits = readU32LE(data, at: offset)
        return Float(bitPattern: bits)
    }
}
