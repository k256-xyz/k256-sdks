import Foundation

/// Base58 encoding/decoding utilities for Solana addresses.
public enum Base58 {
    private static let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    private static let alphabetArray = Array(alphabet)
    private static let base = 58

    private static let indexes: [Character: Int] = {
        var map: [Character: Int] = [:]
        for (i, char) in alphabet.enumerated() {
            map[char] = i
        }
        return map
    }()

    /// Encode bytes to base58 string.
    ///
    /// - Parameter data: Bytes to encode
    /// - Returns: Base58-encoded string
    public static func encode(_ data: Data) -> String {
        guard !data.isEmpty else { return "" }

        // Count leading zeros
        var leadingZeros = 0
        for byte in data {
            if byte == 0 {
                leadingZeros += 1
            } else {
                break
            }
        }

        // Use digit-by-digit algorithm to avoid integer overflow
        // Work with an array of base-58 digits
        var digits: [Int] = [0]
        
        for byte in data {
            var carry = Int(byte)
            for j in 0..<digits.count {
                carry += digits[j] << 8
                digits[j] = carry % base
                carry /= base
            }
            while carry > 0 {
                digits.append(carry % base)
                carry /= base
            }
        }

        // Build result string (digits are in reverse order)
        var result = ""
        
        // Add leading '1's for leading zeros
        for _ in 0..<leadingZeros {
            result.append("1")
        }
        
        // Add encoded digits in reverse
        for digit in digits.reversed() {
            result.append(alphabetArray[digit])
        }

        return result
    }

    /// Encode bytes to base58 string.
    ///
    /// - Parameter bytes: Array of bytes to encode
    /// - Returns: Base58-encoded string
    public static func encode(_ bytes: [UInt8]) -> String {
        encode(Data(bytes))
    }

    /// Decode base58 string to bytes.
    ///
    /// - Parameter string: Base58-encoded string
    /// - Returns: Decoded bytes, or nil if invalid
    public static func decode(_ string: String) -> Data? {
        guard !string.isEmpty else { return Data() }

        // Count leading '1's (leading zeros)
        var leadingOnes = 0
        for char in string {
            if char == "1" {
                leadingOnes += 1
            } else {
                break
            }
        }

        // Use digit-by-digit algorithm to avoid integer overflow
        // Work with an array of base-256 digits (bytes)
        var bytes: [UInt8] = [0]
        
        for char in string.dropFirst(leadingOnes) {
            guard let index = indexes[char] else {
                return nil  // Invalid character
            }
            
            var carry = index
            for j in 0..<bytes.count {
                carry += Int(bytes[j]) * base
                bytes[j] = UInt8(carry & 0xFF)
                carry >>= 8
            }
            while carry > 0 {
                bytes.append(UInt8(carry & 0xFF))
                carry >>= 8
            }
        }

        // Remove trailing zeros from bytes (which are leading zeros in result)
        while bytes.count > 1 && bytes.last == 0 {
            bytes.removeLast()
        }
        
        // Handle case where input was all '1's
        if bytes.count == 1 && bytes[0] == 0 && leadingOnes > 0 {
            bytes.removeAll()
        }

        // Build result: leading zeros + reversed bytes
        var result = [UInt8](repeating: 0, count: leadingOnes)
        result.append(contentsOf: bytes.reversed())
        
        return Data(result)
    }

    /// Check if a string is a valid Solana public key.
    ///
    /// - Parameter address: Base58-encoded address
    /// - Returns: True if valid
    public static func isValidPubkey(_ address: String) -> Bool {
        guard address.count >= 32 && address.count <= 44 else {
            return false
        }
        guard let decoded = decode(address) else {
            return false
        }
        return decoded.count == 32
    }
}
