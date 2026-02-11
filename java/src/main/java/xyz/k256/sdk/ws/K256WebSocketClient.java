package xyz.k256.sdk.ws;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import xyz.k256.sdk.types.*;

import java.net.URI;
import java.nio.ByteBuffer;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * K256 WebSocket client for real-time Solana liquidity data.
 *
 * <pre>{@code
 * K256WebSocketClient client = new K256WebSocketClient.Builder()
 *     .apiKey("your-api-key")
 *     .onPoolUpdate(update -> System.out.println("Pool: " + update.poolAddress()))
 *     .onFeeMarket(fees -> System.out.println("Fee: " + fees.recommended()))
 *     .build();
 *
 * client.connect();
 * client.subscribe(List.of("pools", "priority_fees", "blockhash"));
 * }</pre>
 */
public class K256WebSocketClient extends WebSocketClient {
    private static final Logger log = LoggerFactory.getLogger(K256WebSocketClient.class);
    private static final String DEFAULT_ENDPOINT = "wss://gateway.k256.xyz/v1/ws";
    private static final Gson gson = new Gson();

    private final String apiKey;
    private final boolean reconnect;
    private final long reconnectDelayInitialMs;
    private final long reconnectDelayMaxMs;

    private Consumer<PoolUpdate> onPoolUpdate;
    private Consumer<FeeMarket> onFeeMarket;
    private Consumer<Blockhash> onBlockhash;
    private Consumer<Quote> onQuote;
    private Consumer<Heartbeat> onHeartbeat;
    private Consumer<String> onError;
    private Runnable onConnected;
    private Runnable onDisconnected;

    private volatile boolean running;
    private long reconnectDelay;
    private SubscribeRequest lastSubscription;

    private K256WebSocketClient(URI serverUri, String apiKey, boolean reconnect,
                                 long reconnectDelayInitialMs, long reconnectDelayMaxMs) {
        super(serverUri);
        this.apiKey = apiKey;
        this.reconnect = reconnect;
        this.reconnectDelayInitialMs = reconnectDelayInitialMs;
        this.reconnectDelayMaxMs = reconnectDelayMaxMs;
        this.reconnectDelay = reconnectDelayInitialMs;
    }

    @Override
    public void onOpen(ServerHandshake handshake) {
        log.info("Connected to K256 WebSocket");
        reconnectDelay = reconnectDelayInitialMs;
        if (onConnected != null) {
            onConnected.run();
        }
        if (lastSubscription != null) {
            sendSubscription(lastSubscription);
        }
    }

    @Override
    public void onMessage(String message) {
        try {
            JsonObject json = gson.fromJson(message, JsonObject.class);
            String type = json.has("type") ? json.get("type").getAsString() : "";

            if ("heartbeat".equals(type) && onHeartbeat != null) {
                Heartbeat hb = new Heartbeat(
                    json.get("timestamp_ms").getAsLong(),
                    json.get("uptime_seconds").getAsLong(),
                    json.get("messages_received").getAsLong(),
                    json.get("messages_sent").getAsLong(),
                    json.get("subscriptions").getAsInt()
                );
                onHeartbeat.accept(hb);
            } else if ("subscribed".equals(type)) {
                log.info("Subscribed to channels: {}", json.get("channels"));
            } else if ("error".equals(type) && onError != null) {
                onError.accept(json.get("message").getAsString());
            }
        } catch (Exception e) {
            log.error("Error parsing JSON message", e);
        }
    }

    @Override
    public void onMessage(ByteBuffer bytes) {
        if (bytes.remaining() < 1) return;

        byte[] data = new byte[bytes.remaining()];
        bytes.get(data);

        int msgType = data[0] & 0xFF;
        byte[] payload = Arrays.copyOfRange(data, 1, data.length);

        switch (msgType) {
            case MessageType.POOL_UPDATE -> {
                if (onPoolUpdate != null) {
                    PoolUpdate update = MessageDecoder.decodePoolUpdate(payload);
                    if (update != null) onPoolUpdate.accept(update);
                }
            }
            case MessageType.POOL_UPDATE_BATCH -> {
                if (onPoolUpdate != null) {
                    List<PoolUpdate> updates = MessageDecoder.decodePoolUpdateBatch(payload);
                    for (PoolUpdate update : updates) {
                        onPoolUpdate.accept(update);
                    }
                }
            }
            case MessageType.PRIORITY_FEES -> {
                if (onFeeMarket != null) {
                    FeeMarket fees = MessageDecoder.decodeFeeMarket(payload);
                    if (fees != null) onFeeMarket.accept(fees);
                }
            }
            case MessageType.BLOCKHASH -> {
                if (onBlockhash != null) {
                    Blockhash bh = MessageDecoder.decodeBlockhash(payload);
                    if (bh != null) onBlockhash.accept(bh);
                }
            }
            case MessageType.QUOTE -> {
                if (onQuote != null) {
                    Quote quote = MessageDecoder.decodeQuote(payload);
                    if (quote != null) onQuote.accept(quote);
                }
            }
            case MessageType.ERROR -> {
                if (onError != null) {
                    onError.accept(new String(payload));
                }
            }
        }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        log.info("WebSocket closed: code={}, reason={}", code, reason);
        if (onDisconnected != null) {
            onDisconnected.run();
        }

        if (running && reconnect) {
            scheduleReconnect();
        }
    }

    @Override
    public void onError(Exception ex) {
        log.error("WebSocket error", ex);
        if (onError != null) {
            onError.accept(ex.getMessage());
        }
    }

    private void scheduleReconnect() {
        long jitter = (long) (Math.random() * 500);
        long delay = Math.min(reconnectDelay + jitter, reconnectDelayMaxMs);
        log.info("Reconnecting in {}ms...", delay);

        new Timer().schedule(new TimerTask() {
            @Override
            public void run() {
                try {
                    reconnect();
                } catch (Exception e) {
                    log.error("Reconnect failed", e);
                }
            }
        }, delay);

        reconnectDelay = Math.min(reconnectDelay * 2, reconnectDelayMaxMs);
    }

    /**
     * Subscribe to channels.
     *
     * @param channels List of channels (e.g., "pools", "priority_fees", "blockhash")
     */
    public void subscribe(List<String> channels) {
        subscribe(channels, null, null, null);
    }

    /**
     * Subscribe to channels with optional filters.
     *
     * @param channels List of channels
     * @param protocols Optional DEX protocols to filter
     * @param pools Optional pool addresses to filter
     * @param tokenPairs Optional token pairs to filter
     */
    public void subscribe(List<String> channels, List<String> protocols,
                          List<String> pools, List<List<String>> tokenPairs) {
        SubscribeRequest request = new SubscribeRequest(channels, protocols, pools, tokenPairs);
        lastSubscription = request;
        if (isOpen()) {
            sendSubscription(request);
        }
    }

    private void sendSubscription(SubscribeRequest request) {
        JsonObject json = new JsonObject();
        json.addProperty("type", "subscribe");
        json.add("channels", gson.toJsonTree(request.channels));
        if (request.protocols != null) {
            json.add("protocols", gson.toJsonTree(request.protocols));
        }
        if (request.pools != null) {
            json.add("pools", gson.toJsonTree(request.pools));
        }
        if (request.tokenPairs != null) {
            json.add("token_pairs", gson.toJsonTree(request.tokenPairs));
        }
        send(gson.toJson(json));
    }

    /**
     * Unsubscribe from all channels.
     */
    public void unsubscribe() {
        lastSubscription = null;
        if (isOpen()) {
            JsonObject json = new JsonObject();
            json.addProperty("type", "unsubscribe");
            send(gson.toJson(json));
        }
    }

    /**
     * Start the client and connect.
     */
    public void start() {
        running = true;
        connect();
    }

    /**
     * Stop the client and disconnect.
     */
    public void stop() {
        running = false;
        close();
    }

    private record SubscribeRequest(
        List<String> channels,
        List<String> protocols,
        List<String> pools,
        List<List<String>> tokenPairs
    ) {}

    /**
     * Builder for K256WebSocketClient.
     */
    public static class Builder {
        private String endpoint = DEFAULT_ENDPOINT;
        private String apiKey;
        private boolean reconnect = true;
        private long reconnectDelayInitialMs = 1000;
        private long reconnectDelayMaxMs = 60000;

        private Consumer<PoolUpdate> onPoolUpdate;
        private Consumer<FeeMarket> onFeeMarket;
        private Consumer<Blockhash> onBlockhash;
        private Consumer<Quote> onQuote;
        private Consumer<Heartbeat> onHeartbeat;
        private Consumer<String> onError;
        private Runnable onConnected;
        private Runnable onDisconnected;

        public Builder endpoint(String endpoint) {
            this.endpoint = endpoint;
            return this;
        }

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder reconnect(boolean reconnect) {
            this.reconnect = reconnect;
            return this;
        }

        public Builder reconnectDelayInitial(long delay, TimeUnit unit) {
            this.reconnectDelayInitialMs = unit.toMillis(delay);
            return this;
        }

        public Builder reconnectDelayMax(long delay, TimeUnit unit) {
            this.reconnectDelayMaxMs = unit.toMillis(delay);
            return this;
        }

        public Builder onPoolUpdate(Consumer<PoolUpdate> callback) {
            this.onPoolUpdate = callback;
            return this;
        }

        public Builder onFeeMarket(Consumer<FeeMarket> callback) {
            this.onFeeMarket = callback;
            return this;
        }

        public Builder onBlockhash(Consumer<Blockhash> callback) {
            this.onBlockhash = callback;
            return this;
        }

        public Builder onQuote(Consumer<Quote> callback) {
            this.onQuote = callback;
            return this;
        }

        public Builder onHeartbeat(Consumer<Heartbeat> callback) {
            this.onHeartbeat = callback;
            return this;
        }

        public Builder onError(Consumer<String> callback) {
            this.onError = callback;
            return this;
        }

        public Builder onConnected(Runnable callback) {
            this.onConnected = callback;
            return this;
        }

        public Builder onDisconnected(Runnable callback) {
            this.onDisconnected = callback;
            return this;
        }

        public K256WebSocketClient build() {
            if (apiKey == null || apiKey.isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }

            URI uri = URI.create(endpoint + "?apiKey=" + apiKey);
            K256WebSocketClient client = new K256WebSocketClient(
                uri, apiKey, reconnect, reconnectDelayInitialMs, reconnectDelayMaxMs
            );

            client.onPoolUpdate = onPoolUpdate;
            client.onFeeMarket = onFeeMarket;
            client.onBlockhash = onBlockhash;
            client.onQuote = onQuote;
            client.onHeartbeat = onHeartbeat;
            client.onError = onError;
            client.onConnected = onConnected;
            client.onDisconnected = onDisconnected;

            return client;
        }
    }
}
