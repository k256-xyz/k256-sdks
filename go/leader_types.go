package k256

// Leader Schedule WebSocket message types.
// All messages are JSON text frames with: type, kind, key (optional), data.

// LeaderChannel constants for subscription
const (
	LeaderChannelLeaderSchedule = "leader_schedule"
	LeaderChannelGossip         = "gossip"
	LeaderChannelSlots          = "slots"
	LeaderChannelAlerts         = "alerts"
)

// AllLeaderChannels is the default set of channels to subscribe to.
var AllLeaderChannels = []string{
	LeaderChannelLeaderSchedule,
	LeaderChannelGossip,
	LeaderChannelSlots,
	LeaderChannelAlerts,
}

// MessageKind describes how to consume a message.
// "snapshot" = full state replacement, "diff" = merge into snapshot, "event" = append-only.
type MessageKind string

const (
	KindSnapshot MessageKind = "snapshot"
	KindDiff     MessageKind = "diff"
	KindEvent    MessageKind = "event"
)

// LeaderMessage is the generic envelope for all leader-schedule WS messages.
type LeaderMessage struct {
	Type string          `json:"type"`
	Kind MessageKind     `json:"kind,omitempty"`
	Key  string          `json:"key,omitempty"`
	Data json.RawMessage `json:"data"`
}

// MessageSchemaEntry describes a single message type (from subscribed handshake).
type MessageSchemaEntry struct {
	Type        string `json:"type"`
	Tag         string `json:"tag"`
	Kind        string `json:"kind"`
	Key         string `json:"key,omitempty"`
	Description string `json:"description"`
}

// LeaderSubscribedData is the payload of the subscribed response.
type LeaderSubscribedData struct {
	Channels    []string             `json:"channels"`
	CurrentSlot uint64               `json:"currentSlot"`
	Epoch       uint64               `json:"epoch"`
	Schema      []MessageSchemaEntry `json:"schema"`
}

// GossipPeer represents a single gossip network peer.
type GossipPeer struct {
	Identity        string  `json:"identity"`
	TpuQuic         *string `json:"tpuQuic"`
	TpuUdp          *string `json:"tpuUdp"`
	TpuForwardsQuic *string `json:"tpuForwardsQuic"`
	TpuForwardsUdp  *string `json:"tpuForwardsUdp"`
	TpuVote         *string `json:"tpuVote"`
	GossipAddr      *string `json:"gossipAddr"`
	Version         string  `json:"version"`
	ShredVersion    uint16  `json:"shredVersion"`
	Stake           uint64  `json:"stake"`
	Commission      uint8   `json:"commission"`
	IsDelinquent    bool    `json:"isDelinquent"`
	Wallclock       uint64  `json:"wallclock"`
	CountryCode     string  `json:"countryCode"`
	ContinentCode   string  `json:"continentCode"`
	ASN             string  `json:"asn"`
	ASName          string  `json:"asName"`
	ASDomain        string  `json:"asDomain"`
}

// GossipSnapshotData is the payload of a gossip_snapshot message.
type GossipSnapshotData struct {
	Timestamp uint64       `json:"timestamp"`
	Count     int          `json:"count"`
	Peers     []GossipPeer `json:"peers"`
}

// GossipDiffData is the payload of a gossip_diff message.
type GossipDiffData struct {
	TimestampMs uint64       `json:"timestampMs"`
	Added       []GossipPeer `json:"added"`
	Removed     []string     `json:"removed"`
	Updated     []GossipPeer `json:"updated"`
}

// SlotUpdateData is the payload of a slot_update message.
type SlotUpdateData struct {
	Slot        uint64 `json:"slot"`
	Leader      string `json:"leader"`
	BlockHeight uint64 `json:"blockHeight"`
}

// RoutingHealthData is the payload of a routing_health message.
type RoutingHealthData struct {
	LeadersTotal          uint32   `json:"leadersTotal"`
	LeadersInGossip       uint32   `json:"leadersInGossip"`
	LeadersMissingGossip  []string `json:"leadersMissingGossip"`
	LeadersWithoutTpuQuic []string `json:"leadersWithoutTpuQuic"`
	LeadersDelinquent     []string `json:"leadersDelinquent"`
	Coverage              string   `json:"coverage"`
}

// SkipEventData is the payload of a skip_event message.
type SkipEventData struct {
	Slot     uint64 `json:"slot"`
	Leader   string `json:"leader"`
	Assigned uint32 `json:"assigned"`
	Produced uint32 `json:"produced"`
}

// IpChangeData is the payload of an ip_change message.
type IpChangeData struct {
	Identity    string `json:"identity"`
	OldIp       string `json:"oldIp"`
	NewIp       string `json:"newIp"`
	TimestampMs uint64 `json:"timestampMs"`
}

// LeaderHeartbeatData is the payload of a heartbeat message.
type LeaderHeartbeatData struct {
	TimestampMs      uint64 `json:"timestampMs"`
	CurrentSlot      uint64 `json:"currentSlot"`
	ConnectedClients uint32 `json:"connectedClients"`
	GossipPeers      uint32 `json:"gossipPeers"`
}

// LeaderScheduleValidator is a single validator in the leader schedule.
type LeaderScheduleValidator struct {
	Identity    string   `json:"identity"`
	Slots       int      `json:"slots"`
	SlotIndices []uint32 `json:"slotIndices"`
}

// LeaderScheduleData is the payload of a leader_schedule message.
type LeaderScheduleData struct {
	Epoch        uint64                    `json:"epoch"`
	SlotsInEpoch uint64                    `json:"slotsInEpoch"`
	Validators   int                       `json:"validators"`
	Schedule     []LeaderScheduleValidator `json:"schedule"`
}
