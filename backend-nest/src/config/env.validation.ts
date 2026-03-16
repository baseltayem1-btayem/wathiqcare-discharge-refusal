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

export function validateEnv(env: Env) {
    const errors: string[] = [];

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

    if (accessSecret && accessSecret.length < 8) {
        errors.push("JWT_ACCESS_SECRET must be at least 8 characters");
    }
    if (refreshSecret && refreshSecret.length < 8) {
        errors.push("JWT_REFRESH_SECRET must be at least 8 characters");
    }
    if (s3Bucket && s3Bucket.includes(" ")) {
        errors.push("S3_BUCKET must not contain spaces");
    }
    if (!s3AccessKey || !s3SecretKey || !defaultTenantCode) {
        // values already reported above; keep this block for readability only.
    }

    if (errors.length > 0) {
        throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
    }

    return env;
}