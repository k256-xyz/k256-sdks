"""Leader Schedule WebSocket client for K256 SDK.

Real-time Solana leader schedule, gossip network, and routing data.
Uses JSON mode over WebSocket — no binary decoding needed.

Example:
    from k256.leader_ws import LeaderWebSocketClient

    client = LeaderWebSocketClient(api_key="your-api-key")
    client.on_slot_update = lambda msg: print(f"Slot: {msg['data']['slot']}")
    client.on_routing_health = lambda msg: print(f"Coverage: {msg['data']['coverage']}")
    await client.connect()
"""

from .client import LeaderWebSocketClient
from .types import (
    LeaderChannel,
    ALL_LEADER_CHANNELS,
    GossipPeer,
    SlotUpdateData,
    RoutingHealthData,
    GossipDiffData,
    GossipSnapshotData,
    LeaderScheduleData,
    SkipEventData,
    IpChangeData,
    LeaderHeartbeatData,
    LeaderSubscribedData,
    MessageSchemaEntry,
)

__all__ = [
    "LeaderWebSocketClient",
    "LeaderChannel",
    "ALL_LEADER_CHANNELS",
    "GossipPeer",
    "SlotUpdateData",
    "RoutingHealthData",
    "GossipDiffData",
    "GossipSnapshotData",
    "LeaderScheduleData",
    "SkipEventData",
    "IpChangeData",
    "LeaderHeartbeatData",
    "LeaderSubscribedData",
    "MessageSchemaEntry",
]
