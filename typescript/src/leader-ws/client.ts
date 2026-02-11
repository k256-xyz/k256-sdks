/**
 * Leader Schedule WebSocket Client
 * 
 * Connects to the K256 leader-schedule service via the Gateway.
 * Uses JSON mode (format: "json") — the server decodes rkyv binary
 * and sends typed JSON text frames.
 * 
 * @example
 * ```typescript
 * import { LeaderWebSocketClient } from '@k256/sdk/leader-ws';
 * 
 * const client = new LeaderWebSocketClient({
 *   apiKey: 'your-api-key',
 *   onSlotUpdate: (msg) => console.log('Slot:', msg.data.slot, 'Leader:', msg.data.leader),
 *   onRoutingHealth: (msg) => console.log('Coverage:', msg.data.coverage),
 *   onGossipDiff: (msg) => console.log('Peers changed:', msg.data.added.length, 'added'),
 * });
 * 
 * await client.connect();
 * ```
 */

import {
  ALL_LEADER_CHANNELS,
  type LeaderChannelValue,
  type LeaderDecodedMessage,
  type LeaderSubscribedMessage,
  type LeaderScheduleMessage,
  type GossipSnapshotMessage,
  type GossipDiffMessage,
  type SlotUpdateMessage,
  type RoutingHealthMessage,
  type SkipEventMessage,
  type IpChangeMessage,
  type LeaderHeartbeatMessage,
  type LeaderErrorMessage,
} from './types';

/**
 * Connection state
 */
export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'closed';

/**
 * Leader WebSocket client configuration
 */
export interface LeaderWebSocketClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Gateway URL (default: wss://gateway.k256.xyz/v1/leader-ws) */
  url?: string;
  /** Channels to subscribe to (default: all channels) */
  channels?: LeaderChannelValue[];
  
  // Reconnection settings
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number;
  /** Max reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number;
  
  // Event callbacks
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState, prevState: ConnectionState) => void;
  /** Called on successful connection */
  onConnect?: () => void;
  /** Called on disconnection */
  onDisconnect?: (code: number, reason: string, wasClean: boolean) => void;
  /** Called on reconnection attempt */
  onReconnecting?: (attempt: number, delayMs: number) => void;
  /** Called on any error */
  onError?: (error: LeaderWebSocketError) => void;
  
  // Message callbacks
  /** Called on subscription confirmed (includes protocol schema) */
  onSubscribed?: (msg: LeaderSubscribedMessage) => void;
  /** Called on full leader schedule (snapshot — replaces previous) */
  onLeaderSchedule?: (msg: LeaderScheduleMessage) => void;
  /** Called on full gossip peer snapshot (snapshot — key: identity) */
  onGossipSnapshot?: (msg: GossipSnapshotMessage) => void;
  /** Called on gossip diff (diff — merge into snapshot using identity) */
  onGossipDiff?: (msg: GossipDiffMessage) => void;
  /** Called on slot update (snapshot — each replaces previous) */
  onSlotUpdate?: (msg: SlotUpdateMessage) => void;
  /** Called on routing health (snapshot — each replaces previous) */
  onRoutingHealth?: (msg: RoutingHealthMessage) => void;
  /** Called on skip event (event — block production stats) */
  onSkipEvent?: (msg: SkipEventMessage) => void;
  /** Called on IP change event */
  onIpChange?: (msg: IpChangeMessage) => void;
  /** Called on heartbeat (every 10s) */
  onHeartbeat?: (msg: LeaderHeartbeatMessage) => void;
  /** Called on any message (raw) */
  onMessage?: (msg: LeaderDecodedMessage) => void;
}

/**
 * Error codes for leader WebSocket
 */
export type LeaderErrorCode =
  | 'CONNECTION_FAILED'
  | 'CONNECTION_LOST'
  | 'AUTH_FAILED'
  | 'SERVER_ERROR'
  | 'INVALID_MESSAGE'
  | 'RECONNECT_FAILED';

/**
 * WebSocket error with context
 */
export class LeaderWebSocketError extends Error {
  constructor(
    public readonly code: LeaderErrorCode,
    message: string,
    public readonly closeCode?: number,
    public readonly closeReason?: string,
  ) {
    super(message);
    this.name = 'LeaderWebSocketError';
  }

  get isRecoverable(): boolean {
    return this.code !== 'AUTH_FAILED';
  }
}

/**
 * Leader Schedule WebSocket Client
 * 
 * Connects to the leader-schedule service via the Gateway using JSON mode.
 * Automatically subscribes to configured channels on connect/reconnect.
 */
export class LeaderWebSocketClient {
  private ws: WebSocket | null = null;
  private readonly config: Required<Pick<LeaderWebSocketClientConfig,
    'apiKey' | 'url' | 'channels' | 'autoReconnect' | 'reconnectDelayMs' | 'maxReconnectDelayMs' | 'maxReconnectAttempts'
  >> & LeaderWebSocketClientConfig;
  
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;

  /** Current connection state */
  get state(): ConnectionState { return this._state; }

  /** Whether currently connected */
  get isConnected(): boolean {
    return this._state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  constructor(config: LeaderWebSocketClientConfig) {
    this.config = {
      url: 'wss://gateway.k256.xyz/v1/leader-ws',
      channels: ALL_LEADER_CHANNELS,
      autoReconnect: true,
      reconnectDelayMs: 1000,
      maxReconnectDelayMs: 30000,
      maxReconnectAttempts: Infinity,
      ...config,
    };
  }

  /**
   * Connect to the leader-schedule WebSocket
   */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') return;
    
    this.isIntentionallyClosed = false;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.url}?apiKey=${encodeURIComponent(this.config.apiKey)}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.setState('connected');
          this.reconnectAttempts = 0;
          
          // Subscribe with JSON mode
          const subscribeMsg = JSON.stringify({
            type: 'subscribe',
            channels: this.config.channels,
            format: 'json',
          });
          this.ws!.send(subscribeMsg);
          
          this.config.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            this.handleMessage(event.data);
          }
        };

        this.ws.onclose = (event) => {
          const wasConnected = this._state === 'connected';
          this.ws = null;
          
          if (this.isIntentionallyClosed) {
            this.setState('closed');
            this.config.onDisconnect?.(event.code, event.reason, event.wasClean);
            return;
          }
          
          this.config.onDisconnect?.(event.code, event.reason, event.wasClean);
          
          // Check for auth failure (don't reconnect)
          if (event.code === 1008 || event.code === 4001 || event.code === 4003) {
            this.setState('closed');
            this.config.onError?.(new LeaderWebSocketError(
              'AUTH_FAILED', `Authentication failed: ${event.reason}`, event.code, event.reason
            ));
            if (!wasConnected) reject(new LeaderWebSocketError('AUTH_FAILED', event.reason, event.code));
            return;
          }
          
          // Auto-reconnect
          if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            this.setState('disconnected');
          }
          
          if (!wasConnected) reject(new LeaderWebSocketError('CONNECTION_FAILED', 'WebSocket closed before connect'));
        };

        this.ws.onerror = () => {
          this.config.onError?.(new LeaderWebSocketError('CONNECTION_FAILED', 'WebSocket connection error'));
        };
      } catch (err) {
        this.setState('disconnected');
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearTimers();
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    
    this.setState('closed');
  }

  // ── Private ──

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw) as LeaderDecodedMessage;
      
      // Dispatch to typed callbacks
      switch (msg.type) {
        case 'subscribed':
          this.config.onSubscribed?.(msg as LeaderSubscribedMessage);
          break;
        case 'leader_schedule':
          this.config.onLeaderSchedule?.(msg as LeaderScheduleMessage);
          break;
        case 'gossip_snapshot':
          this.config.onGossipSnapshot?.(msg as GossipSnapshotMessage);
          break;
        case 'gossip_diff':
          this.config.onGossipDiff?.(msg as GossipDiffMessage);
          break;
        case 'slot_update':
          this.config.onSlotUpdate?.(msg as SlotUpdateMessage);
          break;
        case 'routing_health':
          this.config.onRoutingHealth?.(msg as RoutingHealthMessage);
          break;
        case 'skip_event':
          this.config.onSkipEvent?.(msg as SkipEventMessage);
          break;
        case 'ip_change':
          this.config.onIpChange?.(msg as IpChangeMessage);
          break;
        case 'heartbeat':
          this.config.onHeartbeat?.(msg as LeaderHeartbeatMessage);
          break;
        case 'error':
          this.config.onError?.(new LeaderWebSocketError(
            'SERVER_ERROR', (msg as LeaderErrorMessage).data.message
          ));
          break;
      }
      
      // Generic handler
      this.config.onMessage?.(msg);
    } catch {
      this.config.onError?.(new LeaderWebSocketError('INVALID_MESSAGE', 'Failed to parse message'));
    }
  }

  private setState(state: ConnectionState): void {
    const prev = this._state;
    if (prev === state) return;
    this._state = state;
    this.config.onStateChange?.(state, prev);
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelayMs
    );
    
    this.config.onReconnecting?.(this.reconnectAttempts, delay);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error handled in onclose/onerror
      });
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
