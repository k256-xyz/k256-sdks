"""Leader Schedule WebSocket message types.

All messages are JSON text frames with: type, kind, key (optional), data.
"""

from dataclasses import dataclass, field
from typing import List, Optional


class LeaderChannel:
    """Subscription channel constants."""
    LEADER_SCHEDULE = "leader_schedule"
    GOSSIP = "gossip"
    SLOTS = "slots"
    ALERTS = "alerts"


ALL_LEADER_CHANNELS = [
    LeaderChannel.LEADER_SCHEDULE,
    LeaderChannel.GOSSIP,
    LeaderChannel.SLOTS,
    LeaderChannel.ALERTS,
]


@dataclass
class MessageSchemaEntry:
    type: str
    tag: str
    kind: str  # "snapshot" | "diff" | "event"
    description: str
    key: Optional[str] = None


@dataclass
class LeaderSubscribedData:
    channels: List[str]
    current_slot: int
    epoch: int
    schema: List[MessageSchemaEntry] = field(default_factory=list)


@dataclass
class GossipPeer:
    identity: str
    tpu_quic: Optional[str] = None
    tpu_udp: Optional[str] = None
    tpu_forwards_quic: Optional[str] = None
    tpu_forwards_udp: Optional[str] = None
    tpu_vote: Optional[str] = None
    gossip_addr: Optional[str] = None
    version: str = ""
    shred_version: int = 0
    stake: int = 0
    commission: int = 0
    is_delinquent: bool = False
    wallclock: int = 0
    country_code: str = ""
    continent_code: str = ""
    asn: str = ""
    as_name: str = ""
    as_domain: str = ""


@dataclass
class GossipSnapshotData:
    timestamp: int
    count: int
    peers: List[GossipPeer] = field(default_factory=list)


@dataclass
class GossipDiffData:
    timestamp_ms: int
    added: List[GossipPeer] = field(default_factory=list)
    removed: List[str] = field(default_factory=list)
    updated: List[GossipPeer] = field(default_factory=list)


@dataclass
class SlotUpdateData:
    slot: int
    leader: str
    block_height: int


@dataclass
class RoutingHealthData:
    leaders_total: int
    leaders_in_gossip: int
    leaders_missing_gossip: List[str] = field(default_factory=list)
    leaders_without_tpu_quic: List[str] = field(default_factory=list)
    leaders_delinquent: List[str] = field(default_factory=list)
    coverage: str = "0%"


@dataclass
class SkipEventData:
    slot: int
    leader: str
    assigned: int
    produced: int


@dataclass
class IpChangeData:
    identity: str
    old_ip: str
    new_ip: str
    timestamp_ms: int


@dataclass
class LeaderHeartbeatData:
    timestamp_ms: int
    current_slot: int
    connected_clients: int
    gossip_peers: int


@dataclass
class LeaderScheduleValidator:
    identity: str
    slots: int
    slot_indices: List[int] = field(default_factory=list)


@dataclass
class LeaderScheduleData:
    epoch: int
    slots_in_epoch: int
    validators: int
    schedule: List[LeaderScheduleValidator] = field(default_factory=list)
