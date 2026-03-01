<?php

declare(strict_types=1);

namespace K256;

use K256\Decoder;
use K256\MessageType;
use K256\Types\{Blockhash, FeeMarket, Heartbeat, PoolUpdate, PriceEntry, Quote};
use Ratchet\Client\Connector;
use Ratchet\Client\WebSocket;
use React\EventLoop\Loop;

/**
 * K256 WebSocket client for real-time Solana liquidity data.
 *
 * @example
 * $client = new K256Client(apiKey: $_ENV['K256_API_KEY']);
 *
 * $client->onPoolUpdate(function (PoolUpdate $update) {
 *     echo "Pool {$update->poolAddress}: slot={$update->slot}\n";
 * });
 *
 * $client->connect();
 * $client->subscribe(['pools', 'priority_fees', 'blockhash']);
 */
class K256Client
{
    private const DEFAULT_ENDPOINT = 'wss://gateway.k256.xyz/v1/ws';

    private string $apiKey;
    private string $endpoint;
    private bool $reconnect;
    private float $reconnectDelayInitial;
    private float $reconnectDelayMax;
    private float $reconnectDelay;

    private ?WebSocket $ws = null;
    private bool $running = false;
    private ?array $lastSubscription = null;
    private ?array $lastPriceSubscription = null;

    /** @var callable|null */
    private $onPoolUpdate = null;
    /** @var callable|null */
    private $onFeeMarket = null;
    /** @var callable|null */
    private $onBlockhash = null;
    /** @var callable|null */
    private $onQuote = null;
    /** @var callable|null */
    private $onHeartbeat = null;
    /** @var callable|null */
    private $onPriceUpdate = null;
    /** @var callable|null */
    private $onPriceBatch = null;
    /** @var callable|null */
    private $onPriceSnapshot = null;
    /** @var callable|null */
    private $onError = null;
    /** @var callable|null */
    private $onConnected = null;
    /** @var callable|null */
    private $onDisconnected = null;

    public function __construct(
        string $apiKey,
        string $endpoint = self::DEFAULT_ENDPOINT,
        bool $reconnect = true,
        float $reconnectDelayInitial = 1.0,
        float $reconnectDelayMax = 60.0,
    ) {
        $this->apiKey = $apiKey;
        $this->endpoint = $endpoint;
        $this->reconnect = $reconnect;
        $this->reconnectDelayInitial = $reconnectDelayInitial;
        $this->reconnectDelayMax = $reconnectDelayMax;
        $this->reconnectDelay = $reconnectDelayInitial;
    }

    /**
     * Register a callback for pool updates.
     */
    public function onPoolUpdate(callable $callback): void
    {
        $this->onPoolUpdate = $callback;
    }

    /**
     * Register a callback for fee market updates.
     */
    public function onFeeMarket(callable $callback): void
    {
        $this->onFeeMarket = $callback;
    }

    /**
     * Register a callback for blockhash updates.
     */
    public function onBlockhash(callable $callback): void
    {
        $this->onBlockhash = $callback;
    }

    /**
     * Register a callback for quote updates.
     */
    public function onQuote(callable $callback): void
    {
        $this->onQuote = $callback;
    }

    /**
     * Register a callback for heartbeat messages.
     */
    public function onHeartbeat(callable $callback): void
    {
        $this->onHeartbeat = $callback;
    }

    /**
     * Register a callback for individual price updates.
     */
    public function onPriceUpdate(callable $callback): void
    {
        $this->onPriceUpdate = $callback;
    }

    /**
     * Register a callback for batched price updates.
     */
    public function onPriceBatch(callable $callback): void
    {
        $this->onPriceBatch = $callback;
    }

    /**
     * Register a callback for the initial price snapshot.
     */
    public function onPriceSnapshot(callable $callback): void
    {
        $this->onPriceSnapshot = $callback;
    }

    /**
     * Register a callback for errors.
     */
    public function onError(callable $callback): void
    {
        $this->onError = $callback;
    }

    /**
     * Register a callback for connection established.
     */
    public function onConnected(callable $callback): void
    {
        $this->onConnected = $callback;
    }

    /**
     * Register a callback for disconnection.
     */
    public function onDisconnected(callable $callback): void
    {
        $this->onDisconnected = $callback;
    }

    /**
     * Connect to the K256 WebSocket.
     */
    public function connect(): void
    {
        $this->running = true;
        $this->doConnect();
        Loop::run();
    }

    /**
     * Disconnect from the WebSocket.
     */
    public function disconnect(): void
    {
        $this->running = false;
        $this->ws?->close();
        $this->ws = null;
    }

    /**
     * Subscribe to channels.
     *
     * @param string[] $channels List of channels
     * @param string[]|null $protocols Optional DEX protocols to filter
     * @param string[]|null $pools Optional pool addresses to filter
     * @param array<array<string>>|null $tokenPairs Optional token pairs to filter
     */
    public function subscribe(
        array $channels,
        ?array $protocols = null,
        ?array $pools = null,
        ?array $tokenPairs = null,
    ): void {
        $this->lastSubscription = [
            'channels' => $channels,
            'protocols' => $protocols,
            'pools' => $pools,
            'token_pairs' => $tokenPairs,
        ];

        if ($this->ws !== null) {
            $this->sendSubscribe();
        }
    }

    /**
     * Unsubscribe from all channels.
     */
    public function unsubscribe(): void
    {
        $this->lastSubscription = null;
        $this->lastPriceSubscription = null;
        $this->sendJson(['type' => 'unsubscribe']);
    }

    private function doConnect(): void
    {
        $url = "{$this->endpoint}?apiKey={$this->apiKey}";

        $connector = new Connector();
        $connector($url)->then(
            function (WebSocket $conn) {
                $this->ws = $conn;
                $this->reconnectDelay = $this->reconnectDelayInitial;

                if ($this->onConnected !== null) {
                    ($this->onConnected)();
                }

                if ($this->lastSubscription !== null) {
                    $this->sendSubscribe();
                }

                if ($this->lastPriceSubscription !== null) {
                    $this->sendPriceSubscribe();
                }

                $conn->on('message', function ($msg) {
                    $data = (string) $msg;
                    if ($msg->isBinary()) {
                        $this->handleBinaryMessage($data);
                    } else {
                        $this->handleTextMessage($data);
                    }
                });

                $conn->on('close', function () {
                    if ($this->onDisconnected !== null) {
                        ($this->onDisconnected)();
                    }
                    $this->scheduleReconnect();
                });
            },
            function (\Exception $e) {
                if ($this->onError !== null) {
                    ($this->onError)($e->getMessage());
                }
                $this->scheduleReconnect();
            }
        );
    }

    private function handleBinaryMessage(string $data): void
    {
        if (strlen($data) < 1) {
            return;
        }

        $msgType = ord($data[0]);
        $payload = substr($data, 1);

        switch ($msgType) {
            case MessageType::POOL_UPDATE:
                if ($this->onPoolUpdate !== null) {
                    $update = Decoder::decodePoolUpdate($payload);
                    if ($update !== null) {
                        ($this->onPoolUpdate)($update);
                    }
                }
                break;

            case MessageType::POOL_UPDATE_BATCH:
                if ($this->onPoolUpdate !== null) {
                    $updates = Decoder::decodePoolUpdateBatch($payload);
                    foreach ($updates as $update) {
                        ($this->onPoolUpdate)($update);
                    }
                }
                break;

            case MessageType::PRIORITY_FEES:
                if ($this->onFeeMarket !== null) {
                    $fees = Decoder::decodeFeeMarket($payload);
                    if ($fees !== null) {
                        ($this->onFeeMarket)($fees);
                    }
                }
                break;

            case MessageType::BLOCKHASH:
                if ($this->onBlockhash !== null) {
                    $bh = Decoder::decodeBlockhash($payload);
                    if ($bh !== null) {
                        ($this->onBlockhash)($bh);
                    }
                }
                break;

            case MessageType::QUOTE:
                if ($this->onQuote !== null) {
                    $quote = Decoder::decodeQuote($payload);
                    if ($quote !== null) {
                        ($this->onQuote)($quote);
                    }
                }
                break;

            case MessageType::PRICE_UPDATE:
                if ($this->onPriceUpdate !== null) {
                    $entry = Decoder::decodePriceUpdate($payload);
                    if ($entry !== null) {
                        ($this->onPriceUpdate)($entry);
                    }
                }
                break;

            case MessageType::PRICE_BATCH:
                $entries = Decoder::decodePriceEntries($payload);
                if ($this->onPriceBatch !== null) {
                    ($this->onPriceBatch)($entries);
                }
                if ($this->onPriceUpdate !== null) {
                    foreach ($entries as $entry) {
                        ($this->onPriceUpdate)($entry);
                    }
                }
                break;

            case MessageType::PRICE_SNAPSHOT:
                $entries = Decoder::decodePriceEntries($payload);
                if ($this->onPriceSnapshot !== null) {
                    ($this->onPriceSnapshot)($entries);
                }
                if ($this->onPriceUpdate !== null) {
                    foreach ($entries as $entry) {
                        ($this->onPriceUpdate)($entry);
                    }
                }
                break;

            case MessageType::ERROR:
                if ($this->onError !== null) {
                    // Decode UTF-8 error message
                    $message = mb_convert_encoding($payload, 'UTF-8', 'UTF-8');
                    ($this->onError)($message);
                }
                break;
        }
    }

    private function handleTextMessage(string $data): void
    {
        try {
            $json = json_decode($data, true, flags: JSON_THROW_ON_ERROR);
            $type = $json['type'] ?? '';

            switch ($type) {
                case 'heartbeat':
                    if ($this->onHeartbeat !== null) {
                        $hb = new Heartbeat(
                            timestampMs: $json['timestamp_ms'] ?? 0,
                            uptimeSeconds: $json['uptime_seconds'] ?? 0,
                            messagesReceived: $json['messages_received'] ?? 0,
                            messagesSent: $json['messages_sent'] ?? 0,
                            subscriptions: $json['subscriptions'] ?? 0,
                        );
                        ($this->onHeartbeat)($hb);
                    }
                    break;

                case 'error':
                    if ($this->onError !== null) {
                        ($this->onError)($json['message'] ?? 'Unknown error');
                    }
                    break;
            }
        } catch (\JsonException) {
            // Ignore invalid JSON
        }
    }

    private function scheduleReconnect(): void
    {
        if (!$this->running || !$this->reconnect) {
            return;
        }

        $jitter = mt_rand(0, 500) / 1000;
        $delay = min($this->reconnectDelay + $jitter, $this->reconnectDelayMax);

        Loop::addTimer($delay, fn() => $this->doConnect());

        $this->reconnectDelay = min($this->reconnectDelay * 2, $this->reconnectDelayMax);
    }

    /**
     * Subscribe to price updates for tokens.
     *
     * @param string[] $tokens Token mint addresses (empty = all tokens)
     * @param int $thresholdBps Minimum price change in basis points to receive updates
     */
    public function subscribePrices(array $tokens = [], int $thresholdBps = 10): void
    {
        $this->lastPriceSubscription = [
            'tokens' => $tokens,
            'threshold_bps' => $thresholdBps,
        ];

        if ($this->ws !== null) {
            $this->sendPriceSubscribe();
        }
    }

    /**
     * Unsubscribe from price updates.
     */
    public function unsubscribePrices(): void
    {
        $this->lastPriceSubscription = null;
        $this->sendJson(['type' => 'unsubscribe_price']);
    }

    private function sendSubscribe(): void
    {
        if ($this->lastSubscription === null) {
            return;
        }

        $msg = ['type' => 'subscribe', 'channels' => $this->lastSubscription['channels']];
        if ($this->lastSubscription['protocols'] !== null) {
            $msg['protocols'] = $this->lastSubscription['protocols'];
        }
        if ($this->lastSubscription['pools'] !== null) {
            $msg['pools'] = $this->lastSubscription['pools'];
        }
        if ($this->lastSubscription['token_pairs'] !== null) {
            $msg['token_pairs'] = $this->lastSubscription['token_pairs'];
        }

        $this->sendJson($msg);
    }

    private function sendPriceSubscribe(): void
    {
        if ($this->lastPriceSubscription === null) {
            return;
        }

        $msg = [
            'type' => 'subscribe_price',
            'tokens' => $this->lastPriceSubscription['tokens'],
            'threshold_bps' => $this->lastPriceSubscription['threshold_bps'],
        ];

        $this->sendJson($msg);
    }

    private function sendJson(array $data): void
    {
        $this->ws?->send(json_encode($data));
    }
}
