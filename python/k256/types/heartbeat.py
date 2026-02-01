"""Heartbeat types."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Heartbeat:
    """Connection heartbeat with stats.
    
    Attributes:
        timestamp_ms: Unix timestamp in milliseconds
        uptime_seconds: Connection uptime in seconds
        messages_received: Total messages received
        messages_sent: Total messages sent
        subscriptions: Number of active subscriptions
    """
    
    timestamp_ms: int
    uptime_seconds: int
    messages_received: int
    messages_sent: int
    subscriptions: int
