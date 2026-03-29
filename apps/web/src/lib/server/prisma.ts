import { PrismaClient } from "@prisma/client";


declare global {
  // eslint-disable-next-line no-var
  var __wathiqcarePrisma__: PrismaClient | undefined;
}

let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!prisma) {
    // config bootstrap not required
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
    if (process.env.NODE_ENV !== "production") {
      global.__wathiqcarePrisma__ = prisma;
    }
  }
  return prisma;
}
