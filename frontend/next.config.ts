import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
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
    const backendBaseUrl =
      process.env.BACKEND_API_BASE_URL ??
      process.env.BACKEND_URL ??
      "http://127.0.0.1:8000";

    return [
      {
        source: "/auth/:path*",
        destination: `${backendBaseUrl}/auth/:path*`,
      },
      {
        source: "/api/cases/:path*",
        destination: `${backendBaseUrl}/api/cases/:path*`,
      },
    ];
  },
};

export default nextConfig;
