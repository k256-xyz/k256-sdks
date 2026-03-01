# frozen_string_literal: true

require "websocket-client-simple"
require "json"

module K256
  # K256 WebSocket client for real-time Solana liquidity data.
  #
  # @example
  #   client = K256::Client.new(api_key: ENV['K256_API_KEY'])
  #
  #   client.on_pool_update { |update| puts update.pool_address }
  #   client.on_fee_market { |fees| puts fees.recommended }
  #
  #   client.connect
  #   client.subscribe(channels: ['pools', 'priority_fees', 'blockhash'])
  class Client
    DEFAULT_ENDPOINT = "wss://gateway.k256.xyz/v1/ws"

    attr_reader :api_key, :endpoint, :reconnect, :connected

    # Create a new K256 WebSocket client.
    #
    # @param api_key [String] K256 API key
    # @param endpoint [String] WebSocket endpoint URL
    # @param reconnect [Boolean] Whether to automatically reconnect
    # @param reconnect_delay_initial [Float] Initial reconnect delay in seconds
    # @param reconnect_delay_max [Float] Maximum reconnect delay in seconds
    def initialize(
      api_key:,
      endpoint: DEFAULT_ENDPOINT,
      reconnect: true,
      reconnect_delay_initial: 1.0,
      reconnect_delay_max: 60.0
    )
      @api_key = api_key
      @endpoint = endpoint
      @reconnect = reconnect
      @reconnect_delay_initial = reconnect_delay_initial
      @reconnect_delay_max = reconnect_delay_max
      @reconnect_delay = reconnect_delay_initial

      @callbacks = {}
      @ws = nil
      @connected = false
      @running = false
      @last_subscription = nil
      @last_price_subscription = nil
    end

    # Register a callback for pool updates.
    #
    # @yield [PoolUpdate] Pool update
    def on_pool_update(&block)
      @callbacks[:pool_update] = block
    end

    # Register a callback for fee market updates.
    #
    # @yield [FeeMarket] Fee market data
    def on_fee_market(&block)
      @callbacks[:fee_market] = block
    end

    # Register a callback for blockhash updates.
    #
    # @yield [Blockhash] Blockhash
    def on_blockhash(&block)
      @callbacks[:blockhash] = block
    end

    # Register a callback for quote updates.
    #
    # @yield [Quote] Quote
    def on_quote(&block)
      @callbacks[:quote] = block
    end

    # Register a callback for heartbeat messages.
    #
    # @yield [Heartbeat] Heartbeat
    def on_heartbeat(&block)
      @callbacks[:heartbeat] = block
    end

    # Register a callback for single price updates.
    #
    # @yield [PriceEntry] Price entry
    def on_price_update(&block)
      @callbacks[:price_update] = block
    end

    # Register a callback for batched price updates.
    #
    # @yield [Array<PriceEntry>] Price entries
    def on_price_batch(&block)
      @callbacks[:price_batch] = block
    end

    # Register a callback for price snapshots.
    #
    # @yield [Array<PriceEntry>] Price entries
    def on_price_snapshot(&block)
      @callbacks[:price_snapshot] = block
    end

    # Register a callback for errors.
    #
    # @yield [String] Error message
    def on_error(&block)
      @callbacks[:error] = block
    end

    # Register a callback for connection established.
    #
    # @yield Called when connected
    def on_connected(&block)
      @callbacks[:connected] = block
    end

    # Register a callback for disconnection.
    #
    # @yield Called when disconnected
    def on_disconnected(&block)
      @callbacks[:disconnected] = block
    end

    # Connect to the K256 WebSocket.
    def connect
      @running = true
      do_connect
    end

    # Disconnect from the WebSocket.
    def disconnect
      @running = false
      @ws&.close
      @ws = nil
      @connected = false
    end

    # Subscribe to channels.
    #
    # @param channels [Array<String>] List of channels
    # @param protocols [Array<String>, nil] Optional DEX protocols to filter
    # @param pools [Array<String>, nil] Optional pool addresses to filter
    # @param token_pairs [Array<Array<String>>, nil] Optional token pairs to filter
    def subscribe(channels:, protocols: nil, pools: nil, token_pairs: nil)
      @last_subscription = {
        channels: channels,
        protocols: protocols,
        pools: pools,
        token_pairs: token_pairs
      }

      send_subscribe if @connected
    end

    # Unsubscribe from all channels.
    def unsubscribe
      @last_subscription = nil
      send_json(type: "unsubscribe") if @connected
    end

    # Subscribe to price updates.
    #
    # @param tokens [Array<String>] Token mint addresses (empty = all tokens)
    # @param threshold_bps [Integer] Minimum price change in basis points to trigger update
    def subscribe_prices(tokens: [], threshold_bps: 10)
      @last_price_subscription = {
        tokens: tokens,
        threshold_bps: threshold_bps
      }

      send_price_subscribe if @connected
    end

    # Unsubscribe from price updates.
    def unsubscribe_prices
      @last_price_subscription = nil
      return unless @connected

      @ws&.send([MessageType::UNSUBSCRIBE_PRICE].pack("C"))
    end

    private

    def do_connect
      url = "#{@endpoint}?apiKey=#{@api_key}"

      @ws = WebSocket::Client::Simple.connect(url)
      client = self

      @ws.on :open do
        client.send(:handle_open)
      end

      @ws.on :message do |msg|
        client.send(:handle_message, msg)
      end

      @ws.on :close do |e|
        client.send(:handle_close, e)
      end

      @ws.on :error do |e|
        client.send(:handle_error, e)
      end
    end

    def handle_open
      @connected = true
      @reconnect_delay = @reconnect_delay_initial
      @callbacks[:connected]&.call
      send_subscribe if @last_subscription
      send_price_subscribe if @last_price_subscription
    end

    def handle_message(msg)
      if msg.type == :binary
        handle_binary_message(msg.data)
      else
        handle_text_message(msg.data)
      end
    end

    def handle_binary_message(data)
      return if data.bytesize < 1

      msg_type = data.getbyte(0)
      payload = data[1..]

      case msg_type
      when MessageType::POOL_UPDATE
        if @callbacks[:pool_update]
          update = Decoder.decode_pool_update(payload)
          @callbacks[:pool_update].call(update) if update
        end
      when MessageType::POOL_UPDATE_BATCH
        if @callbacks[:pool_update]
          updates = Decoder.decode_pool_update_batch(payload)
          updates.each { |u| @callbacks[:pool_update].call(u) }
        end
      when MessageType::PRIORITY_FEES
        if @callbacks[:fee_market]
          fees = Decoder.decode_fee_market(payload)
          @callbacks[:fee_market].call(fees) if fees
        end
      when MessageType::BLOCKHASH
        if @callbacks[:blockhash]
          bh = Decoder.decode_blockhash(payload)
          @callbacks[:blockhash].call(bh) if bh
        end
      when MessageType::QUOTE
        if @callbacks[:quote]
          quote = Decoder.decode_quote(payload)
          @callbacks[:quote].call(quote) if quote
        end
      when MessageType::PRICE_UPDATE
        if @callbacks[:price_update]
          entry = Decoder.decode_price_update(payload)
          @callbacks[:price_update].call(entry) if entry
        end
      when MessageType::PRICE_BATCH
        entries = Decoder.decode_price_entries(payload)
        @callbacks[:price_batch]&.call(entries)
        if @callbacks[:price_update]
          entries.each { |e| @callbacks[:price_update].call(e) }
        end
      when MessageType::PRICE_SNAPSHOT
        entries = Decoder.decode_price_entries(payload)
        @callbacks[:price_snapshot]&.call(entries)
        if @callbacks[:price_update]
          entries.each { |e| @callbacks[:price_update].call(e) }
        end
      when MessageType::ERROR
        @callbacks[:error]&.call(payload.force_encoding("UTF-8"))
      end
    end

    def handle_text_message(data)
      json = JSON.parse(data)
      type = json["type"]

      case type
      when "heartbeat"
        if @callbacks[:heartbeat]
          hb = Heartbeat.new(
            timestamp_ms: json["timestamp_ms"],
            uptime_seconds: json["uptime_seconds"],
            messages_received: json["messages_received"],
            messages_sent: json["messages_sent"],
            subscriptions: json["subscriptions"]
          )
          @callbacks[:heartbeat].call(hb)
        end
      when "subscribed"
        # Subscription confirmed
      when "error"
        @callbacks[:error]&.call(json["message"])
      end
    rescue JSON::ParserError
      # Ignore invalid JSON
    end

    def handle_close(_event)
      @connected = false
      @callbacks[:disconnected]&.call

      schedule_reconnect if @running && @reconnect
    end

    def handle_error(error)
      @callbacks[:error]&.call(error.message)
    end

    def schedule_reconnect
      jitter = rand * 0.5
      delay = [@reconnect_delay + jitter, @reconnect_delay_max].min

      Thread.new do
        sleep(delay)
        do_connect if @running
      end

      @reconnect_delay = [@reconnect_delay * 2, @reconnect_delay_max].min
    end

    def send_subscribe
      return unless @last_subscription

      msg = { type: "subscribe", channels: @last_subscription[:channels] }
      msg[:protocols] = @last_subscription[:protocols] if @last_subscription[:protocols]
      msg[:pools] = @last_subscription[:pools] if @last_subscription[:pools]
      msg[:token_pairs] = @last_subscription[:token_pairs] if @last_subscription[:token_pairs]

      send_json(msg)
    end

    def send_price_subscribe
      return unless @last_price_subscription

      payload = {
        tokens: @last_price_subscription[:tokens],
        threshold_bps: @last_price_subscription[:threshold_bps]
      }

      json_bytes = payload.to_json.encode("UTF-8").bytes
      @ws&.send([MessageType::SUBSCRIBE_PRICE, *json_bytes].pack("C*"))
    end

    def send_json(data)
      @ws&.send(data.to_json)
    end
  end
end
