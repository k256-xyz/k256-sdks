# frozen_string_literal: true

module K256
  # Binary message decoder for K256 WebSocket protocol.
  module Decoder
    class << self
      # Decode fee market from binary payload (per-writable-account model).
      # Variable-length wire format: 42-byte header + N × 92 bytes per account.
      #
      # @param data [String] Binary payload (without message type byte)
      # @return [FeeMarket, nil] Decoded fee market or nil if too short
      def decode_fee_market(data)
        return nil if data.bytesize < 42

        bytes = data.bytes

        slot = read_u64_le(bytes, 0)
        timestamp_ms = read_u64_le(bytes, 8)
        recommended = read_u64_le(bytes, 16)
        state = bytes[24]
        is_stale = bytes[25] != 0
        block_utilization_pct = read_f32_le(bytes, 26)
        blocks_in_window = read_u32_le(bytes, 30)
        account_count = read_u64_le(bytes, 34)

        accounts = []
        offset = 42
        account_count.times do
          break if offset + 92 > bytes.length
          pubkey = Base58.encode(bytes[offset, 32])
          total_txs = read_u32_le(bytes, offset + 32)
          active_slots = read_u32_le(bytes, offset + 36)
          cu_consumed = read_u64_le(bytes, offset + 40)
          utilization_pct = read_f32_le(bytes, offset + 48)
          p25 = read_u64_le(bytes, offset + 52)
          p50 = read_u64_le(bytes, offset + 60)
          p75 = read_u64_le(bytes, offset + 68)
          p90 = read_u64_le(bytes, offset + 76)
          min_nonzero_price = read_u64_le(bytes, offset + 84)

          accounts << AccountFee.new(
            pubkey: pubkey, total_txs: total_txs, active_slots: active_slots,
            cu_consumed: cu_consumed, utilization_pct: utilization_pct,
            p25: p25, p50: p50, p75: p75, p90: p90,
            min_nonzero_price: min_nonzero_price
          )
          offset += 92
        end

        FeeMarket.new(
          slot: slot, timestamp_ms: timestamp_ms, recommended: recommended,
          state: state, is_stale: is_stale,
          block_utilization_pct: block_utilization_pct,
          blocks_in_window: blocks_in_window,
          accounts: accounts
        )
      end

      # Decode blockhash from binary payload.
      # Wire format: 65 bytes, little-endian.
      #
      # @param data [String] Binary payload (without message type byte)
      # @return [Blockhash, nil] Decoded blockhash or nil if too short
      def decode_blockhash(data)
        return nil if data.bytesize < 65

        bytes = data.bytes

        Blockhash.new(
          slot: read_u64_le(bytes, 0),
          timestamp_ms: read_u64_le(bytes, 8),
          blockhash: Base58.encode(bytes[16, 32]),
          block_height: read_u64_le(bytes, 48),
          last_valid_block_height: read_u64_le(bytes, 56),
          is_stale: bytes[64] != 0
        )
      end

      # Decode a single pool update from binary payload.
      #
      # @param data [String] Binary payload (without message type byte)
      # @return [PoolUpdate, nil] Decoded update or nil if decoding fails
      def decode_pool_update(data)
        return nil if data.bytesize < 8

        bytes = data.bytes
        offset = 0

        # serialized_state: Bytes (u64 len + bytes)
        state_len = read_u64_le(bytes, offset)
        offset += 8
        return nil if offset + state_len > bytes.length
        serialized_state = bytes[offset, state_len].pack("C*")
        offset += state_len

        # sequence (u64)
        return nil if offset + 8 > bytes.length
        sequence = read_u64_le(bytes, offset)
        offset += 8

        # slot (u64)
        return nil if offset + 8 > bytes.length
        slot = read_u64_le(bytes, offset)
        offset += 8

        # write_version (u64)
        return nil if offset + 8 > bytes.length
        write_version = read_u64_le(bytes, offset)
        offset += 8

        # protocol_name: String (u64 len + UTF-8 bytes)
        return nil if offset + 8 > bytes.length
        protocol_len = read_u64_le(bytes, offset)
        offset += 8
        return nil if offset + protocol_len > bytes.length
        protocol_name = bytes[offset, protocol_len].pack("C*").force_encoding("UTF-8")
        offset += protocol_len

        # pool_address: [u8; 32]
        return nil if offset + 32 > bytes.length
        pool_address = Base58.encode(bytes[offset, 32])
        offset += 32

        # all_token_mints: Vec<[u8; 32]>
        return nil if offset + 8 > bytes.length
        mint_count = read_u64_le(bytes, offset)
        offset += 8
        return nil if offset + mint_count * 32 > bytes.length
        token_mints = mint_count.times.map do
          mint = Base58.encode(bytes[offset, 32])
          offset += 32
          mint
        end

        # all_token_balances: Vec<u64>
        return nil if offset + 8 > bytes.length
        balance_count = read_u64_le(bytes, offset)
        offset += 8
        return nil if offset + balance_count * 8 > bytes.length
        token_balances = balance_count.times.map do
          balance = read_u64_le(bytes, offset)
          offset += 8
          balance
        end

        # all_token_decimals: Vec<i32>
        return nil if offset + 8 > bytes.length
        decimals_count = read_u64_le(bytes, offset)
        offset += 8
        return nil if offset + decimals_count * 4 > bytes.length
        token_decimals = decimals_count.times.map do
          dec = read_i32_le(bytes, offset)
          offset += 4
          dec
        end

        # best_bid: Option<OrderLevel>
        best_bid = nil
        if offset < bytes.length && bytes[offset] == 1
          offset += 1
          return nil if offset + 16 > bytes.length
          best_bid = OrderLevel.new(
            price: read_u64_le(bytes, offset),
            size: read_u64_le(bytes, offset + 8)
          )
          offset += 16
        elsif offset < bytes.length
          offset += 1
        end

        # best_ask: Option<OrderLevel>
        best_ask = nil
        if offset < bytes.length && bytes[offset] == 1
          offset += 1
          return nil if offset + 16 > bytes.length
          best_ask = OrderLevel.new(
            price: read_u64_le(bytes, offset),
            size: read_u64_le(bytes, offset + 8)
          )
        end

        PoolUpdate.new(
          sequence: sequence,
          slot: slot,
          write_version: write_version,
          protocol_name: protocol_name,
          pool_address: pool_address,
          token_mints: token_mints,
          token_balances: token_balances,
          token_decimals: token_decimals,
          best_bid: best_bid,
          best_ask: best_ask,
          serialized_state: serialized_state
        )
      rescue StandardError
        nil
      end

      # Decode a batch of pool updates.
      # Wire format: [u16 count][u32 len1][payload1]...
      #
      # @param data [String] Binary payload (without message type byte)
      # @return [Array<PoolUpdate>] Decoded updates
      def decode_pool_update_batch(data)
        return [] if data.bytesize < 2

        bytes = data.bytes
        count = read_u16_le(bytes, 0)
        offset = 2

        updates = []
        count.times do
          break if offset + 4 > bytes.length

          payload_len = read_u32_le(bytes, offset)
          offset += 4

          break if offset + payload_len > bytes.length

          update_data = bytes[offset, payload_len].pack("C*")
          update = decode_pool_update(update_data)
          updates << update if update

          offset += payload_len
        end

        updates
      end

      # Decode a quote from binary payload.
      #
      # @param data [String] Binary payload (without message type byte)
      # @return [Quote, nil] Decoded quote or nil if decoding fails
      def decode_quote(data)
        return nil if data.bytesize < 8

        bytes = data.bytes
        offset = 0

        # topic_id: String (u64 len + UTF-8 bytes)
        topic_len = read_u64_le(bytes, offset)
        offset += 8
        topic_id = bytes[offset, topic_len].pack("C*").force_encoding("UTF-8")
        offset += topic_len

        # timestamp_ms (u64)
        timestamp_ms = read_u64_le(bytes, offset)
        offset += 8

        # sequence (u64)
        sequence = read_u64_le(bytes, offset)
        offset += 8

        # input_mint ([u8; 32])
        input_mint = Base58.encode(bytes[offset, 32])
        offset += 32

        # output_mint ([u8; 32])
        output_mint = Base58.encode(bytes[offset, 32])
        offset += 32

        # in_amount (u64)
        in_amount = read_u64_le(bytes, offset)
        offset += 8

        # out_amount (u64)
        out_amount = read_u64_le(bytes, offset)
        offset += 8

        # price_impact_bps (i32)
        price_impact_bps = read_i32_le(bytes, offset)
        offset += 4

        # context_slot (u64)
        context_slot = read_u64_le(bytes, offset)
        offset += 8

        # algorithm: String (u64 len + UTF-8 bytes)
        algo_len = read_u64_le(bytes, offset)
        offset += 8
        algorithm = bytes[offset, algo_len].pack("C*").force_encoding("UTF-8")
        offset += algo_len

        # is_improvement (bool)
        is_improvement = bytes[offset] != 0
        offset += 1

        # is_cached (bool)
        is_cached = bytes[offset] != 0
        offset += 1

        # is_stale (bool)
        is_stale = bytes[offset] != 0
        offset += 1

        # route_plan_json: Vec<u8> (u64 len + bytes)
        route_plan_json = nil
        if offset + 8 <= bytes.length
          route_len = read_u64_le(bytes, offset)
          offset += 8
          if route_len.positive? && offset + route_len <= bytes.length
            route_plan_json = bytes[offset, route_len].pack("C*").force_encoding("UTF-8")
          end
        end

        Quote.new(
          topic_id: topic_id,
          timestamp_ms: timestamp_ms,
          sequence: sequence,
          input_mint: input_mint,
          output_mint: output_mint,
          in_amount: in_amount,
          out_amount: out_amount,
          price_impact_bps: price_impact_bps,
          context_slot: context_slot,
          algorithm: algorithm,
          is_improvement: is_improvement,
          is_cached: is_cached,
          is_stale: is_stale,
          route_plan_json: route_plan_json
        )
      rescue StandardError
        nil
      end

      private

      def read_u64_le(bytes, offset)
        bytes[offset, 8].each_with_index.reduce(0) do |acc, (byte, i)|
          acc | (byte << (i * 8))
        end
      end

      def read_u32_le(bytes, offset)
        bytes[offset, 4].each_with_index.reduce(0) do |acc, (byte, i)|
          acc | (byte << (i * 8))
        end
      end

      def read_u16_le(bytes, offset)
        bytes[offset] | (bytes[offset + 1] << 8)
      end

      def read_i32_le(bytes, offset)
        val = read_u32_le(bytes, offset)
        val >= 0x80000000 ? val - 0x100000000 : val
      end

      def read_f32_le(bytes, offset)
        bytes[offset, 4].pack("C*").unpack1("e")
      end
    end
  end
end
