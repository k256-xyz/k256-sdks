"""
    K256

Official Julia SDK for K256 - the gateway to Solana's liquidity ecosystem.

Connect any application to Solana's liquidity ecosystem. One API. All venues. Full observability.

# Example

```julia
using K256

# Decode fee market (per-writable-account fees)
fees = K256.decode_fee_market(payload)
println("Recommended fee: \$(fees.recommended) microlamports")

# Decode blockhash
bh = K256.decode_blockhash(payload)
println("Blockhash: \$(bh.blockhash)")

# Base58 encoding
address = K256.base58_encode(pubkey_bytes)
if K256.is_valid_pubkey(address)
    println("Valid pubkey: \$address")
end
```
"""
module K256

export MessageType, NetworkState
export OrderLevel, PoolUpdate, AccountFee, FeeMarket, Blockhash, Quote, Heartbeat, Token
export decode_fee_market, decode_blockhash, decode_pool_update, decode_pool_update_batch, decode_quote
export base58_encode, base58_decode, is_valid_pubkey

const VERSION = "0.1.0"

include("types.jl")
include("base58.jl")
include("decoder.jl")

end # module
