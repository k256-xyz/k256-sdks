# frozen_string_literal: true

module K256
  # Base58 encoding/decoding utilities for Solana addresses.
  module Base58
    ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    BASE = ALPHABET.length
    INDEXES = ALPHABET.each_char.with_index.to_h.freeze

    class << self
      # Encode bytes to base58 string.
      #
      # @param data [String, Array<Integer>] Bytes to encode
      # @return [String] Base58-encoded string
      def encode(data)
        data = data.bytes if data.is_a?(String)
        return "" if data.empty?

        # Count leading zeros
        leading_zeros = data.take_while(&:zero?).length

        # Convert to big integer
        num = data.reduce(0) { |acc, byte| (acc << 8) + byte }

        # Convert to base58
        result = []
        while num.positive?
          num, remainder = num.divmod(BASE)
          result.unshift(ALPHABET[remainder])
        end

        # Add leading '1's for leading zeros
        ("1" * leading_zeros) + result.join
      end

      # Decode base58 string to bytes.
      #
      # @param str [String] Base58-encoded string
      # @return [Array<Integer>] Decoded bytes
      # @raise [ArgumentError] if string contains invalid characters
      def decode(str)
        return [] if str.empty?

        # Count leading '1's
        leading_ones = str.chars.take_while { |c| c == "1" }.length

        # Convert from base58 to integer
        num = 0
        str.each_char do |c|
          index = INDEXES[c]
          raise ArgumentError, "Invalid Base58 character: #{c}" if index.nil?

          num = num * BASE + index
        end

        # Convert to bytes
        result = []
        while num.positive?
          result.unshift(num & 0xFF)
          num >>= 8
        end

        # Add leading zero bytes
        ([0] * leading_ones) + result
      end

      # Check if a string is a valid Solana public key.
      #
      # @param address [String] Base58-encoded address
      # @return [Boolean] True if valid
      def valid_pubkey?(address)
        return false if address.nil? || address.length < 32 || address.length > 44

        begin
          decoded = decode(address)
          decoded.length == 32
        rescue ArgumentError
          false
        end
      end
    end
  end
end
