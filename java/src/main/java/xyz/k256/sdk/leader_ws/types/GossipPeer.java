package xyz.k256.sdk.leader_ws.types;

/**
 * A single gossip network peer with routing-relevant data.
 */
public class GossipPeer {
    public String identity;
    public String tpuQuic;
    public String tpuUdp;
    public String tpuForwardsQuic;
    public String tpuForwardsUdp;
    public String tpuVote;
    public String gossipAddr;
    public String version;
    public int shredVersion;
    public long stake;
    public int commission;
    public boolean isDelinquent;
    public long wallclock;
    /** ISO 3166 country code (e.g. "US", "DE") */
    public String countryCode;
    /** Two-letter continent code (e.g. "NA", "EU") */
    public String continentCode;
    /** ASN string (e.g. "AS15169") */
    public String asn;
    /** AS organization name (e.g. "Google LLC") */
    public String asName;
    /** AS organization domain (e.g. "google.com") */
    public String asDomain;
}
