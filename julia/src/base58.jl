const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
const BASE = 58

# Pre-compute alphabet indexes
const ALPHABET_MAP = let
    map = Dict{Char, Int}()
    for (i, c) in enumerate(ALPHABET)
        map[c] = i - 1  # 0-indexed
    end
    map
end

"""
    base58_encode(data::Vector{UInt8}) -> String

Encode bytes to base58 string.

# Arguments
- `data`: Bytes to encode

# Returns
- Base58-encoded string
"""
function base58_encode(data::Vector{UInt8})::String
    isempty(data) && return ""
    
    # Count leading zeros
    leading_zeros = 0
    for byte in data
        byte == 0 || break
        leading_zeros += 1
    end
    
    # Convert to big integer
    num = BigInt(0)
    for byte in data
        num = num * 256 + byte
    end
    
    # Convert to base58
    result = Char[]
    while num > 0
        num, remainder = divrem(num, BASE)
        pushfirst!(result, ALPHABET[remainder + 1])
    end
    
    # Add leading '1's
    return repeat("1", leading_zeros) * String(result)
end

"""
    base58_decode(str::String) -> Vector{UInt8}

Decode base58 string to bytes.

# Arguments
- `str`: Base58-encoded string

# Returns
- Decoded bytes

# Throws
- `ArgumentError` if string contains invalid characters
"""
function base58_decode(str::String)::Vector{UInt8}
    isempty(str) && return UInt8[]
    
    # Count leading '1's
    leading_ones = 0
    for c in str
        c == '1' || break
        leading_ones += 1
    end
    
    # Convert from base58 to integer
    num = BigInt(0)
    for c in str
        idx = get(ALPHABET_MAP, c, -1)
        idx >= 0 || throw(ArgumentError("Invalid Base58 character: $c"))
        num = num * BASE + idx
    end
    
    # Convert to bytes
    bytes = UInt8[]
    while num > 0
        num, remainder = divrem(num, 256)
        pushfirst!(bytes, UInt8(remainder))
    end
    
    # Add leading zero bytes
    return vcat(zeros(UInt8, leading_ones), bytes)
end

"""
    is_valid_pubkey(address::String) -> Bool

Check if a string is a valid Solana public key.

# Arguments
- `address`: Base58-encoded address

# Returns
- `true` if valid, `false` otherwise
"""
function is_valid_pubkey(address::String)::Bool
    (length(address) < 32 || length(address) > 44) && return false
    
    try
        decoded = base58_decode(address)
        return length(decoded) == 32
    catch
        return false
    end
end
