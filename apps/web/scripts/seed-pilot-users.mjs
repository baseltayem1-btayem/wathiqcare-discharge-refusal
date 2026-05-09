/**
 * seed-pilot-users.mjs
 *
 * Provisions production pilot accounts for the IMC pilot tenant.
 * Safe to re-run: all operations are idempotent upserts.
 * Does NOT create demo data — accounts only.
 *
 * Usage:
 *   cd apps/web
 *   npm run pilot:seed:apply
 *
 * Required env vars (set in Vercel or .env.local):
 *   DATABASE_URL or DATABASE_URL_POOLED — must NOT contain "&amp;" (HTML-encoded)
 *   JWT_SECRET_KEY                       — used by the custom JWT auth layer
 *
 * Optional env vars (override default pilot passwords):
 *   PILOT_PLATFORM_ADMIN_PASSWORD
 *   PILOT_LEGAL_PASSWORD
 *   PILOT_DOCTOR_PASSWORD
 *   PILOT_FINANCE_PASSWORD
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// ─── env loading ────────────────────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
  ? path.resolve(process.cwd(), "..", "..")
  : process.cwd();

loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));

// ─── pre-flight checks ───────────────────────────────────────────────────────

function checkEnvVars() {
  const issues = [];

  const dbUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!dbUrl) {
    issues.push("FATAL: Neither DATABASE_URL_POOLED nor DATABASE_URL is set.");
  } else if (dbUrl.includes("&amp;")) {
    issues.push(
      "FATAL: DATABASE_URL contains HTML-encoded '&amp;' — this will break the database connection.\n" +
        "       Fix: replace '&amp;' with '&' in your Vercel environment variable.\n" +
        `       Affected variable: ${process.env.DATABASE_URL_POOLED ? "DATABASE_URL_POOLED" : "DATABASE_URL"}`,
    );
  }

  if (!process.env.JWT_SECRET_KEY || process.env.JWT_SECRET_KEY === "change-me") {
    issues.push(
      "FATAL: JWT_SECRET_KEY is not set or is still the placeholder value.\n" +
        "       This system uses a custom JWT layer — NOT NextAuth.\n" +
        "       Set JWT_SECRET_KEY in Vercel (not NEXTAUTH_SECRET or AUTH_SECRET).",
    );
  }

  // Informational: warn if NextAuth-style vars are present but unused
  if (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET) {
    console.warn(
      "[pilot-seed] WARNING: NEXTAUTH_SECRET / AUTH_SECRET detected in environment.\n" +
        "             This platform uses a custom JWT layer (JWT_SECRET_KEY), not NextAuth.\n" +
        "             Those variables have no effect here.",
    );
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`[pilot-seed] ${issue}`);
    }
    process.exit(1);
  }

  console.log("[pilot-seed] ✅ Pre-flight env checks passed.");
  console.log(
    `[pilot-seed]    DB URL source: ${process.env.DATABASE_URL_POOLED ? "DATABASE_URL_POOLED" : "DATABASE_URL"}`,
  );
}

// ─── constants ───────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const DB_PROBE_TIMEOUT_MS = 8000;
const MIN_PILOT_PASSWORD_LENGTH = 12;

const IMC_PILOT_TENANT = {
  code: "imc-pilot",
  domain: "imc-pilot.wathiqcare.online",
  name: "IMC Pilot — Islamic Medical Center",
};

const PLATFORM_TENANT = {
  code: "wathiqcare-platform",
  domain: "platform.wathiqcare.online",
  name: "WathiqCare Platform",
};

function getPilotPassword(envKey, fallback) {
  const value = process.env[envKey]?.trim();
  if (value && value.length >= MIN_PILOT_PASSWORD_LENGTH) return value;
  return fallback;
}

function buildPilotUsers() {
  return [
    {
      email: "pilot.admin@platform.wathiqcare.online",
      fullName: "Pilot Platform Admin",
      password: getPilotPassword("PILOT_PLATFORM_ADMIN_PASSWORD", "PilotAdmin@2026!"),
      label: "Platform Admin",
      role: "platform_admin",
      userType: "PLATFORM_ADMIN",
      tenantCode: PLATFORM_TENANT.code,
    },
    {
      email: "pilot.legal@imc-pilot.wathiqcare.online",
      fullName: "Pilot Legal Affairs",
      password: getPilotPassword("PILOT_LEGAL_PASSWORD", "PilotLegal@2026!"),
      label: "Legal Affairs",
      role: "legal_admin",
      userType: "TENANT_ADMIN",
      tenantCode: IMC_PILOT_TENANT.code,
    },
    {
      email: "pilot.doctor@imc-pilot.wathiqcare.online",
      fullName: "Pilot Doctor",
      password: getPilotPassword("PILOT_DOCTOR_PASSWORD", "PilotDoctor@2026!"),
      label: "Doctor",
      role: "doctor",
      userType: "TENANT_USER",
      tenantCode: IMC_PILOT_TENANT.code,
    },
    {
      email: "pilot.finance@imc-pilot.wathiqcare.online",
      fullName: "Pilot Finance Officer",
      password: getPilotPassword("PILOT_FINANCE_PASSWORD", "PilotFinance@2026!"),
      label: "Finance Officer",
      role: "finance_officer",
      userType: "TENANT_USER",
      tenantCode: IMC_PILOT_TENANT.code,
    },
  ];
}

// ─── membership role mapping ─────────────────────────────────────────────────

function toMembershipRole(appRole) {
  const map = {
    platform_admin: "OWNER",
    tenant_admin: "ADMIN",
    tenant_owner: "OWNER",
    doctor: "MEMBER",
    nursing: "MEMBER",
    legal_admin: "ADMIN",
    medical_director: "MANAGER",
    finance_officer: "ADMIN",
    compliance: "VIEWER",
  };
  return map[appRole] ?? "MEMBER";
}

// ─── schema helpers ──────────────────────────────────────────────────────────

async function ensurePasswordResetColumns(prisma) {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`,
  );
}

async function ensureAllowedDomain(prisma, tenantId, domain) {
  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId, domain } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId, domain, isActive: true },
  });
}

async function ensureTenant(prisma, tenantDef) {
  const tenant = await prisma.tenant.upsert({
    where: { code: tenantDef.code },
    update: {
      name: tenantDef.name,
      domain: tenantDef.domain,
      billingEmail: `billing@${tenantDef.domain}`,
      isActive: true,
    },
    create: {
      id: crypto.randomUUID(),
      code: tenantDef.code,
      name: tenantDef.name,
      domain: tenantDef.domain,
      billingEmail: `billing@${tenantDef.domain}`,
      isActive: true,
    },
  });
  await ensureAllowedDomain(prisma, tenant.id, tenantDef.domain);
  return tenant.id;
}

async function seedUser(prisma, userDef, tenantId) {
  const hashedPassword = await bcrypt.hash(userDef.password, BCRYPT_ROUNDS);

  const existing = await prisma.user.findUnique({
    where: { email: userDef.email },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        tenantId,
        fullName: userDef.fullName,
        role: userDef.role,
        userType: userDef.userType,
        status: "active",
        isActive: true,
        emailVerified: true,
        hashedPassword,
        authProvider: "local_password",
        lastPasswordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = FALSE,
          session_revoked_at = NULL
      WHERE id = ${existing.id}
    `;
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: existing.id } },
      update: { role: toMembershipRole(userDef.role), status: "ACTIVE" },
      create: {
        tenantId,
        userId: existing.id,
        role: toMembershipRole(userDef.role),
        status: "ACTIVE",
      },
    });
    console.log(`  ✓ Updated pilot account: ${userDef.email} (${userDef.label})`);
    return existing.id;
  }

  const userId = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      tenantId,
      email: userDef.email,
      fullName: userDef.fullName,
      role: userDef.role,
      userType: userDef.userType,
      isActive: true,
      emailVerified: true,
      hashedPassword,
      authProvider: "local_password",
      lastPasswordChangedAt: new Date(),
    },
  });
  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
    WHERE id = ${userId}
  `;
  await prisma.tenantMembership
    .create({
      data: {
        tenantId,
        userId,
        role: toMembershipRole(userDef.role),
        status: "ACTIVE",
      },
    })
    .catch((err) => {
      console.warn(`  ⚠ Membership skipped for ${userDef.email}: ${err.message}`);
    });

  console.log(`  ✓ Created pilot account: ${userDef.email} (${userDef.label})`);
  return userId;
}

// ─── DB connectivity check ───────────────────────────────────────────────────

async function probeDbConnection(prisma) {
  const start = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1 AS ok`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`DB probe timed out after ${DB_PROBE_TIMEOUT_MS}ms`)), DB_PROBE_TIMEOUT_MS),
      ),
    ]);
    console.log(`[pilot-seed] ✅ DB connection OK (${Date.now() - start}ms)`);
  } catch (err) {
    console.error(`[pilot-seed] ✗ DB connection FAILED: ${err.message}`);
    process.exit(2);
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[pilot-seed] ━━━ WathiqCare Pilot Account Provisioning ━━━\n");

  checkEnvVars();

  const prisma = new PrismaClient();

  await probeDbConnection(prisma);

  console.log("\n[pilot-seed] Ensuring schema columns...");
  await ensurePasswordResetColumns(prisma);

  console.log("[pilot-seed] Ensuring tenants...");
  const platformTenantId = await ensureTenant(prisma, PLATFORM_TENANT);
  const imcPilotTenantId = await ensureTenant(prisma, IMC_PILOT_TENANT);
  console.log(`  ✓ Platform tenant: ${PLATFORM_TENANT.code} (${platformTenantId})`);
  console.log(`  ✓ IMC Pilot tenant: ${IMC_PILOT_TENANT.code} (${imcPilotTenantId})`);

  console.log("\n[pilot-seed] Seeding pilot accounts...");
  const PILOT_USERS = buildPilotUsers();

  for (const userDef of PILOT_USERS) {
    const tenantId =
      userDef.tenantCode === IMC_PILOT_TENANT.code ? imcPilotTenantId : platformTenantId;
    await seedUser(prisma, userDef, tenantId);
  }

  console.log("\n[pilot-seed] ━━━ Pilot Provisioning Complete ━━━");
  console.log("[pilot-seed] Accounts ready for login validation:\n");

  const ROLE_ENV_MAP = {
    platform_admin: "PILOT_PLATFORM_ADMIN_PASSWORD",
    legal_admin: "PILOT_LEGAL_PASSWORD",
    doctor: "PILOT_DOCTOR_PASSWORD",
    finance_officer: "PILOT_FINANCE_PASSWORD",
  };
  const labelWidth = Math.max(...PILOT_USERS.map((u) => u.label.length), 4) + 1;
  const emailWidth = Math.max(...PILOT_USERS.map((u) => u.email.length), 5) + 1;

  const header = `  │  ${"Role".padEnd(labelWidth)} │ ${"Email".padEnd(emailWidth)} │ Password       │`;
  const divider = `  ${"─".repeat(header.length - 2)}`;
  console.log(divider);
  console.log(header);
  console.log(divider);
  for (const u of PILOT_USERS) {
    const pw = process.env[ROLE_ENV_MAP[u.role]] ? "(env override)" : u.password;
    console.log(`  │  ${u.label.padEnd(labelWidth)} │ ${u.email.padEnd(emailWidth)} │ ${pw.padEnd(14)} │`);
  }
  console.log(divider);
  console.log("\n[pilot-seed] Next: validate login at https://wathiqcare.online/ar");
  console.log("[pilot-seed] Expected post-login redirect: /modules");
  console.log("[pilot-seed] Done.\n");
  await prisma.$disconnect().catch(() => undefined);
}

main().catch((err) => {
  console.error("[pilot-seed] FATAL:", err);
  process.exit(1);
});
