export default () => ({
    env: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 4000),
    apiPrefix: process.env.API_PREFIX || "api",
    databaseUrl: process.env.DATABASE_URL,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || "access-secret",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    s3: {
        endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
        region: process.env.S3_REGION || "us-east-1",
        bucket: process.env.S3_BUCKET || "wathiqcare-docs",
        accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
        secretKey: process.env.S3_SECRET_KEY || "minioadmin",
    },
    defaultTenantCode: process.env.DEFAULT_TENANT_CODE || "wathiq-hospital",
});
