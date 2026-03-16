type Env = Record<string, string | undefined>;

function requireEnv(env: Env, key: string, errors: string[]): string {
    const value = env[key]?.trim();
    if (!value) {
        errors.push(`Missing required environment variable: ${key}`);
        return "";
    }
    return value;
}

function validateUrl(value: string, key: string, errors: string[]) {
    try {
        new URL(value);
    } catch {
        errors.push(`Invalid URL for ${key}: ${value}`);
    }
}

function validateBoolean(value: string | undefined, key: string, errors: string[]) {
    if (value === undefined || value.trim() === "") {
        return;
    }

    const normalized = value.trim().toLowerCase();
    if (!["1", "0", "true", "false", "yes", "no", "on", "off"].includes(normalized)) {
        errors.push(`${key} must be a boolean-like value (true/false/1/0/yes/no/on/off), received: ${value}`);
    }
}

export function validateEnv(env: Env) {
    const errors: string[] = [];
    const isProduction = env["NODE_ENV"] === "production";

    const port = requireEnv(env, "PORT", errors);
    const apiPrefix = requireEnv(env, "API_PREFIX", errors);
    const databaseUrl = requireEnv(env, "DATABASE_URL", errors);
    const accessSecret = requireEnv(env, "JWT_ACCESS_SECRET", errors);
    const refreshSecret = requireEnv(env, "JWT_REFRESH_SECRET", errors);
    const redisUrl = requireEnv(env, "REDIS_URL", errors);
    const s3Endpoint = requireEnv(env, "S3_ENDPOINT", errors);
    const s3Bucket = requireEnv(env, "S3_BUCKET", errors);
    const s3AccessKey = requireEnv(env, "S3_ACCESS_KEY", errors);
    const s3SecretKey = requireEnv(env, "S3_SECRET_KEY", errors);
    const defaultTenantCode = requireEnv(env, "DEFAULT_TENANT_CODE", errors);

    if (port && Number.isNaN(Number(port))) {
        errors.push(`PORT must be numeric, received: ${port}`);
    }

    if (apiPrefix && apiPrefix.includes(" ")) {
        errors.push("API_PREFIX must not contain spaces");
    }

    if (databaseUrl) {
        validateUrl(databaseUrl, "DATABASE_URL", errors);
    }
    if (redisUrl) {
        validateUrl(redisUrl, "REDIS_URL", errors);
    }
    if (s3Endpoint) {
        validateUrl(s3Endpoint, "S3_ENDPOINT", errors);
    }

    validateBoolean(env["STARTUP_STRICT_READINESS"], "STARTUP_STRICT_READINESS", errors);
    validateBoolean(env["OTP_ALLOW_INMEMORY_FALLBACK"], "OTP_ALLOW_INMEMORY_FALLBACK", errors);

    const maxUploadRaw = env["MAX_UPLOAD_FILE_SIZE_BYTES"]?.trim();
    if (maxUploadRaw) {
        const maxUploadSize = Number(maxUploadRaw);
        if (!Number.isFinite(maxUploadSize) || maxUploadSize <= 0) {
            errors.push(`MAX_UPLOAD_FILE_SIZE_BYTES must be a positive number, received: ${maxUploadRaw}`);
        }
        if (maxUploadSize > 100 * 1024 * 1024) {
            errors.push("MAX_UPLOAD_FILE_SIZE_BYTES must be <= 104857600 (100 MB)");
        }
    }

    const allowedMimeTypes = env["ALLOWED_UPLOAD_MIME_TYPES"]?.trim();
    if (allowedMimeTypes) {
        const mimeList = allowedMimeTypes.split(",").map((item) => item.trim()).filter(Boolean);
        if (mimeList.length === 0) {
            errors.push("ALLOWED_UPLOAD_MIME_TYPES is set but contains no valid MIME types");
        }
        for (const mimeType of mimeList) {
            if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(mimeType)) {
                errors.push(`Invalid MIME type in ALLOWED_UPLOAD_MIME_TYPES: ${mimeType}`);
            }
        }
    }

    // Enforce strong secrets in production; accept short values in development only.
    const jwtMinLength = isProduction ? 32 : 8;
    if (accessSecret && accessSecret.length < jwtMinLength) {
        errors.push(
            `JWT_ACCESS_SECRET must be at least ${jwtMinLength} characters in ${isProduction ? "production" : "non-production"} environments`,
        );
    }
    if (refreshSecret && refreshSecret.length < jwtMinLength) {
        errors.push(
            `JWT_REFRESH_SECRET must be at least ${jwtMinLength} characters in ${isProduction ? "production" : "non-production"} environments`,
        );
    }

    // Warn if production secrets appear to be default/example values.
    if (isProduction) {
        const weakSecrets = ["change-me", "secret", "access-secret", "refresh-secret", "changeme"];
        if (accessSecret && weakSecrets.some((w) => accessSecret.toLowerCase().includes(w))) {
            errors.push("JWT_ACCESS_SECRET appears to be a default/example value — replace it in production");
        }
        if (refreshSecret && weakSecrets.some((w) => refreshSecret.toLowerCase().includes(w))) {
            errors.push("JWT_REFRESH_SECRET appears to be a default/example value — replace it in production");
        }
        if (s3AccessKey === "minioadmin") {
            errors.push("S3_ACCESS_KEY must not use the default MinIO admin credentials in production");
        }
        if (s3SecretKey === "minioadmin") {
            errors.push("S3_SECRET_KEY must not use the default MinIO admin credentials in production");
        }
    }

    if (s3Bucket && s3Bucket.includes(" ")) {
        errors.push("S3_BUCKET must not contain spaces");
    }
    if (!s3AccessKey || !s3SecretKey || !defaultTenantCode) {
        // values already reported above; keep this block for readability only.
    }

    // CORS_ALLOWED_ORIGINS is optional but if set in production must be valid URLs.
    const corsOrigins = env["CORS_ALLOWED_ORIGINS"]?.trim();
    if (corsOrigins && isProduction) {
        corsOrigins.split(",").forEach((origin) => {
            try {
                const parsed = new URL(origin.trim());
                if (parsed.hostname === "localhost" || parsed.hostname.startsWith("127.")) {
                    errors.push(`CORS_ALLOWED_ORIGINS must not include localhost/private loopback in production: "${origin.trim()}"`);
                }
            } catch {
                errors.push(`Invalid URL in CORS_ALLOWED_ORIGINS: "${origin.trim()}"`);
            }
        });
    }

    if (isProduction && env["OTP_ALLOW_INMEMORY_FALLBACK"]?.trim().toLowerCase() === "true") {
        errors.push("OTP_ALLOW_INMEMORY_FALLBACK cannot be true in production");
    }

    if (errors.length > 0) {
        throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
    }

    return env;
}