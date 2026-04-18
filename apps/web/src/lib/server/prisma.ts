import { PrismaClient } from "@prisma/client";

declare global {
  var __wathiqcarePrisma__: PrismaClient | undefined;
}

let prisma: PrismaClient | undefined;

function normalizeDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return rawUrl;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("postgres://") && !trimmed.startsWith("postgresql://")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", process.env.PRISMA_PGBOUNCER || "true");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "5");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "5");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", process.env.PRISMA_CONNECT_TIMEOUT || "5");
    }
    if (!parsed.searchParams.has("socket_timeout")) {
      parsed.searchParams.set("socket_timeout", process.env.PRISMA_SOCKET_TIMEOUT || "10");
    }
    if (!parsed.searchParams.has("keepalives")) {
      parsed.searchParams.set("keepalives", process.env.PRISMA_KEEPALIVES || "1");
    }
    if (!parsed.searchParams.has("keepalives_idle")) {
      parsed.searchParams.set("keepalives_idle", process.env.PRISMA_KEEPALIVES_IDLE || "10");
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function resolveApplicationDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma =
      global.__wathiqcarePrisma__ ??
      new PrismaClient({
        datasourceUrl: normalizeDatabaseUrl(resolveApplicationDatabaseUrl()),
      });
    if (process.env.NODE_ENV !== "production") {
      global.__wathiqcarePrisma__ = prisma;
    }
  }
  return prisma;
}
