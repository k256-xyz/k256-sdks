/**
 * @file base58.hpp
 * @brief Base58 encoding/decoding utilities for Solana addresses
 */

#ifndef K256_BASE58_HPP
#define K256_BASE58_HPP

#include <string>
#include <vector>
#include <cstdint>
#include <stdexcept>
#include <array>

namespace k256 {

/**
 * @brief Base58 encoding/decoding utilities
 */
class Base58 {
public:
    /**
     * @brief Encode bytes to base58 string
     * @param data Bytes to encode
     * @return Base58-encoded string
     */
    static std::string encode(const std::vector<uint8_t>& data) {
        return encode(data.data(), data.size());
    }

    /**
     * @brief Encode bytes to base58 string
     * @param data Pointer to bytes
     * @param len Length of data
     * @return Base58-encoded string
     */
    static std::string encode(const uint8_t* data, size_t len) {
        if (len == 0) return "";

        // Count leading zeros
        size_t leading_zeros = 0;
        for (size_t i = 0; i < len && data[i] == 0; ++i) {
            ++leading_zeros;
        }

        // Allocate enough space
        std::vector<uint8_t> temp(len * 2, 0);
        size_t output_start = temp.size();

        // Copy input for in-place modification
        std::vector<uint8_t> input(data, data + len);

        for (size_t input_start = leading_zeros; input_start < len; ) {
            uint32_t remainder = 0;
            for (size_t i = input_start; i < len; ++i) {
                uint32_t digit = static_cast<uint32_t>(input[i]) + (remainder << 8);
                input[i] = static_cast<uint8_t>(digit / 58);
                remainder = digit % 58;
                if (input[input_start] == 0) {
                    ++input_start;
                }
            }
            temp[--output_start] = ALPHABET[remainder];
        }

        // Add leading '1's for leading zeros
        while (leading_zeros-- > 0) {
            temp[--output_start] = '1';
        }

        return std::string(temp.begin() + output_start, temp.end());
    }

    /**
     * @brief Decode base58 string to bytes
     * @param input Base58-encoded string
     * @return Decoded bytes
     * @throws std::invalid_argument if string contains invalid characters
     */
    static std::vector<uint8_t> decode(const std::string& input) {
        if (input.empty()) return {};

        // Count leading '1's
        size_t leading_ones = 0;
        for (size_t i = 0; i < input.size() && input[i] == '1'; ++i) {
            ++leading_ones;
        }

        // Allocate space
        std::vector<uint8_t> temp(input.size(), 0);
        size_t output_start = temp.size();

        for (size_t i = leading_ones; i < input.size(); ++i) {
            unsigned char uc = static_cast<unsigned char>(input[i]);
            int index = (uc < INDEXES.size()) ? INDEXES[uc] : -1;
            if (index < 0) {
                throw std::invalid_argument(std::string("Invalid Base58 character: ") + input[i]);
            }

            uint32_t carry = static_cast<uint32_t>(index);
            for (size_t j = temp.size() - 1; j >= output_start || carry != 0; --j) {
                carry += 58 * static_cast<uint32_t>(temp[j]);
                temp[j] = static_cast<uint8_t>(carry & 0xFF);
                carry >>= 8;
                if (j <= output_start && carry != 0) {
                    --output_start;
                }
                if (j == 0) break;
            }
        }

        // Build result with leading zeros
        std::vector<uint8_t> result(leading_ones + (temp.size() - output_start));
        std::copy(temp.begin() + output_start, temp.end(), result.begin() + leading_ones);
        return result;
    }

    /**
     * @brief Check if a string is a valid Solana public key
     * @param address Base58-encoded address
     * @return True if valid, false otherwise
     */
    static bool is_valid_pubkey(const std::string& address) {
        if (address.length() < 32 || address.length() > 44) {
            return false;
        }
        try {
            auto decoded = decode(address);
            return decoded.size() == 32;
        } catch (...) {
            return false;
        }
    }

private:
    static constexpr const char* ALPHABET = 
        "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    static constexpr std::array<int8_t, 128> make_indexes() {
        std::array<int8_t, 128> indexes{};
        for (auto& i : indexes) i = -1;
        for (int i = 0; ALPHABET[i]; ++i) {
            indexes[ALPHABET[i]] = i;
        }
        return indexes;
    }

    static constexpr std::array<int8_t, 128> INDEXES = make_indexes();
};

// Convenience functions
inline std::string base58_encode(const std::vector<uint8_t>& data) {
    return Base58::encode(data);
}

inline std::string base58_encode(const uint8_t* data, size_t len) {
    return Base58::encode(data, len);
}

inline std::vector<uint8_t> base58_decode(const std::string& input) {
    return Base58::decode(input);
}

inline bool is_valid_pubkey(const std::string& address) {
    return Base58::is_valid_pubkey(address);
}

} // namespace k256

#endif // K256_BASE58_HPP
