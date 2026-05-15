const path = require("node:path");

const monorepoRoot = path.resolve(process.cwd(), "../..");
const CANONICAL_ORIGIN = "https://wathiqcare.online";

const CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://cdn.phototourl.com https://www.imc.med.sa",
    "connect-src 'self' https://*.app.github.dev",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: monorepoRoot,
    outputFileTracingIncludes: {
        "/api/discharge/**": ["./contracts/**"],
    },
    turbopack: {
        root: monorepoRoot,
    },
    experimental: {
        // Limit parallel build workers to 1 for Codespaces/low-memory stability.
        // Prevents OOM kills when available heap is constrained (<4 GB free).
        cpus: 1,
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
        return [];
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
                ],
            },
        ];
    },
};

module.exports = nextConfig;