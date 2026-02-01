package xyz.k256.sdk.utils;

/**
 * Base58 encoding/decoding utilities for Solana addresses.
 */
public final class Base58 {
    private static final String ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    private static final int[] INDEXES = new int[128];

    static {
        for (int i = 0; i < INDEXES.length; i++) {
            INDEXES[i] = -1;
        }
        for (int i = 0; i < ALPHABET.length(); i++) {
            INDEXES[ALPHABET.charAt(i)] = i;
        }
    }

    private Base58() {
        // Prevent instantiation
    }

    /**
     * Encode bytes to base58 string.
     *
     * @param input Bytes to encode
     * @return Base58-encoded string
     */
    public static String encode(byte[] input) {
        if (input.length == 0) {
            return "";
        }

        // Copy input to avoid mutation
        byte[] data = java.util.Arrays.copyOf(input, input.length);

        // Count leading zeros
        int leadingZeros = 0;
        for (byte b : data) {
            if (b == 0) {
                leadingZeros++;
            } else {
                break;
            }
        }

        // Allocate enough space for result
        byte[] temp = new byte[data.length * 2];
        int outputStart = temp.length;

        for (int inputStart = leadingZeros; inputStart < data.length; ) {
            int remainder = 0;
            for (int i = inputStart; i < data.length; i++) {
                int digit = (data[i] & 0xFF) + (remainder << 8);
                data[i] = (byte) (digit / 58);
                remainder = digit % 58;
                if (data[inputStart] == 0) {
                    inputStart++;
                }
            }
            temp[--outputStart] = (byte) ALPHABET.charAt(remainder);
        }

        // Preserve leading zeros as '1's
        while (leadingZeros-- > 0) {
            temp[--outputStart] = (byte) '1';
        }

        return new String(temp, outputStart, temp.length - outputStart);
    }

    /**
     * Decode base58 string to bytes.
     *
     * @param input Base58-encoded string
     * @return Decoded bytes
     * @throws IllegalArgumentException if string contains invalid characters
     */
    public static byte[] decode(String input) {
        if (input.isEmpty()) {
            return new byte[0];
        }

        // Count leading '1's (leading zeros)
        int leadingZeros = 0;
        for (int i = 0; i < input.length() && input.charAt(i) == '1'; i++) {
            leadingZeros++;
        }

        // Allocate enough space
        byte[] temp = new byte[input.length()];
        int outputStart = temp.length;

        for (int i = leadingZeros; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c >= 128 || INDEXES[c] == -1) {
                throw new IllegalArgumentException("Invalid Base58 character: " + c);
            }

            int carry = INDEXES[c];
            for (int j = temp.length - 1; j >= outputStart || carry != 0; j--) {
                carry += 58 * (temp[j] & 0xFF);
                temp[j] = (byte) (carry & 0xFF);
                carry >>= 8;
                if (j <= outputStart && carry != 0) {
                    outputStart--;
                }
            }
        }

        // Build result with leading zeros
        byte[] result = new byte[leadingZeros + (temp.length - outputStart)];
        System.arraycopy(temp, outputStart, result, leadingZeros, temp.length - outputStart);
        return result;
    }

    /**
     * Check if a string is a valid Solana public key.
     *
     * @param address Base58-encoded address to validate
     * @return True if valid, false otherwise
     */
    public static boolean isValidPubkey(String address) {
        if (address == null || address.length() < 32 || address.length() > 44) {
            return false;
        }
        try {
            byte[] decoded = decode(address);
            return decoded.length == 32;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
