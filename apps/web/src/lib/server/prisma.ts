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
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "10");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "20");
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma =
      global.__wathiqcarePrisma__ ??
      new PrismaClient({
        datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL),
      });
    if (process.env.NODE_ENV !== "production") {
      global.__wathiqcarePrisma__ = prisma;
    }
  }
  return prisma;
}
