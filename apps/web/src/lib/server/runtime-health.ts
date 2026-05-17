import { createHash } from "crypto";
import { getPrisma } from "@/lib/server/prisma";
import { runDbOperation } from "@/lib/server/db-resilience";

export const PRODUCTION_RUNTIME_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "AUTH_TRUST_HOST",
  "NODE_ENV",
] as const;

type DbUrlSource = {
  source: string;
  value: string;
};

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getRuntimeEnvPresence() {
  return PRODUCTION_RUNTIME_ENV_KEYS.map((key) => ({
    key,
    present: hasValue(process.env[key]),
  }));
}

function resolveFirstUrl(candidates: readonly string[]): DbUrlSource | null {
  for (const candidate of candidates) {
    const value = process.env[candidate]?.trim();
    if (value) {
      return { source: candidate, value };
    }
  }
  return null;
}

export function resolvePooledRuntimeDbUrl(): DbUrlSource | null {
  return resolveFirstUrl(["DATABASE_URL", "DATABASE_URL_POOLED", "POSTGRES_PRISMA_URL"]);
}

export function resolveDirectRuntimeDbUrl(): DbUrlSource | null {
  return resolveFirstUrl(["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_URL"]);
}

export function parseDbConnectionConfig(urlValue: string | null) {
  if (!urlValue) {
    return {
      configured: false,
      host: null,
      database: null,
      sslMode: null,
      pgbouncer: null,
      connectionLimit: null,
    };
  }

  try {
    const parsed = new URL(urlValue);
    return {
      configured: true,
      host: parsed.hostname || null,
      database: parsed.pathname?.replace(/^\//, "") || null,
      sslMode: parsed.searchParams.get("sslmode"),
      pgbouncer: parsed.searchParams.get("pgbouncer"),
      connectionLimit: parsed.searchParams.get("connection_limit"),
    };
  } catch {
    return {
      configured: true,
      host: "unparseable",
      database: null,
      sslMode: null,
      pgbouncer: null,
      connectionLimit: null,
    };
  }
}

export async function probePrismaConnectivity(timeoutMs = 2500) {
  const startedAt = Date.now();
  await runDbOperation(() => getPrisma().$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`, {
    operationName: "runtime_health_prisma_probe",
    timeoutMs,
    maxRetries: 0,
  });

  return {
    ok: true,
    latencyMs: Date.now() - startedAt,
  };
}

export function buildRuntimeFingerprint() {
  const payload = PRODUCTION_RUNTIME_ENV_KEYS.map((key) => `${key}=${process.env[key] ?? ""}`).join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}
