/**
 * seed-pilot-users.mjs
 * Provisions production pilot accounts for the WathiqCare IMC pilot deployment.
 *
 * Pilot users and tenants:
 *   - pilot.admin@platform.wathiqcare.online  → platform_admin   (PLATFORM_ADMIN)
 *   - pilot.legal@imc-pilot.wathiqcare.online → legal_admin      (TENANT_ADMIN)
 *   - pilot.doctor@imc-pilot.wathiqcare.online → doctor          (TENANT_USER)
 *   - pilot.finance@imc-pilot.wathiqcare.online → finance_officer (TENANT_USER)
 *
 * Passwords are read from environment variables:
 *   PILOT_PLATFORM_ADMIN_PASSWORD
 *   PILOT_LEGAL_PASSWORD
 *   PILOT_DOCTOR_PASSWORD
 *   PILOT_FINANCE_PASSWORD
 *
 * Usage (dry-run — no DB writes):
 *   node scripts/seed-pilot-users.mjs
 *
 * Usage (apply — writes to production DB):
 *   node scripts/seed-pilot-users.mjs --apply
 *   npm run pilot:seed:apply  (from apps/web directory)
 *
 * Rules:
 *   - Passwords are NEVER logged. Only bcrypt hash presence is confirmed.
 *   - Script is idempotent: safe to re-run; existing rows are upserted.
 *   - No plaintext passwords are stored in the database.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// ─── Env loading ────────────────────────────────────────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
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

// ─── Config ─────────────────────────────────────────────────────────────────

const APPLY = process.argv.includes("--apply");
const BCRYPT_ROUNDS = 12;

const PILOT_PLATFORM_TENANT = {
  code: "wathiqcare-pilot-platform",
  domain: "platform.wathiqcare.online",
  name: "WathiqCare Pilot Platform",
};

const PILOT_IMC_TENANT = {
  code: "imc-pilot",
  domain: "imc-pilot.wathiqcare.online",
  name: "IMC Pilot Tenant",
};

// Map app roles to MembershipRole enum values (must match Prisma schema)
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

// ─── Password env var resolution ────────────────────────────────────────────

function resolvePilotUsers() {
  const vars = {
    PILOT_PLATFORM_ADMIN_PASSWORD: process.env.PILOT_PLATFORM_ADMIN_PASSWORD,
    PILOT_LEGAL_PASSWORD: process.env.PILOT_LEGAL_PASSWORD,
    PILOT_DOCTOR_PASSWORD: process.env.PILOT_DOCTOR_PASSWORD,
    PILOT_FINANCE_PASSWORD: process.env.PILOT_FINANCE_PASSWORD,
  };

  const missing = Object.entries(vars)
    .filter(([, v]) => !v || v.trim() === "")
    .map(([k]) => k);

  if (missing.length > 0) {
    console.error(`\n[pilot-seed] ✗ Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}`);
    console.error("\n[pilot-seed] Set these in Vercel (Production / Preview / Development) or in your local .env before running.");
    process.exit(1);
  }

  return [
    {
      email: "pilot.admin@platform.wathiqcare.online",
      fullName: "Pilot Platform Admin",
      password: vars.PILOT_PLATFORM_ADMIN_PASSWORD,
      label: "Platform Admin",
      role: "platform_admin",
      userType: "PLATFORM_ADMIN",
      tenantDef: PILOT_PLATFORM_TENANT,
    },
    {
      email: "pilot.legal@imc-pilot.wathiqcare.online",
      fullName: "Pilot Legal Affairs",
      password: vars.PILOT_LEGAL_PASSWORD,
      label: "Legal Affairs",
      role: "legal_admin",
      userType: "TENANT_ADMIN",
      tenantDef: PILOT_IMC_TENANT,
    },
    {
      email: "pilot.doctor@imc-pilot.wathiqcare.online",
      fullName: "Pilot Doctor",
      password: vars.PILOT_DOCTOR_PASSWORD,
      label: "Doctor",
      role: "doctor",
      userType: "TENANT_USER",
      tenantDef: PILOT_IMC_TENANT,
    },
    {
      email: "pilot.finance@imc-pilot.wathiqcare.online",
      fullName: "Pilot Finance Officer",
      password: vars.PILOT_FINANCE_PASSWORD,
      label: "Finance Officer",
      role: "finance_officer",
      userType: "TENANT_USER",
      tenantDef: PILOT_IMC_TENANT,
    },
  ];
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

async function ensurePasswordResetSchema(prisma) {
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
  const membershipRole = toMembershipRole(userDef.role);

  const existing = await prisma.user.findUnique({
    where: { email: userDef.email },
    select: { id: true, email: true },
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
          session_revoked_at      = NULL
      WHERE id = ${existing.id}
    `;
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: existing.id } },
      update: { role: membershipRole, status: "ACTIVE" },
      create: { tenantId, userId: existing.id, role: membershipRole, status: "ACTIVE" },
    });
    console.log(`  ✓ Updated pilot account: ${userDef.email} (${userDef.label}) — hash confirmed, membership ACTIVE`);
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
      failedLoginAttempts: 0,
    },
  });
  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at      = NULL
    WHERE id = ${userId}
  `;
  await prisma.tenantMembership.create({
    data: {
      tenantId,
      userId,
      role: membershipRole,
      status: "ACTIVE",
    },
  }).catch((err) => {
    // Membership creation failure is a blocking error in apply mode:
    // without an active membership the user cannot log in.
    throw new Error(`Failed to create membership for ${userDef.email}: ${err.message}`);
  });

  console.log(`  ✓ Created pilot account: ${userDef.email} (${userDef.label}) — hash confirmed, membership ACTIVE`);
  return userId;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const pilotUsers = resolvePilotUsers();

  if (!APPLY) {
    console.log("[pilot-seed] DRY-RUN mode — no changes will be written to the database.");
    console.log("[pilot-seed] Re-run with --apply to execute.\n");
    console.log("[pilot-seed] Would provision the following pilot accounts:");
    for (const u of pilotUsers) {
      console.log(`  - ${u.email} (${u.label}) → role: ${u.role}, tenant: ${u.tenantDef.code}`);
    }
    console.log("\n[pilot-seed] Required env vars: all present ✓");
    return;
  }

  const prisma = new PrismaClient();

  try {
    console.log("[pilot-seed] Provisioning production pilot accounts...\n");

    await ensurePasswordResetSchema(prisma);

    // Ensure tenants exist
    const platformTenantId = await ensureTenant(prisma, PILOT_PLATFORM_TENANT);
    const imcTenantId = await ensureTenant(prisma, PILOT_IMC_TENANT);

    const tenantMap = {
      [PILOT_PLATFORM_TENANT.code]: platformTenantId,
      [PILOT_IMC_TENANT.code]: imcTenantId,
    };

    for (const userDef of pilotUsers) {
      const tenantId = tenantMap[userDef.tenantDef.code];
      await seedUser(prisma, userDef, tenantId);
    }

    console.log("\n[pilot-seed] ✓ All pilot accounts provisioned successfully.");
    console.log("[pilot-seed] Pilot user summary:");
    for (const u of pilotUsers) {
      console.log(`  - ${u.email} (${u.label})`);
    }
    console.log("\n[pilot-seed] Verification checklist:");
    console.log("  ✓ DB connection successful");
    console.log("  ✓ Users created or updated");
    console.log("  ✓ bcrypt password hashes created (rounds=12)");
    console.log("  ✓ Tenant memberships ACTIVE");
    console.log("  ✓ RBAC roles attached");
    console.log("  ✓ No plaintext passwords stored");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[pilot-seed] Fatal error:", err.message ?? err);
  process.exit(1);
});
