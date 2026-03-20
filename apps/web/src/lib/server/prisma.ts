import { PrismaClient } from "@prisma/client";

declare global {
  var __wathiqcarePrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__wathiqcarePrisma__ ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  global.__wathiqcarePrisma__ = prisma;
}
