import fs from "node:fs";
import path from "node:path";

type EnvValidationOptions = {
  context?: string;
  log?: boolean;
};

const REQUIRED_SERVER_ENV = [
  'DATABASE_URL',
  'DATABASE_URL_POOLED',
  'DATABASE_URL_UNPOOLED',
  'JWT_SECRET_KEY',
  'PUBLIC_LINK_TOKEN_PEPPER',
  'PUBLIC_SIGNING_OTP_PEPPER',
  'WATHIQ_STEP_UP_SECRET',
] as const;

const FORBIDDEN_SECRET_VALUES = [
  "",
  "change-me",
  "change_me",
  "replace-with-strong-secret",
  "replace-with-strong-random-secret",
  "replace-with-strong-random-pepper",
  "wathiqcare-step-up-dev-secret",
  "wathiqcare-public-link-pepper",
  "wathiqcare-signing-otp-pepper",
  "admin@wathiqcare.online",
  "admin@wathiqcare.com",
  "Admin@Wathiqcare2026!",
  "Reset@Wathiqcare2026!",
  "testpassword",
  "password",
  "secret",
  "123456",
] as const;

export type RequiredServerEnvKey = (typeof REQUIRED_SERVER_ENV)[number];

const DEV_DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "DATABASE_URL_POOLED",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

let localEnvCache: Map<string, string> | null = null;

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function isPlaceholderSecret(value: string | undefined): boolean {
  if (!hasValue(value)) return true;
  const normalized = value.trim().toLowerCase();
  return FORBIDDEN_SECRET_VALUES.some((forbidden) => normalized === forbidden.toLowerCase());
}

function normalizeEnvValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseEnvFile(content: string): Map<string, string> {
  const parsed = new Map<string, string>();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim().replace(/^export\s+/, "");
    const value = normalizeEnvValue(line.slice(separatorIndex + 1));
    if (key && value) {
      parsed.set(key, value);
    }
  }

  return parsed;
}

function getLocalEnvFallbackValue(key: string): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  if (!localEnvCache) {
    localEnvCache = new Map<string, string>();
    const cwd = process.cwd();
    const envFiles = [
      path.resolve(cwd, ".env.development.local"),
      path.resolve(cwd, ".env.local"),
      path.resolve(cwd, "..", "..", ".env.development.local"),
      path.resolve(cwd, "..", "..", ".env.local"),
    ];

    for (const envFile of envFiles) {
      if (!fs.existsSync(envFile)) {
        continue;
      }

      const parsed = parseEnvFile(fs.readFileSync(envFile, "utf8"));
      for (const [envKey, envValue] of parsed.entries()) {
        if (!localEnvCache.has(envKey)) {
          localEnvCache.set(envKey, envValue);
        }
      }
    }
  }

  return localEnvCache.get(key);
}

export function resolveRuntimeDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    DEV_DATABASE_ENV_KEYS.map((key) => getLocalEnvFallbackValue(key)).find((value) => hasValue(value))?.trim() ||
    undefined
  );
}

export function getSafeEnvValidationStatus() {
  return REQUIRED_SERVER_ENV.map((key) => ({
    key,
    present: hasValue(process.env[key]),
  }));
}

export function assertRuntimeEnv(options: EnvValidationOptions = {}): void {
  const databaseUrl = resolveRuntimeDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('Runtime configuration error: DATABASE_URL is required but missing');
  }

  const missingCritical = REQUIRED_SERVER_ENV.filter((key) => !hasValue(process.env[key]));
  if (missingCritical.length > 0) {
    throw new Error(
      `Runtime configuration error: missing required environment variables: ${missingCritical.join(', ')}`
    );
  }

  const secretKeys = REQUIRED_SERVER_ENV.filter((key) =>
    ['JWT_SECRET_KEY', 'PUBLIC_LINK_TOKEN_PEPPER', 'WATHIQ_STEP_UP_SECRET'].includes(key)
  );
  const placeholderSecrets = secretKeys.filter((key) =>
    isPlaceholderSecret(process.env[key])
  );
  if (placeholderSecrets.length > 0) {
    throw new Error(
      `Runtime configuration error: the following secrets are missing or use unsafe placeholder values: ${placeholderSecrets.join(', ')}`
    );
  }

  if (options.log !== false) {
    const context = options.context ? `[${options.context}] ` : '';
    const statusText = getSafeEnvValidationStatus()
      .map((s) => `${s.key}=${s.present ? 'set' : 'missing'}`)
      .join(', ');
    console.info(`${context}environment validation status: ${statusText}`);

    if (missingCritical.length > 0) {
      console.warn(`${context}non-critical missing env vars: ${missingCritical.join(', ')}`);
    }
  }
}
