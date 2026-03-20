import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include contract files in serverless function bundles (Vercel)
  outputFileTracingIncludes: {
    "/api/discharge/**": ["./contracts/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.phototourl.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.imc.med.sa",
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
