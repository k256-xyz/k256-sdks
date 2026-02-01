# frozen_string_literal: true

require_relative "k256/version"
require_relative "k256/types"
require_relative "k256/base58"
require_relative "k256/decoder"
require_relative "k256/client"

# K256 SDK - The gateway to Solana's liquidity ecosystem
#
# @example
#   require 'k256'
#
#   client = K256::Client.new(api_key: ENV['K256_API_KEY'])
#
#   client.on_pool_update do |update|
#     puts "Pool #{update.pool_address}: slot=#{update.slot}"
#   end
#
#   client.connect
#   client.subscribe(channels: ['pools', 'priority_fees', 'blockhash'])
module K256
  class Error < StandardError; end
  class ConnectionError < Error; end
  class DecodeError < Error; end
end
