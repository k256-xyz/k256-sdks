"""Base58 encoding/decoding utilities for Solana addresses."""

# Base58 alphabet used by Bitcoin/Solana
ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
ALPHABET_MAP = {char: i for i, char in enumerate(ALPHABET)}


def base58_encode(data: bytes) -> str:
    """Encode bytes to base58 string.
    
    Args:
        data: Bytes to encode
        
    Returns:
        Base58-encoded string
    """
    if not data:
        return ""
    
    # Count leading zeros
    leading_zeros = 0
    for byte in data:
        if byte == 0:
            leading_zeros += 1
        else:
            break
    
    # Convert to big integer
    num = int.from_bytes(data, "big")
    
    # Convert to base58
    result = []
    while num > 0:
        num, remainder = divmod(num, 58)
        result.append(ALPHABET[remainder:remainder + 1])
    
    # Add leading '1's for each leading zero byte
    result.extend([b"1"] * leading_zeros)
    
    return b"".join(reversed(result)).decode("ascii")


def base58_decode(s: str) -> bytes:
    """Decode base58 string to bytes.
    
    Args:
        s: Base58-encoded string
        
    Returns:
        Decoded bytes
        
    Raises:
        ValueError: If string contains invalid characters
    """
    if not s:
        return b""
    
    # Count leading '1's (represent leading zero bytes)
    leading_ones = 0
    for char in s:
        if char == "1":
            leading_ones += 1
        else:
            break
    
    # Convert from base58 to integer
    num = 0
    for char in s:
        char_code = ord(char)
        if char_code not in ALPHABET_MAP:
            raise ValueError(f"Invalid base58 character: {char}")
        num = num * 58 + ALPHABET_MAP[char_code]
    
    # Convert to bytes
    if num == 0:
        result = b""
    else:
        result = []
        while num > 0:
            result.append(num & 0xFF)
            num >>= 8
        result = bytes(reversed(result))
    
    # Add leading zero bytes
    return b"\x00" * leading_ones + result


def is_valid_pubkey(address: str) -> bool:
    """Check if a string is a valid Solana public key.
    
    Args:
        address: Base58-encoded address to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not address or not isinstance(address, str):
        return False
    
    # Solana pubkeys are 32 bytes, which encode to 32-44 base58 chars
    if len(address) < 32 or len(address) > 44:
        return False
    
    try:
        decoded = base58_decode(address)
        return len(decoded) == 32
    except (ValueError, Exception):
        return False
