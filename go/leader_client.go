package k256

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// LeaderConfig holds configuration for the Leader Schedule WebSocket client.
type LeaderConfig struct {
	// APIKey is the K256 API key
	APIKey string
	// Endpoint is the WebSocket endpoint URL
	Endpoint string
	// Channels to subscribe to (default: all)
	Channels []string
	// Reconnect enables automatic reconnection
	Reconnect bool
	// ReconnectDelayInitial is the initial reconnect delay
	ReconnectDelayInitial time.Duration
	// ReconnectDelayMax is the maximum reconnect delay
	ReconnectDelayMax time.Duration
}

// DefaultLeaderConfig returns a LeaderConfig with default values.
func DefaultLeaderConfig() LeaderConfig {
	return LeaderConfig{
		Endpoint:              "wss://gateway.k256.xyz/v1/leader-ws",
		Channels:              AllLeaderChannels,
		Reconnect:             true,
		ReconnectDelayInitial: time.Second,
		ReconnectDelayMax:     60 * time.Second,
	}
}

// LeaderHandler is called for each decoded message from the leader-schedule WS.
type LeaderHandler func(msg LeaderMessage)

// LeaderWebSocketClient connects to the K256 leader-schedule WebSocket (JSON mode).
type LeaderWebSocketClient struct {
	config         LeaderConfig
	conn           *websocket.Conn
	mu             sync.RWMutex
	running        bool
	reconnectDelay time.Duration
	handler        LeaderHandler
}

// NewLeaderClient creates a new leader-schedule WebSocket client.
func NewLeaderClient(config LeaderConfig, handler LeaderHandler) *LeaderWebSocketClient {
	if config.Endpoint == "" {
		config.Endpoint = DefaultLeaderConfig().Endpoint
	}
	if len(config.Channels) == 0 {
		config.Channels = AllLeaderChannels
	}
	return &LeaderWebSocketClient{
		config:         config,
		reconnectDelay: config.ReconnectDelayInitial,
		handler:        handler,
	}
}

// Connect establishes the WebSocket connection and starts reading messages.
func (c *LeaderWebSocketClient) Connect() error {
	u, err := url.Parse(c.config.Endpoint)
	if err != nil {
		return fmt.Errorf("invalid endpoint URL: %w", err)
	}

	q := u.Query()
	q.Set("apiKey", c.config.APIKey)
	u.RawQuery = q.Encode()

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.running = true
	c.mu.Unlock()

	// Subscribe with JSON mode
	sub := SubscribeRequest{
		Type:     "subscribe",
		Channels: c.config.Channels,
		Format:   "json",
	}
	if err := conn.WriteJSON(sub); err != nil {
		conn.Close()
		return fmt.Errorf("subscribe failed: %w", err)
	}

	log.Printf("[LeaderWS] Connected to %s, subscribed to %v", c.config.Endpoint, c.config.Channels)

	go c.readLoop()
	return nil
}

// Close disconnects the WebSocket client.
func (c *LeaderWebSocketClient) Close() {
	c.mu.Lock()
	c.running = false
	if c.conn != nil {
		c.conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		c.conn.Close()
		c.conn = nil
	}
	c.mu.Unlock()
}

func (c *LeaderWebSocketClient) readLoop() {
	for {
		c.mu.RLock()
		conn := c.conn
		running := c.running
		c.mu.RUnlock()

		if !running || conn == nil {
			return
		}

		_, message, err := conn.ReadMessage()
		if err != nil {
			if !c.running {
				return
			}
			log.Printf("[LeaderWS] Read error: %v", err)
			c.handleDisconnect()
			return
		}

		var msg LeaderMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[LeaderWS] Parse error: %v", err)
			continue
		}

		if c.handler != nil {
			c.handler(msg)
		}
	}
}

func (c *LeaderWebSocketClient) handleDisconnect() {
	c.mu.Lock()
	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}
	c.mu.Unlock()

	if !c.config.Reconnect || !c.running {
		return
	}

	log.Printf("[LeaderWS] Reconnecting in %v...", c.reconnectDelay)
	time.Sleep(c.reconnectDelay)

	// Exponential backoff
	c.reconnectDelay = c.reconnectDelay * 2
	if c.reconnectDelay > c.config.ReconnectDelayMax {
		c.reconnectDelay = c.config.ReconnectDelayMax
	}

	if err := c.Connect(); err != nil {
		log.Printf("[LeaderWS] Reconnect failed: %v", err)
		c.handleDisconnect()
	} else {
		c.reconnectDelay = c.config.ReconnectDelayInitial
	}
}
