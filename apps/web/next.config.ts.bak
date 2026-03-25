import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "../..");
const CANONICAL_ORIGIN = "https://wathiqcare.online";

// Content-Security-Policy that works with self-hosted fonts (next/font/local + fontsource).
// font-src intentionally omits fonts.googleapis.com and fonts.gstatic.com —
// all fonts are served from the same origin (/_next/static/media/).
// 'unsafe-inline' in script-src/style-src is required by Next.js until
// nonce-based CSP is configured via middleware.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://cdn.phototourl.com https://www.imc.med.sa",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
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
      {
        protocol: "https",
        hostname: "www.imc.med.sa",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wathiqcare.online" }],
        destination: `${CANONICAL_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },

  async rewrites() {
    // Keep rewrites empty to prevent platform-level forwarding to private hosts.
    // All backend calls must go through controlled Next API route handlers.
    return [];
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes.
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
