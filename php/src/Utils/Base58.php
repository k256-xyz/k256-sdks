<?php

declare(strict_types=1);

namespace K256\Utils;

/**
 * Base58 encoding/decoding utilities for Solana addresses.
 */
final class Base58
{
    private const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    private const BASE = 58;

    private static ?array $indexes = null;

    private function __construct()
    {
        // Prevent instantiation
    }

    /**
     * Encode bytes to base58 string.
     *
     * @param string $data Binary data to encode
     * @return string Base58-encoded string
     */
    public static function encode(string $data): string
    {
        if ($data === '') {
            return '';
        }

        $bytes = array_values(unpack('C*', $data));

        // Count leading zeros
        $leadingZeros = 0;
        foreach ($bytes as $byte) {
            if ($byte === 0) {
                $leadingZeros++;
            } else {
                break;
            }
        }

        // Convert to GMP number
        $num = gmp_init(0);
        foreach ($bytes as $byte) {
            $num = gmp_add(gmp_mul($num, 256), $byte);
        }

        // Convert to base58
        $result = '';
        while (gmp_cmp($num, 0) > 0) {
            [$num, $remainder] = gmp_div_qr($num, self::BASE);
            $result = self::ALPHABET[gmp_intval($remainder)] . $result;
        }

        // Add leading '1's
        return str_repeat('1', $leadingZeros) . $result;
    }

    /**
     * Decode base58 string to bytes.
     *
     * @param string $input Base58-encoded string
     * @return string Decoded binary data
     * @throws \InvalidArgumentException if string contains invalid characters
     */
    public static function decode(string $input): string
    {
        if ($input === '') {
            return '';
        }

        self::initIndexes();

        // Count leading '1's
        $leadingOnes = 0;
        for ($i = 0; $i < strlen($input) && $input[$i] === '1'; $i++) {
            $leadingOnes++;
        }

        // Convert from base58 to GMP number
        $num = gmp_init(0);
        for ($i = 0; $i < strlen($input); $i++) {
            $char = $input[$i];
            $index = self::$indexes[$char] ?? -1;
            if ($index < 0) {
                throw new \InvalidArgumentException("Invalid Base58 character: {$char}");
            }
            $num = gmp_add(gmp_mul($num, self::BASE), $index);
        }

        // Convert to bytes
        $bytes = [];
        while (gmp_cmp($num, 0) > 0) {
            [$num, $remainder] = gmp_div_qr($num, 256);
            array_unshift($bytes, gmp_intval($remainder));
        }

        // Add leading zero bytes
        $bytes = array_merge(array_fill(0, $leadingOnes, 0), $bytes);

        return pack('C*', ...$bytes);
    }

    /**
     * Check if a string is a valid Solana public key.
     *
     * @param string $address Base58-encoded address
     * @return bool True if valid
     */
    public static function isValidPubkey(string $address): bool
    {
        if (strlen($address) < 32 || strlen($address) > 44) {
            return false;
        }

        try {
            $decoded = self::decode($address);
            return strlen($decoded) === 32;
        } catch (\InvalidArgumentException) {
            return false;
        }
    }

    private static function initIndexes(): void
    {
        if (self::$indexes !== null) {
            return;
        }

        self::$indexes = [];
        for ($i = 0; $i < strlen(self::ALPHABET); $i++) {
            self::$indexes[self::ALPHABET[$i]] = $i;
        }
    }
}
