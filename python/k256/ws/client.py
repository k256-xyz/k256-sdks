"""K256 WebSocket client implementation."""

import asyncio
import json
import logging
import random
from typing import Callable, Optional, Any
from dataclasses import dataclass, field

import websockets
from websockets.client import WebSocketClientProtocol

from k256.types import (
    PoolUpdate,
    PriorityFees,
    Blockhash,
    Quote,
    Heartbeat,
    MessageType,
)
from k256.ws.decoder import decode_message

logger = logging.getLogger(__name__)


@dataclass
class K256Config:
    """Configuration for K256 WebSocket client.
    
    Attributes:
        api_key: K256 API key
        endpoint: WebSocket endpoint URL
        reconnect: Whether to automatically reconnect
        reconnect_delay_initial: Initial reconnect delay in seconds
        reconnect_delay_max: Maximum reconnect delay in seconds
        ping_interval: Ping interval in seconds (0 to disable)
    """
    
    api_key: str
    endpoint: str = "wss://gateway.k256.xyz/v1/ws"
    reconnect: bool = True
    reconnect_delay_initial: float = 1.0
    reconnect_delay_max: float = 60.0
    ping_interval: float = 30.0


@dataclass
class SubscribeRequest:
    """WebSocket subscription request.
    
    Attributes:
        channels: List of channels to subscribe to
        format: Message format ("binary" or "json")
        protocols: Optional list of DEX protocols to filter
        pools: Optional list of pool addresses to filter
        token_pairs: Optional list of token pairs to filter
    """
    
    channels: list[str] = field(default_factory=lambda: ["pools", "priority_fees", "blockhash"])
    format: str = "binary"
    protocols: Optional[list[str]] = None
    pools: Optional[list[str]] = None
    token_pairs: Optional[list[tuple[str, str]]] = None
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        d: dict[str, Any] = {
            "type": "subscribe",
            "channels": self.channels,
        }
        if self.format != "binary":
            d["format"] = self.format
        if self.protocols:
            d["protocols"] = self.protocols
        if self.pools:
            d["pools"] = self.pools
        if self.token_pairs:
            d["token_pairs"] = [list(pair) for pair in self.token_pairs]
        return d


class K256WebSocketClient:
    """K256 WebSocket client for real-time Solana liquidity data.
    
    Example:
        >>> client = K256WebSocketClient(api_key="your-api-key")
        >>> 
        >>> @client.on_pool_update
        >>> def handle_pool(update):
        ...     print(f"Pool {update.pool_address}: slot={update.slot}")
        >>> 
        >>> await client.connect()
        >>> client.subscribe(channels=["pools", "priority_fees"])
        >>> await asyncio.Event().wait()
    """
    
    def __init__(
        self,
        api_key: str,
        *,
        endpoint: str = "wss://gateway.k256.xyz/v1/ws",
        reconnect: bool = True,
        reconnect_delay_initial: float = 1.0,
        reconnect_delay_max: float = 60.0,
        ping_interval: float = 30.0,
    ) -> None:
        """Initialize the WebSocket client.
        
        Args:
            api_key: K256 API key
            endpoint: WebSocket endpoint URL
            reconnect: Whether to automatically reconnect
            reconnect_delay_initial: Initial reconnect delay in seconds
            reconnect_delay_max: Maximum reconnect delay in seconds
            ping_interval: Ping interval in seconds
        """
        self._config = K256Config(
            api_key=api_key,
            endpoint=endpoint,
            reconnect=reconnect,
            reconnect_delay_initial=reconnect_delay_initial,
            reconnect_delay_max=reconnect_delay_max,
            ping_interval=ping_interval,
        )
        
        self._ws: Optional[WebSocketClientProtocol] = None
        self._running = False
        self._reconnect_delay = reconnect_delay_initial
        self._last_subscription: Optional[SubscribeRequest] = None
        
        # Callbacks
        self._on_pool_update: Optional[Callable[[PoolUpdate], None]] = None
        self._on_priority_fees: Optional[Callable[[PriorityFees], None]] = None
        self._on_blockhash: Optional[Callable[[Blockhash], None]] = None
        self._on_quote: Optional[Callable[[Quote], None]] = None
        self._on_heartbeat: Optional[Callable[[Heartbeat], None]] = None
        self._on_error: Optional[Callable[[Exception], None]] = None
        self._on_connected: Optional[Callable[[], None]] = None
        self._on_disconnected: Optional[Callable[[], None]] = None
    
    def on_pool_update(self, callback: Callable[[PoolUpdate], None]) -> Callable[[PoolUpdate], None]:
        """Register a callback for pool updates.
        
        Can be used as a decorator:
            @client.on_pool_update
            def handle_pool(update):
                print(update)
        """
        self._on_pool_update = callback
        return callback
    
    def on_priority_fees(self, callback: Callable[[PriorityFees], None]) -> Callable[[PriorityFees], None]:
        """Register a callback for priority fee updates."""
        self._on_priority_fees = callback
        return callback
    
    def on_blockhash(self, callback: Callable[[Blockhash], None]) -> Callable[[Blockhash], None]:
        """Register a callback for blockhash updates."""
        self._on_blockhash = callback
        return callback
    
    def on_quote(self, callback: Callable[[Quote], None]) -> Callable[[Quote], None]:
        """Register a callback for quote updates."""
        self._on_quote = callback
        return callback
    
    def on_heartbeat(self, callback: Callable[[Heartbeat], None]) -> Callable[[Heartbeat], None]:
        """Register a callback for heartbeat messages."""
        self._on_heartbeat = callback
        return callback
    
    def on_error(self, callback: Callable[[Exception], None]) -> Callable[[Exception], None]:
        """Register a callback for errors."""
        self._on_error = callback
        return callback
    
    def on_connected(self, callback: Callable[[], None]) -> Callable[[], None]:
        """Register a callback for connection established."""
        self._on_connected = callback
        return callback
    
    def on_disconnected(self, callback: Callable[[], None]) -> Callable[[], None]:
        """Register a callback for disconnection."""
        self._on_disconnected = callback
        return callback
    
    @property
    def is_connected(self) -> bool:
        """Return True if connected to the WebSocket."""
        return self._ws is not None and self._ws.open
    
    async def connect(self) -> None:
        """Connect to the K256 WebSocket.
        
        This method starts the connection and message processing loop.
        It will automatically reconnect if configured to do so.
        """
        self._running = True
        await self._connect_loop()
    
    async def _connect_loop(self) -> None:
        """Internal connection loop with reconnection logic."""
        while self._running:
            try:
                url = f"{self._config.endpoint}?apiKey={self._config.api_key}"
                
                async with websockets.connect(
                    url,
                    ping_interval=self._config.ping_interval if self._config.ping_interval > 0 else None,
                    ping_timeout=10,
                ) as ws:
                    self._ws = ws
                    self._reconnect_delay = self._config.reconnect_delay_initial
                    
                    logger.info("Connected to K256 WebSocket")
                    if self._on_connected:
                        self._on_connected()
                    
                    # Resubscribe if we had a previous subscription
                    if self._last_subscription:
                        await self._send_subscribe(self._last_subscription)
                    
                    await self._message_loop()
                    
            except websockets.ConnectionClosed as e:
                logger.warning(f"WebSocket connection closed: {e}")
                if self._on_disconnected:
                    self._on_disconnected()
                    
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if self._on_error:
                    self._on_error(e)
            
            self._ws = None
            
            if not self._running or not self._config.reconnect:
                break
            
            # Exponential backoff with jitter
            jitter = random.uniform(0, 0.5)
            delay = min(self._reconnect_delay + jitter, self._config.reconnect_delay_max)
            logger.info(f"Reconnecting in {delay:.1f}s...")
            await asyncio.sleep(delay)
            self._reconnect_delay = min(self._reconnect_delay * 2, self._config.reconnect_delay_max)
    
    async def _message_loop(self) -> None:
        """Process incoming WebSocket messages."""
        if self._ws is None:
            return
        
        async for message in self._ws:
            try:
                if isinstance(message, bytes):
                    await self._handle_binary_message(message)
                else:
                    await self._handle_text_message(message)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                if self._on_error:
                    self._on_error(e)
    
    async def _handle_binary_message(self, data: bytes) -> None:
        """Handle a binary WebSocket message."""
        if len(data) == 0:
            return
        
        msg_type = data[0]
        payload = data[1:]
        
        try:
            decoded = decode_message(msg_type, payload)
            
            if isinstance(decoded, PoolUpdate) and self._on_pool_update:
                self._on_pool_update(decoded)
            elif isinstance(decoded, PriorityFees) and self._on_priority_fees:
                self._on_priority_fees(decoded)
            elif isinstance(decoded, Blockhash) and self._on_blockhash:
                self._on_blockhash(decoded)
            elif isinstance(decoded, Quote) and self._on_quote:
                self._on_quote(decoded)
            elif isinstance(decoded, Heartbeat) and self._on_heartbeat:
                self._on_heartbeat(decoded)
            elif isinstance(decoded, list):
                # Batch of pool updates
                if self._on_pool_update:
                    for update in decoded:
                        self._on_pool_update(update)
            elif isinstance(decoded, str):
                # Error message from server
                error = Exception(decoded)
                logger.error(f"Server error: {decoded}")
                if self._on_error:
                    self._on_error(error)
                        
        except Exception as e:
            logger.error(f"Error decoding message type {msg_type}: {e}")
            if self._on_error:
                self._on_error(e)
    
    async def _handle_text_message(self, data: str) -> None:
        """Handle a text WebSocket message (JSON)."""
        try:
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "heartbeat" and self._on_heartbeat:
                self._on_heartbeat(Heartbeat(
                    timestamp_ms=msg.get("timestamp_ms", 0),
                    uptime_seconds=msg.get("uptime_seconds", 0),
                    messages_received=msg.get("messages_received", 0),
                    messages_sent=msg.get("messages_sent", 0),
                    subscriptions=msg.get("subscriptions", 0),
                ))
            elif msg_type == "subscribed":
                logger.info(f"Subscribed to channels: {msg.get('channels', [])}")
            elif msg_type == "error":
                error = Exception(msg.get("message", "Unknown error"))
                logger.error(f"Server error: {error}")
                if self._on_error:
                    self._on_error(error)
                    
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON message: {e}")
    
    async def _send_subscribe(self, request: SubscribeRequest) -> None:
        """Send a subscription request."""
        if self._ws is None or not self._ws.open:
            raise RuntimeError("Not connected")
        
        await self._ws.send(json.dumps(request.to_dict()))
    
    def subscribe(
        self,
        channels: Optional[list[str]] = None,
        *,
        format: str = "binary",
        protocols: Optional[list[str]] = None,
        pools: Optional[list[str]] = None,
        token_pairs: Optional[list[tuple[str, str]]] = None,
    ) -> None:
        """Subscribe to channels.
        
        Args:
            channels: List of channels (default: ["pools", "priority_fees", "blockhash"])
            format: Message format ("binary" or "json")
            protocols: Optional DEX protocols to filter
            pools: Optional pool addresses to filter
            token_pairs: Optional token pairs to filter
        """
        request = SubscribeRequest(
            channels=channels or ["pools", "priority_fees", "blockhash"],
            format=format,
            protocols=protocols,
            pools=pools,
            token_pairs=token_pairs,
        )
        self._last_subscription = request
        
        if self.is_connected:
            asyncio.create_task(self._send_subscribe(request))
    
    def unsubscribe(self) -> None:
        """Unsubscribe from all channels."""
        if self.is_connected and self._ws:
            asyncio.create_task(self._ws.send(json.dumps({"type": "unsubscribe"})))
        self._last_subscription = None
    
    async def close(self) -> None:
        """Close the WebSocket connection."""
        self._running = False
        if self._ws:
            await self._ws.close()
            self._ws = None
