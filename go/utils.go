package k256

import (
	"github.com/mr-tron/base58"
)

// Base58Encode encodes bytes to base58 string.
func Base58Encode(data []byte) string {
	return base58.Encode(data)
}

// Base58Decode decodes base58 string to bytes.
func Base58Decode(s string) ([]byte, error) {
	return base58.Decode(s)
}

// IsValidPubkey checks if a string is a valid Solana public key.
func IsValidPubkey(address string) bool {
	// Solana pubkeys are 32 bytes, which encode to 32-44 base58 chars
	if len(address) < 32 || len(address) > 44 {
		return false
	}

	decoded, err := base58.Decode(address)
	if err != nil {
		return false
	}

	return len(decoded) == 32
}
