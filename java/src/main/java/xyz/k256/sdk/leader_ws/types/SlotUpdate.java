package xyz.k256.sdk.leader_ws.types;

/** Current slot with leader identity (snapshot). */
public class SlotUpdate {
    public long slot;
    public String leader;
    public long blockHeight;
}
