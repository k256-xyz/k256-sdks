<?php

namespace K256;

/**
 * Leader Schedule WebSocket client (JSON mode).
 *
 * Connects to the K256 leader-schedule service via the Gateway.
 * Requires a WebSocket library like Ratchet or Pawl.
 *
 * Example:
 *   $client = new LeaderClient('your-api-key');
 *   $client->onSlotUpdate(function($msg) { echo "Slot: " . $msg['data']['slot']; });
 *   $client->connect();
 */
class LeaderClient
{
    private string $apiKey;
    private string $url;
    private array $channels;
    private array $handlers = [];

    public const DEFAULT_URL = 'wss://gateway.k256.xyz/v1/leader-ws';

    public function __construct(
        string $apiKey,
        string $url = self::DEFAULT_URL,
        array $channels = null
    ) {
        $this->apiKey = $apiKey;
        $this->url = $url;
        $this->channels = $channels ?? LeaderMessageType::ALL_CHANNELS;
    }

    /** Register handler for a message type. */
    public function on(string $type, callable $handler): self
    {
        $this->handlers[$type] = $handler;
        return $this;
    }

    public function onSubscribed(callable $handler): self { return $this->on('subscribed', $handler); }
    public function onLeaderSchedule(callable $handler): self { return $this->on('leader_schedule', $handler); }
    public function onGossipSnapshot(callable $handler): self { return $this->on('gossip_snapshot', $handler); }
    public function onGossipDiff(callable $handler): self { return $this->on('gossip_diff', $handler); }
    public function onSlotUpdate(callable $handler): self { return $this->on('slot_update', $handler); }
    public function onRoutingHealth(callable $handler): self { return $this->on('routing_health', $handler); }
    public function onSkipEvent(callable $handler): self { return $this->on('skip_event', $handler); }
    public function onIpChange(callable $handler): self { return $this->on('ip_change', $handler); }
    public function onHeartbeat(callable $handler): self { return $this->on('heartbeat', $handler); }
    public function onMessage(callable $handler): self { return $this->on('message', $handler); }

    /** Get the WebSocket URL with API key. */
    public function getWsUrl(): string
    {
        return $this->url . '?apiKey=' . urlencode($this->apiKey);
    }

    /** Get the subscribe message for JSON mode. */
    public function getSubscribeMessage(): string
    {
        return json_encode([
            'type' => 'subscribe',
            'channels' => $this->channels,
            'format' => 'json',
        ]);
    }

    /** Dispatch a parsed JSON message to the appropriate handler. */
    public function dispatch(array $msg): void
    {
        $type = $msg['type'] ?? '';

        if (isset($this->handlers[$type])) {
            ($this->handlers[$type])($msg);
        }

        if (isset($this->handlers['message'])) {
            ($this->handlers['message'])($msg);
        }
    }
}
