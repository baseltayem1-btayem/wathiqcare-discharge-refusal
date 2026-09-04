const { resolveTracingRoot } = require("./scripts/resolve-tracing-root.cjs");

const { root: tracingRoot, contractsInclude } = resolveTracingRoot();
const CANONICAL_ORIGIN = "https://wathiqcare.online";

const CSP = [
    "default-src 'self'",
    process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://cdn.phototourl.com https://www.imc.med.sa",
    "connect-src 'self' https://*.app.github.dev",
    "object-src 'self' blob:",
    "frame-src 'self'",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: tracingRoot,
    outputFileTracingIncludes: {
        "/api/discharge/**": [contractsInclude],
    },
    experimental: {
        // Limit parallel build workers to 1 for Codespaces/low-memory stability.
        // Prevents OOM kills when available heap is constrained (<4 GB free).
        cpus: 1,
    },
    typescript: {
        ignoreBuildErrors: false,
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
                    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
                    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
                    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
