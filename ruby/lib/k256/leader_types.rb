# frozen_string_literal: true

module K256
  module Leader
    # Subscription channel constants
    CHANNEL_LEADER_SCHEDULE = "leader_schedule"
    CHANNEL_GOSSIP = "gossip"
    CHANNEL_SLOTS = "slots"
    CHANNEL_ALERTS = "alerts"
    ALL_CHANNELS = [CHANNEL_LEADER_SCHEDULE, CHANNEL_GOSSIP, CHANNEL_SLOTS, CHANNEL_ALERTS].freeze

    # Message kind — how to consume the message
    # "snapshot" = full state replacement
    # "diff" = merge into snapshot using key
    # "event" = append-only
    KINDS = %w[snapshot diff event].freeze

    # GossipPeer represents a single gossip network peer.
    GossipPeer = Struct.new(
      :identity, :tpu_quic, :tpu_udp, :tpu_forwards_quic, :tpu_forwards_udp,
      :tpu_vote, :gossip_addr, :version, :shred_version, :stake,
      :commission, :is_delinquent, :wallclock,
      :country_code, :continent_code, :asn, :as_name, :as_domain,
      keyword_init: true
    )

    SlotUpdate = Struct.new(:slot, :leader, :block_height, keyword_init: true)
    RoutingHealth = Struct.new(:leaders_total, :leaders_in_gossip, :leaders_missing_gossip,
                              :leaders_without_tpu_quic, :leaders_delinquent, :coverage,
                              keyword_init: true)
    GossipDiff = Struct.new(:timestamp_ms, :added, :removed, :updated, keyword_init: true)
    SkipEvent = Struct.new(:slot, :leader, :assigned, :produced, keyword_init: true)
    IpChange = Struct.new(:identity, :old_ip, :new_ip, :timestamp_ms, keyword_init: true)
    LeaderHeartbeat = Struct.new(:timestamp_ms, :current_slot, :connected_clients, :gossip_peers,
                                keyword_init: true)
  end
end
