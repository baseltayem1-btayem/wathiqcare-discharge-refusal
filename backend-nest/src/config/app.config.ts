function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
    if (raw === undefined) return fallback;
    const normalized = raw.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return fallback;
}

export default () => ({
    env: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 4000),
    apiPrefix: process.env.API_PREFIX || "api",
    databaseUrl: process.env.DATABASE_URL,
    // Comma-separated list of allowed CORS origins. Empty/unset disables CORS in production.
    // In development, defaults to allowing all origins.
    corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS
        ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o: string) => o.trim()).filter(Boolean)
        : [],
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "access-secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    startup: {
        // In production we fail fast when dependencies are unavailable.
        strictReadiness: parseBoolean(
            process.env.STARTUP_STRICT_READINESS,
            process.env.NODE_ENV === "production",
        ),
    },
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    otp: {
        // Memory fallback is acceptable in local/dev only.
        allowInMemoryFallback: parseBoolean(
            process.env.OTP_ALLOW_INMEMORY_FALLBACK,
            process.env.NODE_ENV !== "production",
        ),
    },
    s3: {
        endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
        region: process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET || "wathiqcare-docs",
        accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
        secretKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
    uploads: {
        maxFileSizeBytes: Number(process.env.MAX_UPLOAD_FILE_SIZE_BYTES || String(20 * 1024 * 1024)),
        allowedMimeTypes: process.env.ALLOWED_UPLOAD_MIME_TYPES
            ? process.env.ALLOWED_UPLOAD_MIME_TYPES.split(",").map((item) => item.trim()).filter(Boolean)
            : [
                "application/pdf",
                "image/png",
                "image/jpeg",
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ],
    },
    defaultTenantCode: process.env.DEFAULT_TENANT_CODE || "wathiq-hospital",
});
