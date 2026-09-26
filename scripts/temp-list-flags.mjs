import dotenv from "dotenv";
dotenv.config({ path: "apps/web/.env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.featureFlagOverride.findMany({ take: 10 });
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
