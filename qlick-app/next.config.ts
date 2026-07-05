import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's HMR / `/_next/*` dev resources to be requested from
  // the local network, so the site is fully interactive when opened on a phone
  // (e.g. http://192.168.1.74:3000). Without this, Next 16 BLOCKS cross-origin
  // dev resources → the page renders but the client JS never hydrates → taps do
  // nothing on the phone (production builds are unaffected). If your LAN IP
  // changes, the wildcard subnets below keep it working.
  allowedDevOrigins: [
    "192.168.1.74",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.0.*",
    "172.16.0.*",
  ],
};

export default nextConfig;
