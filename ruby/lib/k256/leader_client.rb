# frozen_string_literal: true

require "json"
require "websocket-client-simple"

module K256
  module Leader
    # WebSocket client for K256 leader-schedule data (JSON mode).
    #
    # Example:
    #   client = K256::Leader::WebSocketClient.new(api_key: "your-key")
    #   client.on_slot_update { |msg| puts "Slot: #{msg['data']['slot']}" }
    #   client.connect
    class WebSocketClient
      DEFAULT_URL = "wss://gateway.k256.xyz/v1/leader-ws"

      attr_reader :connected

      def initialize(api_key:, url: DEFAULT_URL, channels: ALL_CHANNELS)
        @api_key = api_key
        @url = url
        @channels = channels
        @connected = false
        @handlers = {}
      end

      # Register a handler for a message type.
      # Available: on_subscribed, on_leader_schedule, on_gossip_snapshot,
      # on_gossip_diff, on_slot_update, on_routing_health, on_skip_event,
      # on_ip_change, on_heartbeat, on_message, on_error
      %w[subscribed leader_schedule gossip_snapshot gossip_diff slot_update
         routing_health skip_event ip_change heartbeat message error].each do |type|
        define_method(:"on_#{type}") do |&block|
          @handlers[type] = block
        end
      end

      def connect
        ws_url = "#{@url}?apiKey=#{CGI.escape(@api_key)}"
        @ws = WebSocket::Client::Simple.connect(ws_url)
        client = self

        @ws.on :open do
          client.instance_variable_set(:@connected, true)
          subscribe_msg = {
            type: "subscribe",
            channels: client.instance_variable_get(:@channels),
            format: "json"
          }
          send(subscribe_msg.to_json)
        end

        @ws.on :message do |msg|
          begin
            data = JSON.parse(msg.data)
            type = data["type"]
            handler = client.instance_variable_get(:@handlers)
            handler[type]&.call(data)
            handler["message"]&.call(data)
          rescue JSON::ParserError => e
            handler["error"]&.call(e)
          end
        end

        @ws.on :close do |e|
          client.instance_variable_set(:@connected, false)
        end

        @ws.on :error do |e|
          handler = client.instance_variable_get(:@handlers)
          handler["error"]&.call(e)
        end
      end

      def disconnect
        @ws&.close
        @connected = false
      end
    end
  end
end
