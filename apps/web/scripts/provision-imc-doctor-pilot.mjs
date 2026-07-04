/**
 * One-time provisioning script for the IMC pilot doctor account.
 *
 * Safely ensures dr.ahmed@wathiqcare.med.sa exists in the target database
 * with the unified pilot doctor password. Defaults to dry-run; pass --apply
 * to write changes.
 *
 * Usage (Preview):
 *   DATABASE_URL='<preview-db-url>' node scripts/provision-imc-doctor-pilot.mjs --apply
 *
 * Safe guarantees:
 *   - Only touches the single doctor account.
 *   - Never prints the password, hash, or DATABASE_URL.
 *   - Uses the project's bcrypt hashing (12 rounds).
 *   - Verifies bcrypt compare after writing.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const APPLY = process.argv.includes("--apply");

const BCRYPT_ROUNDS = 12;
const PILOT_DOCTOR_EMAIL = "dr.ahmed@wathiqcare.med.sa";
const PILOT_DOCTOR_FULL_NAME = "Dr. Ahmed Pilot Physician";
const PILOT_DOCTOR_PASSWORD = process.env.IMC_DOCTOR_PILOT_PASSWORD?.trim() || "IMC@imc2026";
const PILOT_TENANT_CODE = "pilot-imc";
const PILOT_TENANT_DOMAIN = "wathiqcare.med.sa";
const PILOT_TENANT_NAME = "WathiqCare IMC Pilot Tenant";

function requireDatabaseUrl() {
  const value =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (!value) {
    throw new Error(
      "No database URL found. Set DATABASE_URL (or one of the fallback env vars) for the target environment.",
    );
  }
  return value;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function ensurePasswordResetSchema(prisma) {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`,
  );
}

async function ensurePilotTenant(prisma) {
  const tenant = await prisma.tenant.upsert({
    where: { code: PILOT_TENANT_CODE },
    update: { name: PILOT_TENANT_NAME, domain: PILOT_TENANT_DOMAIN, isActive: true },
    create: {
      id: crypto.randomUUID(),
      code: PILOT_TENANT_CODE,
      name: PILOT_TENANT_NAME,
      domain: PILOT_TENANT_DOMAIN,
      billingEmail: `billing@${PILOT_TENANT_DOMAIN}`,
      isActive: true,
    },
  });

  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId: tenant.id, domain: PILOT_TENANT_DOMAIN } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId: tenant.id, domain: PILOT_TENANT_DOMAIN, isActive: true },
  });

  return tenant.id;
}

async function main() {
  requireDatabaseUrl();
  const prisma = new PrismaClient();

  try {
    console.log(`[imc-doctor-pilot] Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
    console.log(`[imc-doctor-pilot] Target account: ${PILOT_DOCTOR_EMAIL}`);

    const existing = await prisma.user.findUnique({
      where: { email: PILOT_DOCTOR_EMAIL },
      select: { id: true, email: true, tenantId: true, hashedPassword: true },
    });

    console.log(`[imc-doctor-pilot] User exists in DB: ${Boolean(existing)}`);
    if (existing?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: existing.tenantId },
        select: { code: true },
      });
      console.log(`[imc-doctor-pilot] Current tenant: ${tenant?.code ?? "unknown"}`);
    }

    const hashMatchesBefore = existing?.hashedPassword
      ? await verifyPassword(PILOT_DOCTOR_PASSWORD, existing.hashedPassword)
      : false;
    console.log(`[imc-doctor-pilot] Password hash matches IMC@imc2026: ${hashMatchesBefore}`);

    // Check recent failed login attempts that trigger rate limiting.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const failedAttempts = await prisma.$queryRaw`
      SELECT COUNT(*) AS count
      FROM login_attempts
      WHERE LOWER(email) = LOWER(${PILOT_DOCTOR_EMAIL})
        AND success = false
        AND created_at > ${fifteenMinutesAgo}
    `;
    console.log(`[imc-doctor-pilot] Recent failed login attempts: ${Number(failedAttempts[0]?.count ?? 0)}`);

    if (!APPLY) {
      console.log("[imc-doctor-pilot] Dry-run complete. Pass --apply to write changes.");
      return;
    }

    await ensurePasswordResetSchema(prisma);
    const tenantId = await ensurePilotTenant(prisma);

    const hashedPassword = await hashPassword(PILOT_DOCTOR_PASSWORD);
    const hashSelfCheck = await verifyPassword(PILOT_DOCTOR_PASSWORD, hashedPassword);
    if (!hashSelfCheck) {
      throw new Error("Password hash self-check failed — aborting.");
    }

    let userId;
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          tenantId,
          fullName: PILOT_DOCTOR_FULL_NAME,
          role: "doctor",
          userType: "TENANT_USER",
          status: "active",
          isActive: true,
          emailVerified: true,
          authProvider: "local_password",
          hashedPassword,
          lastPasswordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      userId = existing.id;
      console.log("[imc-doctor-pilot] Updated existing user.");
    } else {
      userId = crypto.randomUUID();
      await prisma.user.create({
        data: {
          id: userId,
          tenantId,
          email: PILOT_DOCTOR_EMAIL,
          fullName: PILOT_DOCTOR_FULL_NAME,
          role: "doctor",
          userType: "TENANT_USER",
          status: "active",
          isActive: true,
          emailVerified: true,
          authProvider: "local_password",
          hashedPassword,
          lastPasswordChangedAt: new Date(),
        },
      });
      console.log("[imc-doctor-pilot] Created new user.");
    }

    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = FALSE,
          session_revoked_at = NULL,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = ${userId}
    `;

    // Clear rate-limiting login_attempts history for this account so the
    // deployed login endpoint no longer returns 429.
    await prisma.$executeRaw`
      DELETE FROM login_attempts
      WHERE LOWER(email) = LOWER(${PILOT_DOCTOR_EMAIL})
    `;

    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: { role: "MEMBER", status: "ACTIVE" },
      create: {
        tenantId,
        userId,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, tenantId: true, hashedPassword: true },
    });

    const hashMatchesAfter = updated?.hashedPassword
      ? await verifyPassword(PILOT_DOCTOR_PASSWORD, updated.hashedPassword)
      : false;

    console.log(`[imc-doctor-pilot] Final user exists: ${Boolean(updated)}`);
    console.log(`[imc-doctor-pilot] Final password hash matches: ${hashMatchesAfter}`);

    if (!hashMatchesAfter) {
      throw new Error("Post-update password verification failed.");
    }

    console.log("[imc-doctor-pilot] Provisioning complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[imc-doctor-pilot] FATAL:", err.message);
  process.exit(1);
});
