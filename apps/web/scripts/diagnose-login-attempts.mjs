/**
 * Diagnostic script to inspect recent login_attempts for the IMC pilot doctor.
 * Does not write changes.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const PILOT_DOCTOR_EMAIL = "dr.ahmed@wathiqcare.med.sa";

function requireDatabaseUrl() {
  const value =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (!value) {
    throw new Error("No database URL found.");
  }
}

async function main() {
  requireDatabaseUrl();
  const prisma = new PrismaClient();

  try {
    const recent = await prisma.$queryRaw`
      SELECT email, ip_address, success, reason, created_at
      FROM login_attempts
      ORDER BY created_at DESC
      LIMIT 30
    `;

    console.log("[login-diag] Recent login_attempts (last 30):");
    for (const r of recent) {
      const ip = r.ip_address ? String(r.ip_address).slice(0, 20) : null;
      const createdAt = r.created_at ? new Date(r.created_at).toISOString() : null;
      console.log(
        `  email=${r.email} ip=${ip} success=${r.success} reason=${r.reason} at=${createdAt}`,
      );
    }

    const emailCount = await prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM login_attempts
      WHERE LOWER(email) = LOWER(${PILOT_DOCTOR_EMAIL})
        AND success = false
        AND created_at > NOW() - INTERVAL '15 minutes'
    `;
    console.log(
      `[login-diag] Failed attempts for ${PILOT_DOCTOR_EMAIL} in last 15 min: ${Number(emailCount[0]?.count ?? 0)}`,
    );

    const ipCounts = await prisma.$queryRaw`
      SELECT ip_address, COUNT(*) AS count
      FROM login_attempts
      WHERE success = false
        AND created_at > NOW() - INTERVAL '15 minutes'
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 10
    `;
    console.log("[login-diag] Failed attempts by IP in last 15 min:");
    for (const r of ipCounts) {
      const ip = r.ip_address ? String(r.ip_address).slice(0, 20) : "unknown";
      console.log(`  ip=${ip} count=${Number(r.count)}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[login-diag] FATAL:", err.message);
  process.exit(1);
});
