/**
 * Next.js configuration for static export compatibility (Vercel)
 * See: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 */
const path = require('node:path');

const monorepoRoot = path.resolve(process.cwd(), "../..")
const CANONICAL_ORIGIN = "https://wathiqcare.online";

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
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export',
    outputFileTracingRoot: monorepoRoot,
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
