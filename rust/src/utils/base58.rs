//! Base58 encoding/decoding utilities for Solana addresses.

/// Encode bytes to base58 string.
pub fn base58_encode(data: &[u8]) -> String {
    bs58::encode(data).into_string()
}

/// Decode base58 string to bytes.
pub fn base58_decode(s: &str) -> Result<Vec<u8>, bs58::decode::Error> {
    bs58::decode(s).into_vec()
}

/// Check if a string is a valid Solana public key.
///
/// # Arguments
///
/// * `address` - Base58-encoded address to validate
///
/// # Returns
///
/// True if valid, false otherwise
pub fn is_valid_pubkey(address: &str) -> bool {
    // Solana pubkeys are 32 bytes, which encode to 32-44 base58 chars
    if address.len() < 32 || address.len() > 44 {
        return false;
    }

    match bs58::decode(address).into_vec() {
        Ok(decoded) => decoded.len() == 32,
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_pubkey() {
        // Valid Solana pubkey (SOL mint)
        assert!(is_valid_pubkey(
            "So11111111111111111111111111111111111111112"
        ));
        // Valid USDC mint
        assert!(is_valid_pubkey(
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        ));
    }

    #[test]
    fn test_invalid_pubkey() {
        assert!(!is_valid_pubkey(""));
        assert!(!is_valid_pubkey("tooshort"));
        assert!(!is_valid_pubkey("invalid!@#$"));
    }

    #[test]
    fn test_base58_roundtrip() {
        let original = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let encoded = base58_encode(&original);
        let decoded = base58_decode(&encoded).unwrap();
        assert_eq!(original, decoded);
    }
}
