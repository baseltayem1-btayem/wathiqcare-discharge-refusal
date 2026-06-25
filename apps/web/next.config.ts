import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "../..");
const CANONICAL_ORIGIN = "https://wathiqcare.online";

// Content-Security-Policy
// Fonts are self-hosted via next/font (no external font CDN needed).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://cdn.phototourl.com https://www.imc.med.sa",
  "connect-src 'self' https://*.app.github.dev",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/discharge/**": ["./contracts/**"],
  },
  experimental: {
    cpus: 1,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.phototourl.com", pathname: "/**" },
      { protocol: "https", hostname: "www.imc.med.sa", pathname: "/**" },
    ],
  },
  async redirects() {
    return [
      // www → canonical
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wathiqcare.online" }],
        destination: `${CANONICAL_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // Public-facing signing URL alias for promissory notes
      {
        source: "/public-signing/promissory-note/:token*",
        destination: "/public/promissory-note-signing/:token*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
