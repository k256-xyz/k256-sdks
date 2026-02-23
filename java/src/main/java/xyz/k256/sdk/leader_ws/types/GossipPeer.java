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
    /** City name (e.g. "Frankfurt") — from MaxMind GeoLite2 on server */
    public String city;
    /** Region/state name (e.g. "California") */
    public String region;
    /** Latitude */
    public double latitude;
    /** Longitude */
    public double longitude;
    /** IANA timezone (e.g. "America/Los_Angeles") */
    public String timezone;
}
