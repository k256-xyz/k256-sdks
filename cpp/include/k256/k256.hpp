/**
 * @file k256.hpp
 * @brief Main header for K256 SDK - the gateway to Solana's liquidity ecosystem
 *
 * This is a header-only C++ SDK for K256. Include this file to get all
 * types, decoder, and utilities.
 *
 * @code
 * #include <k256/k256.hpp>
 *
 * // Decode priority fees
 * auto fees = k256::decode_priority_fees(payload);
 * std::cout << "Recommended fee: " << fees.recommended << std::endl;
 * @endcode
 */

#ifndef K256_HPP
#define K256_HPP

#include "types.hpp"
#include "decoder.hpp"
#include "base58.hpp"

namespace k256 {

/// SDK version
inline constexpr const char* VERSION = "0.1.0";

} // namespace k256

#endif // K256_HPP
