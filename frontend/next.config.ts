import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
      {
        source: "/api/documents/:path*",
        destination: `${backendBaseUrl}/api/documents/:path*`,
      },
      {
        source: "/api/discharge/:path*",
        destination: `${backendBaseUrl}/api/discharge/:path*`,
      },
    ];
  },
};

export default nextConfig;
