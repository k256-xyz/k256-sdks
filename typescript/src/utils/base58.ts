/**
 * Base58 encoding utilities for Solana addresses
 * 
 * Solana uses Base58 encoding (Bitcoin-style) for public keys and signatures.
 */

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encode bytes to Base58 string (Solana address format)
 * 
 * @param bytes - Uint8Array to encode
 * @returns Base58 encoded string
 * 
 * @example
 * ```typescript
 * const pubkey = new Uint8Array([1, 2, 3, ...]);
 * const address = base58Encode(pubkey);
 * // "EPjFWdd5..."
 * ```
 */
export function base58Encode(bytes: Uint8Array): string {
  const digits = [0];
  
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Leading zeros
  let leadingZeros = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    leadingZeros += '1';
  }

  return leadingZeros + digits.reverse().map(d => BASE58_ALPHABET[d]).join('');
}

/**
 * Decode Base58 string to bytes
 * 
 * @param str - Base58 encoded string
 * @returns Uint8Array of decoded bytes
 * @throws Error if string contains invalid characters
 * 
 * @example
 * ```typescript
 * const bytes = base58Decode("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
 * // Uint8Array(32) [...]
 * ```
 */
export function base58Decode(str: string): Uint8Array {
  const bytes = [0];
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE58_ALPHABET.indexOf(char);
    
    if (value === -1) {
      throw new Error(`Invalid Base58 character: ${char}`);
    }
    
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Leading '1's are leading zeros
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
}

/**
 * Check if a string is a valid Solana public key (Base58, 32-44 chars)
 * 
 * @param address - String to validate
 * @returns true if valid Solana pubkey format
 * 
 * @example
 * ```typescript
 * isValidPubkey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // true
 * isValidPubkey("invalid") // false
 * ```
 */
export function isValidPubkey(address: string): boolean {
  // Solana pubkeys are 32-44 characters in Base58
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // Check all characters are valid Base58
  for (const char of address) {
    if (!BASE58_ALPHABET.includes(char)) {
      return false;
    }
  }

  // Try to decode and verify length
  try {
    const bytes = base58Decode(address);
    return bytes.length === 32;
  } catch {
    return false;
  }
}
