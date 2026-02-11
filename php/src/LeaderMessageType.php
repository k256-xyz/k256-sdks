<?php

namespace K256;

/**
 * Leader Schedule WebSocket message type constants.
 * All messages are JSON text frames with: type, kind, key (optional), data.
 */
final class LeaderMessageType
{
    public const SUBSCRIBED = 'subscribed';
    public const LEADER_SCHEDULE = 'leader_schedule';
    public const GOSSIP_SNAPSHOT = 'gossip_snapshot';
    public const GOSSIP_DIFF = 'gossip_diff';
    public const SLOT_UPDATE = 'slot_update';
    public const ROUTING_HEALTH = 'routing_health';
    public const SKIP_EVENT = 'skip_event';
    public const IP_CHANGE = 'ip_change';
    public const HEARTBEAT = 'heartbeat';
    public const ERROR = 'error';

    /** All available subscription channels. */
    public const ALL_CHANNELS = ['leader_schedule', 'gossip', 'slots', 'alerts'];
}
