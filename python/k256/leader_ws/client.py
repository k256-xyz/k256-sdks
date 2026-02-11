"""Leader Schedule WebSocket client.

Connects to the K256 leader-schedule service via the Gateway using JSON mode.
Automatically subscribes to configured channels on connect.

Example:
    import asyncio
    from k256.leader_ws import LeaderWebSocketClient

    async def main():
        client = LeaderWebSocketClient(api_key="your-api-key")
        client.on_slot_update = lambda msg: print(f"Slot: {msg['data']['slot']}")
        await client.connect()

    asyncio.run(main())
"""

import asyncio
import json
import logging
from typing import Callable, Dict, List, Optional, Any
from urllib.parse import urlencode

try:
    import websockets
except ImportError:
    raise ImportError("Install websockets: pip install websockets")

from .types import ALL_LEADER_CHANNELS

logger = logging.getLogger("k256.leader_ws")

MessageHandler = Callable[[Dict[str, Any]], None]


class LeaderWebSocketClient:
    """WebSocket client for K256 leader-schedule data (JSON mode).

    Attributes:
        on_subscribed: Called when subscription is confirmed.
        on_leader_schedule: Called on full leader schedule (snapshot).
        on_gossip_snapshot: Called on full gossip peer list (snapshot, key: identity).
        on_gossip_diff: Called on gossip changes (diff, key: identity).
        on_slot_update: Called on slot update (snapshot).
        on_routing_health: Called on routing health (snapshot).
        on_skip_event: Called on block production stats (event, key: leader).
        on_ip_change: Called on IP change (event, key: identity).
        on_heartbeat: Called on heartbeat (snapshot, every 10s).
        on_message: Called on any message (raw dict).
        on_error: Called on error.
    """

    def __init__(
        self,
        api_key: str,
        url: str = "wss://gateway.k256.xyz/v1/leader-ws",
        channels: Optional[List[str]] = None,
        auto_reconnect: bool = True,
        reconnect_delay: float = 1.0,
        max_reconnect_delay: float = 60.0,
        max_message_size: int = 4 * 1024 * 1024,
    ):
        self.api_key = api_key
        self.url = url
        self.channels = channels or ALL_LEADER_CHANNELS
        self.auto_reconnect = auto_reconnect
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay
        self.max_message_size = max_message_size

        # Callbacks
        self.on_subscribed: Optional[MessageHandler] = None
        self.on_leader_schedule: Optional[MessageHandler] = None
        self.on_gossip_snapshot: Optional[MessageHandler] = None
        self.on_gossip_diff: Optional[MessageHandler] = None
        self.on_slot_update: Optional[MessageHandler] = None
        self.on_routing_health: Optional[MessageHandler] = None
        self.on_skip_event: Optional[MessageHandler] = None
        self.on_ip_change: Optional[MessageHandler] = None
        self.on_heartbeat: Optional[MessageHandler] = None
        self.on_message: Optional[MessageHandler] = None
        self.on_error: Optional[Callable[[Exception], None]] = None

        self._ws = None
        self._running = False

    async def connect(self) -> None:
        """Connect and start receiving messages."""
        self._running = True
        delay = self.reconnect_delay

        while self._running:
            try:
                ws_url = f"{self.url}?{urlencode({'apiKey': self.api_key})}"
                async with websockets.connect(ws_url, max_size=self.max_message_size) as ws:
                    self._ws = ws
                    delay = self.reconnect_delay
                    logger.info("Connected to %s", self.url)

                    # Subscribe with JSON mode
                    await ws.send(json.dumps({
                        "type": "subscribe",
                        "channels": self.channels,
                        "format": "json",
                    }))

                    async for message in ws:
                        if isinstance(message, str):
                            self._handle_message(message)

            except Exception as e:
                if not self._running:
                    break
                logger.error("Connection error: %s", e)
                if self.on_error:
                    self.on_error(e)

                if not self.auto_reconnect:
                    break

                logger.info("Reconnecting in %.1fs...", delay)
                await asyncio.sleep(delay)
                delay = min(delay * 2, self.max_reconnect_delay)

    def disconnect(self) -> None:
        """Disconnect from the WebSocket."""
        self._running = False
        if self._ws:
            asyncio.ensure_future(self._ws.close())

    def _handle_message(self, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            return

        msg_type = msg.get("type", "")

        # Dispatch to typed callbacks
        handlers = {
            "subscribed": self.on_subscribed,
            "leader_schedule": self.on_leader_schedule,
            "gossip_snapshot": self.on_gossip_snapshot,
            "gossip_diff": self.on_gossip_diff,
            "slot_update": self.on_slot_update,
            "routing_health": self.on_routing_health,
            "skip_event": self.on_skip_event,
            "ip_change": self.on_ip_change,
            "heartbeat": self.on_heartbeat,
        }

        handler = handlers.get(msg_type)
        if handler:
            handler(msg)

        if self.on_message:
            self.on_message(msg)
