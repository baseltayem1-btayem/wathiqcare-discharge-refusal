import { PrismaClient } from "@prisma/client";

declare global {
  var __wathiqcarePrisma__: PrismaClient | undefined;
}

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma =
      global.__wathiqcarePrisma__ ??
      new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
      });
    if (process.env.NODE_ENV !== "production") {
      global.__wathiqcarePrisma__ = prisma;
    }
  }
  return prisma;
}
