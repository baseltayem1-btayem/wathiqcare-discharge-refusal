/**
 * @wathiqcare/config — Shared runtime configuration and constants.
 *
 * Environment variable names and business-level constants consumed by
 * both apps/web (Next.js) and apps/api (FastAPI via env reads).
 */

// ── Environment variable keys ─────────────────────────────────────────

export const ENV = {
    // App
    APP_BASE_URL: "APP_BASE_URL",
    API_BASE_URL: "API_BASE_URL",

    // Database
    DATABASE_URL: "DATABASE_URL",

    // Redis / Queue
    REDIS_URL: "REDIS_URL",

    // Object storage
    S3_ENDPOINT: "S3_ENDPOINT",
    S3_REGION: "S3_REGION",
    S3_BUCKET: "S3_BUCKET",
    S3_ACCESS_KEY: "S3_ACCESS_KEY",
    S3_SECRET_KEY: "S3_SECRET_KEY",

    // SMS
    SMS_PROVIDER: "SMS_PROVIDER",
    TAQNYAT_API_KEY: "TAQNYAT_API_KEY",
    UNIFONIC_API_KEY: "UNIFONIC_API_KEY",
    SMS_SENDER_ID: "SMS_SENDER_ID",

    // Email
    MICROSOFT_TENANT_ID: "MICROSOFT_TENANT_ID",
    MICROSOFT_CLIENT_ID: "MICROSOFT_CLIENT_ID",
    MICROSOFT_CLIENT_SECRET: "MICROSOFT_CLIENT_SECRET",
    MICROSOFT_SENDER_EMAIL: "MICROSOFT_SENDER_EMAIL",

    // Payments
    PAYMENT_PROVIDER: "PAYMENT_PROVIDER",
    STRIPE_SECRET_KEY: "STRIPE_SECRET_KEY",
    STRIPE_WEBHOOK_SECRET: "STRIPE_WEBHOOK_SECRET",
    HYPERPAY_ACCESS_TOKEN: "HYPERPAY_ACCESS_TOKEN",
    HYPERPAY_ENTITY_ID: "HYPERPAY_ENTITY_ID",

    // Security
    JWT_SECRET: "JWT_SECRET",
    PUBLIC_LINK_TOKEN_PEPPER: "PUBLIC_LINK_TOKEN_PEPPER",
    OTP_SECRET: "OTP_SECRET",
} as const;

// ── Workflow constants ─────────────────────────────────────────────────

export const WORKFLOW = {
    /** Default token validity in seconds (24 hours). */
    TOKEN_TTL_SECONDS: 86_400,
    /** Default OTP validity in seconds (10 minutes). */
    OTP_TTL_SECONDS: 600,
    /** Maximum OTP send attempts before lockout. */
    OTP_MAX_ATTEMPTS: 3,
    /** Max token access attempts before rate-limit kicks in. */
    TOKEN_MAX_ACCESS_ATTEMPTS: 20,
} as const;

// ── Document constants ─────────────────────────────────────────────────

export const DOCUMENT = {
    TEMPLATE_VERSION: "1.0.0",
    DEFAULT_LANGUAGE: "ar" as const,
    SUPPORTED_LANGUAGES: ["ar", "en"] as const,
} as const;

// ── Payment constants ──────────────────────────────────────────────────

export const PAYMENT = {
    DEFAULT_CURRENCY: "SAR",
    PROVIDERS: {
        HYPERPAY: "hyperpay",
        STRIPE: "stripe",
        MOCK: "mock",
    },
} as const;

// ── SMS constants ──────────────────────────────────────────────────────

export const SMS = {
    PROVIDERS: {
        TAQNYAT: "taqnyat",
        UNIFONIC: "unifonic",
        MOCK: "mock",
    },
} as const;
