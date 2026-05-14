type EnvValidationOptions = {
  context?: string;
  log?: boolean;
};

const REQUIRED_SERVER_ENV = [
  'DATABASE_URL',
  'DATABASE_URL_POOLED',
  'DATABASE_URL_UNPOOLED',
  'NEXTAUTH_SECRET',
  'JWT_SECRET_KEY',
  'BASE_URL',
  'APP_URL',
  'STORAGE_PROVIDER',
  'STORAGE_BUCKET',
] as const;

export type RequiredServerEnvKey = (typeof REQUIRED_SERVER_ENV)[number];

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function resolveRuntimeDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
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

  const missingNonCritical = REQUIRED_SERVER_ENV.filter((key) => !hasValue(process.env[key]));

  if (options.log !== false) {
    const context = options.context ? `[${options.context}] ` : '';
    const statusText = getSafeEnvValidationStatus()
      .map((s) => `${s.key}=${s.present ? 'set' : 'missing'}`)
      .join(', ');
    console.info(`${context}environment validation status: ${statusText}`);

    if (missingNonCritical.length > 0) {
      console.warn(`${context}non-critical missing env vars: ${missingNonCritical.join(', ')}`);
    }
  }
}
