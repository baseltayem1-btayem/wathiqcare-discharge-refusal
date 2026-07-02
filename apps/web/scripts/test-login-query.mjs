import { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "../src/lib/server/auth-domain-policy.js";
import { verifyPassword } from "../src/lib/server/password.js";

const email = "dr.ahmed@wathiqcare.med.sa";
const password = "IMC@imc2026";

async function main() {
  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  const normalizedEmail = normalizeEmail(email);
  console.log("DATABASE_URL host:", new URL(process.env.DATABASE_URL).host);
  console.log("normalizedEmail:", normalizedEmail);
  
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      hashedPassword: true,
      isActive: true,
      lockedUntil: true,
      tenantId: true,
      role: true,
      primaryTenant: { select: { isActive: true } },
      memberships: { where: { status: "ACTIVE" }, select: { status: true } },
    },
  });
  
  console.log("user found:", !!user);
  if (user) {
    console.log("user.email:", user.email);
    console.log("isActive:", user.isActive);
    console.log("tenantIsActive:", user.primaryTenant?.isActive);
    console.log("membershipStatus:", user.memberships?.[0]?.status);
    console.log("hashedPassword present:", !!user.hashedPassword);
    const valid = await verifyPassword(password, user.hashedPassword);
    console.log("password valid:", valid);
  }
  
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
