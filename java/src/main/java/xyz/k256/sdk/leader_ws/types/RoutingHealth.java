package xyz.k256.sdk.leader_ws.types;

/** Routing health summary (snapshot). */
public class RoutingHealth {
    public int leadersTotal;
    public int leadersInGossip;
    public String[] leadersMissingGossip;
    public String[] leadersWithoutTpuQuic;
    public String[] leadersDelinquent;
    public String coverage;
}
