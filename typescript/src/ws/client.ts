/**
 * K256 WebSocket Client
 * 
 * Production-grade WebSocket client with:
 * - Automatic reconnection with exponential backoff
 * - Binary and JSON mode support
 * - Ping/pong keepalive
 * - Heartbeat monitoring
 * - Full error handling with RFC 6455 close codes
 * - Type-safe event emitters
 * 
 * @example
 * ```typescript
 * const client = new K256WebSocketClient({
 *   apiKey: 'your-api-key',
 *   mode: 'binary', // or 'json'
 *   onPoolUpdate: (update) => console.log(update),
 *   onError: (error) => console.error(error),
 * });
 * 
 * await client.connect();
 * client.subscribe({ channels: ['pools', 'priority_fees'] });
 * ```
 */

import { decodeMessage, decodePoolUpdateBatch } from './decoder';
import { MessageType, type DecodedMessage, type PoolUpdateMessage } from './types';

/**
 * RFC 6455 WebSocket Close Codes
 * @see https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
 */
export const CloseCode = {
  /** 1000: Normal closure - connection completed successfully */
  NORMAL: 1000,
  /** 1001: Going away - server/client shutting down. Client: reconnect immediately */
  GOING_AWAY: 1001,
  /** 1002: Protocol error - invalid frame format. Client: fix client code */
  PROTOCOL_ERROR: 1002,
  /** 1003: Unsupported data - message type not supported */
  UNSUPPORTED_DATA: 1003,
  /** 1005: No status received (reserved, not sent over wire) */
  NO_STATUS: 1005,
  /** 1006: Abnormal closure - connection dropped without close frame */
  ABNORMAL: 1006,
  /** 1007: Invalid payload - malformed UTF-8 or data. Client: fix message format */
  INVALID_PAYLOAD: 1007,
  /** 1008: Policy violation - rate limit exceeded, auth failed. Client: check credentials/limits */
  POLICY_VIOLATION: 1008,
  /** 1009: Message too big - message exceeds size limits */
  MESSAGE_TOO_BIG: 1009,
  /** 1010: Missing extension - required extension not negotiated */
  MISSING_EXTENSION: 1010,
  /** 1011: Internal error - unexpected server error. Client: retry with backoff */
  INTERNAL_ERROR: 1011,
  /** 1012: Service restart - server is restarting. Client: reconnect after brief delay */
  SERVICE_RESTART: 1012,
  /** 1013: Try again later - server overloaded. Client: retry with backoff */
  TRY_AGAIN_LATER: 1013,
  /** 1014: Bad gateway - upstream connection failed */
  BAD_GATEWAY: 1014,
  /** 1015: TLS handshake failed (reserved, not sent over wire) */
  TLS_HANDSHAKE: 1015,
} as const;

export type CloseCodeValue = typeof CloseCode[keyof typeof CloseCode];

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
 * Subscribe request options
 */
export interface SubscribeOptions {
  /** Channels to subscribe to: 'pools', 'priority_fees', 'blockhash' */
  channels: string[];
  /** Pool address filters (optional) */
  pools?: string[];
  /** Protocol filters (optional): 'RaydiumAmm', 'Whirlpool', 'MeteoraDlmm', etc. */
  protocols?: string[];
  /** Token pair filters (optional): [['mint1', 'mint2'], ...] */
  tokenPairs?: string[][];
}

/**
 * Quote subscription options
 */
export interface SubscribeQuoteOptions {
  /** Input token mint address */
  inputMint: string;
  /** Output token mint address */
  outputMint: string;
  /** Amount in base units (lamports/smallest unit) */
  amount: number | string;
  /** Slippage tolerance in basis points */
  slippageBps: number;
  /** How often to refresh the quote (ms) */
  refreshIntervalMs?: number;
}

/**
 * WebSocket client configuration
 */
export interface K256WebSocketClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Gateway URL (default: wss://gateway.k256.xyz/v1/ws) */
  url?: string;
  /** Message format: 'binary' (default, efficient) or 'json' (debugging) */
  mode?: 'binary' | 'json';
  
  // Reconnection settings
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number;
  /** Max reconnect attempts (default: Infinity) */
  maxReconnectAttempts?: number;
  
  // Keepalive settings
  /** Ping interval in ms (default: 30000) */
  pingIntervalMs?: number;
  /** Pong timeout in ms - disconnect if no pong (default: 10000) */
  pongTimeoutMs?: number;
  /** Heartbeat timeout in ms - warn if no heartbeat (default: 15000) */
  heartbeatTimeoutMs?: number;
  
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
  onError?: (error: K256WebSocketError) => void;
  
  // Message callbacks
  /** Called on subscription confirmed */
  onSubscribed?: (data: DecodedMessage & { type: 'subscribed' }) => void;
  /** Called on pool update */
  onPoolUpdate?: (update: PoolUpdateMessage) => void;
  /** Called on batched pool updates (for efficiency) */
  onPoolUpdateBatch?: (updates: PoolUpdateMessage[]) => void;
  /** Called on priority fees update */
  onPriorityFees?: (data: DecodedMessage & { type: 'priority_fees' }) => void;
  /** Called on blockhash update */
  onBlockhash?: (data: DecodedMessage & { type: 'blockhash' }) => void;
  /** Called on quote update */
  onQuote?: (data: DecodedMessage & { type: 'quote' }) => void;
  /** Called on quote subscription confirmed */
  onQuoteSubscribed?: (data: DecodedMessage & { type: 'quote_subscribed' }) => void;
  /** Called on heartbeat */
  onHeartbeat?: (data: DecodedMessage & { type: 'heartbeat' }) => void;
  /** Called on pong response (with round-trip latency) */
  onPong?: (latencyMs: number) => void;
  /** Called on any message (raw) */
  onMessage?: (message: DecodedMessage) => void;
  /** Called on raw binary message (for debugging) */
  onRawMessage?: (data: ArrayBuffer | string) => void;
}

/**
 * Error types for K256 WebSocket
 */
export type K256ErrorCode =
  | 'CONNECTION_FAILED'
  | 'CONNECTION_LOST'
  | 'PROTOCOL_ERROR'
  | 'AUTH_FAILED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'PING_TIMEOUT'
  | 'HEARTBEAT_TIMEOUT'
  | 'INVALID_MESSAGE'
  | 'RECONNECT_FAILED';

/**
 * WebSocket error with context
 */
export class K256WebSocketError extends Error {
  constructor(
    public readonly code: K256ErrorCode,
    message: string,
    public readonly closeCode?: number,
    public readonly closeReason?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'K256WebSocketError';
  }

  /** Check if error is recoverable (should trigger reconnect) */
  get isRecoverable(): boolean {
    switch (this.code) {
      case 'AUTH_FAILED':
      case 'RATE_LIMITED':
        return false;
      default:
        return true;
    }
  }

  /** Check if error is an auth failure */
  get isAuthError(): boolean {
    return this.code === 'AUTH_FAILED' || this.closeCode === CloseCode.POLICY_VIOLATION;
  }
}

/**
 * Production-grade K256 WebSocket Client
 */
export class K256WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<Omit<K256WebSocketClientConfig, 
    'onStateChange' | 'onConnect' | 'onDisconnect' | 'onReconnecting' | 'onError' |
    'onSubscribed' | 'onPoolUpdate' | 'onPoolUpdateBatch' | 'onPriorityFees' | 
    'onBlockhash' | 'onQuote' | 'onQuoteSubscribed' | 'onHeartbeat' | 'onPong' | 
    'onMessage' | 'onRawMessage'
  >> & K256WebSocketClientConfig;
  
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPingTime = 0;
  private lastHeartbeatTime = 0;
  private pendingSubscription: SubscribeOptions | null = null;
  private pendingQuoteSubscription: SubscribeQuoteOptions | null = null;
  private isIntentionallyClosed = false;

  /** Current connection state */
  get state(): ConnectionState {
    return this._state;
  }

  /** Whether currently connected */
  get isConnected(): boolean {
    return this._state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /** Time since last heartbeat (ms) or null if no heartbeat received */
  get timeSinceHeartbeat(): number | null {
    return this.lastHeartbeatTime ? Date.now() - this.lastHeartbeatTime : null;
  }

  /** Current reconnect attempt number */
  get currentReconnectAttempt(): number {
    return this.reconnectAttempts;
  }

  constructor(config: K256WebSocketClientConfig) {
    this.config = {
      url: 'wss://gateway.k256.xyz/v1/ws',
      mode: 'binary',
      autoReconnect: true,
      reconnectDelayMs: 1000,
      maxReconnectDelayMs: 30000,
      maxReconnectAttempts: Infinity,
      pingIntervalMs: 30000,
      pongTimeoutMs: 10000,
      heartbeatTimeoutMs: 15000,
      ...config,
    };
  }

  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    this.isIntentionallyClosed = false;
    return this.doConnect();
  }

  /**
   * Disconnect from the WebSocket server
   * @param code - Close code (default: 1000 NORMAL)
   * @param reason - Close reason
   */
  disconnect(code: number = CloseCode.NORMAL, reason: string = 'Client disconnect'): void {
    this.isIntentionallyClosed = true;
    this.cleanup();
    
    if (this.ws) {
      try {
        this.ws.close(code, reason);
      } catch {
        // Ignore errors during close
      }
      this.ws = null;
    }
    
    this.setState('closed');
  }

  /**
   * Subscribe to channels
   */
  subscribe(options: SubscribeOptions): void {
    this.pendingSubscription = options;
    
    if (!this.isConnected) {
      // Will be sent on connect
      return;
    }

    this.sendSubscription(options);
  }

  /**
   * Subscribe to a quote stream
   */
  subscribeQuote(options: SubscribeQuoteOptions): void {
    this.pendingQuoteSubscription = options;
    
    if (!this.isConnected) {
      return;
    }

    this.sendQuoteSubscription(options);
  }

  /**
   * Unsubscribe from a quote stream
   * @param topicId - Topic ID from quote_subscribed response
   */
  unsubscribeQuote(topicId: string): void {
    if (!this.isConnected) return;
    
    const msg = JSON.stringify({ type: 'unsubscribe_quote', topicId });
    this.ws?.send(msg);
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribe(): void {
    this.pendingSubscription = null;
    this.pendingQuoteSubscription = null;
    
    if (!this.isConnected) return;
    
    this.ws?.send(JSON.stringify({ type: 'unsubscribe' }));
  }

  /**
   * Send a ping to measure latency
   */
  ping(): void {
    if (!this.isConnected) return;
    
    // Binary ping: [0x0B]
    const pingData = new Uint8Array([MessageType.Ping]);
    this.lastPingTime = Date.now();
    this.ws?.send(pingData);
    
    // Start pong timeout
    this.startPongTimeout();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────────────────────

  private async doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setState('connecting');

      const url = new URL(this.config.url);
      url.searchParams.set('apiKey', this.config.apiKey);

      try {
        this.ws = new WebSocket(url.toString());
        
        // Set binary mode
        if (this.config.mode === 'binary') {
          this.ws.binaryType = 'arraybuffer';
        }

        // Connection timeout
        const connectTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            const error = new K256WebSocketError(
              'CONNECTION_FAILED',
              'Connection timeout'
            );
            this.handleError(error);
            reject(error);
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectTimeout);
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.lastHeartbeatTime = Date.now();
          
          // Start keepalive
          this.startPingInterval();
          this.startHeartbeatTimeout();
          
          // Restore subscriptions
          if (this.pendingSubscription) {
            this.sendSubscription(this.pendingSubscription);
          }
          if (this.pendingQuoteSubscription) {
            this.sendQuoteSubscription(this.pendingQuoteSubscription);
          }
          
          this.config.onConnect?.();
          resolve();
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout);
          this.cleanup();
          
          const wasClean = event.wasClean;
          const code = event.code;
          const reason = event.reason || this.getCloseReason(code);

          this.config.onDisconnect?.(code, reason, wasClean);

          // Determine if we should reconnect
          if (!this.isIntentionallyClosed && this.config.autoReconnect) {
            if (this.shouldReconnect(code)) {
              this.scheduleReconnect();
            } else {
              const error = new K256WebSocketError(
                this.getErrorCodeFromClose(code),
                reason,
                code,
                reason
              );
              this.handleError(error);
              this.setState('closed');
            }
          } else {
            this.setState('disconnected');
          }
        };

        this.ws.onerror = () => {
          // WebSocket errors don't provide details - wait for onclose
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        const wsError = new K256WebSocketError(
          'CONNECTION_FAILED',
          'Failed to create WebSocket',
          undefined,
          undefined,
          error
        );
        this.handleError(wsError);
        reject(wsError);
      }
    });
  }

  private handleMessage(data: ArrayBuffer | string): void {
    this.config.onRawMessage?.(data);

    try {
      let decoded: DecodedMessage | null = null;

      if (data instanceof ArrayBuffer) {
        // Binary message
        decoded = decodeMessage(data);
        
        // Handle batch specially
        if (decoded === null) {
          // Check if it's a batch
          const view = new DataView(data);
          if (view.byteLength > 0 && view.getUint8(0) === MessageType.PoolUpdateBatch) {
            const payload = data.slice(1);
            const updates = decodePoolUpdateBatch(payload);
            
            // Emit batch callback
            if (this.config.onPoolUpdateBatch) {
              this.config.onPoolUpdateBatch(updates);
            }
            
            // Also emit individual updates
            for (const update of updates) {
              this.config.onPoolUpdate?.(update);
              this.config.onMessage?.(update);
            }
            return;
          }
        }
      } else {
        // JSON string (when mode is 'json')
        const parsed = JSON.parse(data);
        decoded = {
          type: parsed.type,
          data: parsed.data || parsed,
        } as DecodedMessage;
      }

      if (!decoded) {
        return;
      }

      // Emit message callback
      this.config.onMessage?.(decoded);

      // Emit type-specific callbacks
      switch (decoded.type) {
        case 'subscribed':
          this.config.onSubscribed?.(decoded as DecodedMessage & { type: 'subscribed' });
          break;
        case 'pool_update':
          this.config.onPoolUpdate?.(decoded as PoolUpdateMessage);
          break;
        case 'priority_fees':
          this.config.onPriorityFees?.(decoded as DecodedMessage & { type: 'priority_fees' });
          break;
        case 'blockhash':
          this.config.onBlockhash?.(decoded as DecodedMessage & { type: 'blockhash' });
          break;
        case 'quote':
          this.config.onQuote?.(decoded as DecodedMessage & { type: 'quote' });
          break;
        case 'quote_subscribed':
          this.config.onQuoteSubscribed?.(decoded as DecodedMessage & { type: 'quote_subscribed' });
          break;
        case 'heartbeat':
          this.lastHeartbeatTime = Date.now();
          this.resetHeartbeatTimeout();
          this.config.onHeartbeat?.(decoded as DecodedMessage & { type: 'heartbeat' });
          break;
        case 'pong':
          this.clearPongTimeout();
          const latencyMs = this.lastPingTime ? Date.now() - this.lastPingTime : 0;
          this.config.onPong?.(latencyMs);
          break;
        case 'error':
          const errorData = (decoded as DecodedMessage & { type: 'error' }).data;
          const error = new K256WebSocketError(
            'SERVER_ERROR',
            errorData.message
          );
          this.handleError(error);
          break;
      }
    } catch (error) {
      const wsError = new K256WebSocketError(
        'INVALID_MESSAGE',
        'Failed to decode message',
        undefined,
        undefined,
        error
      );
      this.handleError(wsError);
    }
  }

  private sendSubscription(options: SubscribeOptions): void {
    const msg: Record<string, unknown> = {
      type: 'subscribe',
      channels: options.channels,
    };

    // Add format for JSON mode
    if (this.config.mode === 'json') {
      msg.format = 'json';
    }

    // Add filters
    if (options.pools?.length) {
      msg.pools = options.pools;
    }
    if (options.protocols?.length) {
      msg.protocols = options.protocols;
    }
    if (options.tokenPairs?.length) {
      msg.token_pairs = options.tokenPairs;
    }

    this.ws?.send(JSON.stringify(msg));
  }

  private sendQuoteSubscription(options: SubscribeQuoteOptions): void {
    const msg = {
      type: 'subscribe_quote',
      inputMint: options.inputMint,
      outputMint: options.outputMint,
      amount: typeof options.amount === 'string' ? parseInt(options.amount, 10) : options.amount,
      slippageBps: options.slippageBps,
      refreshIntervalMs: options.refreshIntervalMs ?? 1000,
    };

    this.ws?.send(JSON.stringify(msg));
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      const prevState = this._state;
      this._state = state;
      this.config.onStateChange?.(state, prevState);
    }
  }

  private handleError(error: K256WebSocketError): void {
    this.config.onError?.(error);
  }

  private cleanup(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    this.pingTimer = setInterval(() => {
      this.ping();
    }, this.config.pingIntervalMs);
  }

  private startPongTimeout(): void {
    this.clearPongTimeout();
    
    this.pongTimer = setTimeout(() => {
      const error = new K256WebSocketError(
        'PING_TIMEOUT',
        'Server did not respond to ping'
      );
      this.handleError(error);
      
      // Force reconnect
      this.ws?.close(CloseCode.GOING_AWAY, 'Ping timeout');
    }, this.config.pongTimeoutMs);
  }

  private clearPongTimeout(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private startHeartbeatTimeout(): void {
    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setTimeout(() => {
      const error = new K256WebSocketError(
        'HEARTBEAT_TIMEOUT',
        'No heartbeat received from server'
      );
      this.handleError(error);
      // Don't disconnect - heartbeat is informational
    }, this.config.heartbeatTimeoutMs);
  }

  private shouldReconnect(closeCode: number): boolean {
    // Don't reconnect on auth failures or policy violations
    if (closeCode === CloseCode.POLICY_VIOLATION) {
      return false;
    }
    
    // Check max attempts
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return false;
    }
    
    return true;
  }

  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelayMs
    );
    const jitter = Math.random() * 0.3 * baseDelay;
    const delay = Math.floor(baseDelay + jitter);
    
    this.config.onReconnecting?.(this.reconnectAttempts, delay);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.doConnect();
      } catch {
        // Error already handled in doConnect
      }
    }, delay);
  }

  private getCloseReason(code: number): string {
    switch (code) {
      case CloseCode.NORMAL:
        return 'Normal closure';
      case CloseCode.GOING_AWAY:
        return 'Server shutting down';
      case CloseCode.PROTOCOL_ERROR:
        return 'Protocol error';
      case CloseCode.UNSUPPORTED_DATA:
        return 'Unsupported message type';
      case CloseCode.ABNORMAL:
        return 'Connection lost unexpectedly';
      case CloseCode.INVALID_PAYLOAD:
        return 'Invalid message data';
      case CloseCode.POLICY_VIOLATION:
        return 'Authentication failed or rate limited';
      case CloseCode.MESSAGE_TOO_BIG:
        return 'Message too large';
      case CloseCode.INTERNAL_ERROR:
        return 'Server error';
      case CloseCode.SERVICE_RESTART:
        return 'Server is restarting';
      case CloseCode.TRY_AGAIN_LATER:
        return 'Server overloaded';
      default:
        return `Unknown close code: ${code}`;
    }
  }

  private getErrorCodeFromClose(code: number): K256ErrorCode {
    switch (code) {
      case CloseCode.POLICY_VIOLATION:
        return 'AUTH_FAILED';
      case CloseCode.INTERNAL_ERROR:
      case CloseCode.SERVICE_RESTART:
      case CloseCode.TRY_AGAIN_LATER:
        return 'SERVER_ERROR';
      case CloseCode.PROTOCOL_ERROR:
      case CloseCode.UNSUPPORTED_DATA:
      case CloseCode.INVALID_PAYLOAD:
        return 'PROTOCOL_ERROR';
      default:
        return 'CONNECTION_LOST';
    }
  }
}

export default K256WebSocketClient;
