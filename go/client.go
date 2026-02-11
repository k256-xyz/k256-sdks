package k256

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Config holds the configuration for the WebSocket client.
type Config struct {
	// APIKey is the K256 API key
	APIKey string
	// Endpoint is the WebSocket endpoint URL
	Endpoint string
	// Reconnect enables automatic reconnection
	Reconnect bool
	// ReconnectDelayInitial is the initial reconnect delay
	ReconnectDelayInitial time.Duration
	// ReconnectDelayMax is the maximum reconnect delay
	ReconnectDelayMax time.Duration
	// PingInterval is the ping interval (0 to disable)
	PingInterval time.Duration
}

// DefaultConfig returns a Config with default values.
func DefaultConfig() Config {
	return Config{
		Endpoint:              "wss://gateway.k256.xyz/v1/ws",
		Reconnect:             true,
		ReconnectDelayInitial: time.Second,
		ReconnectDelayMax:     60 * time.Second,
		PingInterval:          30 * time.Second,
	}
}

// SubscribeRequest represents a WebSocket subscription request.
type SubscribeRequest struct {
	Type       string     `json:"type"`
	Channels   []string   `json:"channels"`
	Format     string     `json:"format,omitempty"`
	Protocols  []string   `json:"protocols,omitempty"`
	Pools      []string   `json:"pools,omitempty"`
	TokenPairs [][]string `json:"token_pairs,omitempty"`
}

// WebSocketClient is the K256 WebSocket client for real-time Solana liquidity data.
type WebSocketClient struct {
	config Config
	conn   *websocket.Conn
	mu     sync.RWMutex

	running          bool
	reconnectDelay   time.Duration
	lastSubscription *SubscribeRequest

	onPoolUpdate func(*PoolUpdate)
	onFeeMarket  func(*FeeMarket)
	onBlockhash  func(*Blockhash)
	onQuote         func(*Quote)
	onHeartbeat     func(*Heartbeat)
	onError         func(error)
	onConnected     func()
	onDisconnected  func()
}

// NewWebSocket creates a new WebSocket client with the given configuration.
func NewWebSocket(config Config) *WebSocketClient {
	if config.Endpoint == "" {
		config.Endpoint = "wss://gateway.k256.xyz/v1/ws"
	}
	if config.ReconnectDelayInitial == 0 {
		config.ReconnectDelayInitial = time.Second
	}
	if config.ReconnectDelayMax == 0 {
		config.ReconnectDelayMax = 60 * time.Second
	}

	return &WebSocketClient{
		config:         config,
		reconnectDelay: config.ReconnectDelayInitial,
	}
}

// OnPoolUpdate registers a callback for pool updates.
func (c *WebSocketClient) OnPoolUpdate(callback func(*PoolUpdate)) {
	c.onPoolUpdate = callback
}

// OnFeeMarket registers a callback for fee market updates.
func (c *WebSocketClient) OnFeeMarket(callback func(*FeeMarket)) {
	c.onFeeMarket = callback
}

// OnBlockhash registers a callback for blockhash updates.
func (c *WebSocketClient) OnBlockhash(callback func(*Blockhash)) {
	c.onBlockhash = callback
}

// OnQuote registers a callback for quote updates.
func (c *WebSocketClient) OnQuote(callback func(*Quote)) {
	c.onQuote = callback
}

// OnHeartbeat registers a callback for heartbeat messages.
func (c *WebSocketClient) OnHeartbeat(callback func(*Heartbeat)) {
	c.onHeartbeat = callback
}

// OnError registers a callback for errors.
func (c *WebSocketClient) OnError(callback func(error)) {
	c.onError = callback
}

// OnConnected registers a callback for connection established.
func (c *WebSocketClient) OnConnected(callback func()) {
	c.onConnected = callback
}

// OnDisconnected registers a callback for disconnection.
func (c *WebSocketClient) OnDisconnected(callback func()) {
	c.onDisconnected = callback
}

// IsConnected returns true if connected to the WebSocket.
func (c *WebSocketClient) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.conn != nil
}

// Connect establishes a connection to the K256 WebSocket.
func (c *WebSocketClient) Connect() error {
	c.running = true
	return c.connectLoop()
}

func (c *WebSocketClient) connectLoop() error {
	for c.running {
		err := c.connect()
		if err != nil {
			log.Printf("Connection error: %v", err)
			if c.onError != nil {
				c.onError(err)
			}
		}

		c.mu.Lock()
		c.conn = nil
		c.mu.Unlock()

		if c.onDisconnected != nil {
			c.onDisconnected()
		}

		if !c.running || !c.config.Reconnect {
			return err
		}

		// Exponential backoff with jitter
		jitter := time.Duration(rand.Float64() * float64(500*time.Millisecond))
		delay := c.reconnectDelay + jitter
		if delay > c.config.ReconnectDelayMax {
			delay = c.config.ReconnectDelayMax
		}

		log.Printf("Reconnecting in %v...", delay)
		time.Sleep(delay)

		c.reconnectDelay *= 2
		if c.reconnectDelay > c.config.ReconnectDelayMax {
			c.reconnectDelay = c.config.ReconnectDelayMax
		}
	}

	return nil
}

func (c *WebSocketClient) connect() error {
	u, err := url.Parse(c.config.Endpoint)
	if err != nil {
		return fmt.Errorf("invalid endpoint: %w", err)
	}

	q := u.Query()
	q.Set("apiKey", c.config.APIKey)
	u.RawQuery = q.Encode()

	conn, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("dial error: %w", err)
	}

	c.mu.Lock()
	c.conn = conn
	c.reconnectDelay = c.config.ReconnectDelayInitial
	c.mu.Unlock()

	log.Println("Connected to K256 WebSocket")
	if c.onConnected != nil {
		c.onConnected()
	}

	// Resubscribe if we had a previous subscription
	if c.lastSubscription != nil {
		if err := c.sendSubscribe(c.lastSubscription); err != nil {
			return err
		}
	}

	return c.messageLoop()
}

func (c *WebSocketClient) messageLoop() error {
	for c.running {
		c.mu.RLock()
		conn := c.conn
		c.mu.RUnlock()

		if conn == nil {
			return nil
		}

		msgType, data, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("read error: %w", err)
		}

		switch msgType {
		case websocket.BinaryMessage:
			c.handleBinaryMessage(data)
		case websocket.TextMessage:
			c.handleTextMessage(data)
		}
	}

	return nil
}

func (c *WebSocketClient) handleBinaryMessage(data []byte) {
	if len(data) == 0 {
		return
	}

	msgType := MessageType(data[0])
	payload := data[1:]

	switch msgType {
	case MessageTypePoolUpdate:
		if c.onPoolUpdate != nil {
			update, err := DecodePoolUpdate(payload)
			if err != nil {
				log.Printf("Error decoding pool update: %v", err)
				return
			}
			c.onPoolUpdate(update)
		}

	case MessageTypePoolUpdateBatch:
		if c.onPoolUpdate != nil {
			updates, err := DecodePoolUpdateBatch(payload)
			if err != nil {
				log.Printf("Error decoding pool update batch: %v", err)
				return
			}
			for _, update := range updates {
				c.onPoolUpdate(update)
			}
		}

	case MessageTypePriorityFees:
		if c.onFeeMarket != nil {
			fees, err := DecodeFeeMarket(payload)
			if err != nil {
				log.Printf("Error decoding fee market: %v", err)
				return
			}
			c.onFeeMarket(fees)
		}

	case MessageTypeBlockhash:
		if c.onBlockhash != nil {
			bh, err := DecodeBlockhash(payload)
			if err != nil {
				log.Printf("Error decoding blockhash: %v", err)
				return
			}
			c.onBlockhash(bh)
		}

	case MessageTypeQuote:
		if c.onQuote != nil {
			quote, err := DecodeQuote(payload)
			if err != nil {
				log.Printf("Error decoding quote: %v", err)
				return
			}
			c.onQuote(quote)
		}

	case MessageTypePong:
		// Pong response - no action needed, keepalive handled

	case MessageTypeError:
		errMsg := string(payload)
		log.Printf("Server error: %s", errMsg)
		if c.onError != nil {
			c.onError(fmt.Errorf("server error: %s", errMsg))
		}
	}
}

func (c *WebSocketClient) handleTextMessage(data []byte) {
	var msg map[string]interface{}
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		return
	}

	msgType, _ := msg["type"].(string)
	switch msgType {
	case "heartbeat":
		if c.onHeartbeat != nil {
			hb := &Heartbeat{}
			if ts, ok := msg["timestamp_ms"].(float64); ok {
				hb.TimestampMs = uint64(ts)
			}
			if uptime, ok := msg["uptime_seconds"].(float64); ok {
				hb.UptimeSeconds = uint64(uptime)
			}
			if recv, ok := msg["messages_received"].(float64); ok {
				hb.MessagesReceived = uint64(recv)
			}
			if sent, ok := msg["messages_sent"].(float64); ok {
				hb.MessagesSent = uint64(sent)
			}
			if subs, ok := msg["subscriptions"].(float64); ok {
				hb.Subscriptions = uint32(subs)
			}
			c.onHeartbeat(hb)
		}
	case "subscribed":
		log.Printf("Subscribed to channels: %v", msg["channels"])
	case "error":
		errMsg, _ := msg["message"].(string)
		log.Printf("Server error: %s", errMsg)
		if c.onError != nil {
			c.onError(fmt.Errorf("server error: %s", errMsg))
		}
	}
}

func (c *WebSocketClient) sendSubscribe(request *SubscribeRequest) error {
	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return fmt.Errorf("not connected")
	}

	data, err := json.Marshal(request)
	if err != nil {
		return err
	}

	return conn.WriteMessage(websocket.TextMessage, data)
}

// Subscribe subscribes to the specified channels.
func (c *WebSocketClient) Subscribe(request SubscribeRequest) error {
	request.Type = "subscribe"
	c.lastSubscription = &request

	if c.IsConnected() {
		return c.sendSubscribe(&request)
	}
	return nil
}

// Unsubscribe unsubscribes from all channels.
func (c *WebSocketClient) Unsubscribe() error {
	c.lastSubscription = nil

	c.mu.RLock()
	conn := c.conn
	c.mu.RUnlock()

	if conn == nil {
		return nil
	}

	return conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"unsubscribe"}`))
}

// Close closes the WebSocket connection.
func (c *WebSocketClient) Close() error {
	c.running = false

	c.mu.Lock()
	conn := c.conn
	c.conn = nil
	c.mu.Unlock()

	if conn != nil {
		return conn.Close()
	}
	return nil
}
