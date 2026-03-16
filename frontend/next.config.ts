import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  // Include contract files in serverless function bundles (Vercel)
  outputFileTracingIncludes: {
    "/api/discharge/**": ["./contracts/**"],
  },
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.phototourl.com",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    // Keep rewrites empty to prevent platform-level forwarding to private hosts.
    // All backend calls must go through controlled Next API route handlers.
    return [];
  },
};

export default nextConfig;
