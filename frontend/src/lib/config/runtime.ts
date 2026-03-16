function normalizeApiPrefix(raw: string | undefined): string {
    const fallback = "/api/nest";
    const trimmed = (raw || "").trim();
    if (!trimmed) {
        return fallback;
    }

    if (!trimmed.startsWith("/")) {
        return fallback;
    }

    return trimmed.replace(/\/$/, "") || fallback;
}

function normalizeTimeout(raw: string | undefined): number {
    const value = Number(raw || "20000");
    if (!Number.isFinite(value) || value <= 0) {
        return 20000;
    }
    return Math.min(value, 120000);
}

function assertRuntimeConfig(config: { apiProxyPrefix: string; apiTimeoutMs: number }) {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    if (!config.apiProxyPrefix.startsWith("/")) {
        throw new Error("NEXT_PUBLIC_BACKEND_PROXY_PREFIX must start with '/'");
    }

    if (config.apiTimeoutMs < 1000 || config.apiTimeoutMs > 120000) {
        throw new Error("NEXT_PUBLIC_API_TIMEOUT_MS must be between 1000 and 120000 in production");
    }
}

const configuredApiPrefix =
    process.env.NEXT_PUBLIC_BACKEND_PROXY_PREFIX || process.env.NEXT_PUBLIC_API_PREFIX;

export const runtimeConfig = {
    apiProxyPrefix: normalizeApiPrefix(configuredApiPrefix),
    apiTimeoutMs: normalizeTimeout(process.env.NEXT_PUBLIC_API_TIMEOUT_MS),
};

assertRuntimeConfig(runtimeConfig);
