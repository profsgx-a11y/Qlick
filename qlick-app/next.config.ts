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
  experimental: {
    serverActions: {
      // The appointment-import wizard uploads .xlsx files (capped at 4MB in
      // the action) and round-trips parsed rows; the default 1MB is too tight.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Next 16 restricts the allowed `quality` values to `[75]` by default and
    // silently coerces anything else down to it. Our marketing screenshots are
    // dense 1920×1080 UI captures with tiny text, so 75 looks blurry — allow a
    // high-fidelity 95 for those (75 stays for everything else).
    qualities: [75, 95],
  },
  // Don't advertise the framework/version to scanners.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody may frame us — the dashboard has one-click destructive
          // actions, so clickjacking is the risk. `frame-ancestors` is the
          // modern control; X-Frame-Options covers older browsers.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            // Deliberately narrow: `frame-ancestors`/`object-src`/`base-uri`
            // are safe to lock down without a nonce pipeline. A full
            // `script-src` policy needs per-request nonces on Next's inline
            // bootstrap — worth doing later, but it must not be guessed at.
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // Geolocation stays on: the search page and the shop address
            // picker both ask for the visitor's position.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
