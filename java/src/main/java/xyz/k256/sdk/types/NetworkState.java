package xyz.k256.sdk.types;

/**
 * Network congestion state.
 */
public enum NetworkState {
    /** Low congestion - minimal fees needed */
    LOW(0),
    /** Normal congestion */
    NORMAL(1),
    /** High congestion - higher fees recommended */
    HIGH(2),
    /** Extreme congestion - maximum fees recommended */
    EXTREME(3);

    private final int value;

    NetworkState(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static NetworkState fromValue(int value) {
        return switch (value) {
            case 0 -> LOW;
            case 1 -> NORMAL;
            case 2 -> HIGH;
            case 3 -> EXTREME;
            default -> NORMAL;
        };
    }
}
