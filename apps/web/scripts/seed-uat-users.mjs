/**
 * seed-uat-users.mjs
 *
 * Safely upserts ONLY the 5 required UAT pilot users under the pilot-imc tenant.
 *
 * Usage:
 *   npm run uat:seed -w apps/web
 *   # or from apps/web:
 *   node scripts/seed-uat-users.mjs
 *
 * Safe guarantees:
 *   - All writes are upserts (no deletes, no table truncation).
 *   - Only affects the 5 named pilot users and the pilot-imc tenant.
 *   - Existing data in other tenants/users is untouched.
 *   - Can be re-run at any time to repair a broken account without side-effects.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// ---------------------------------------------------------------------------
// Environment loading (mirrors seed-demo-users.mjs convention)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    console.error(`[seed-uat-users] ERROR: ${name} is required.`);
    process.exit(1);
  }
  return value;
}

const BCRYPT_ROUNDS = 12;

const PILOT_IMC_TENANT = {
  code: "pilot-imc",
  domain: "wathiqcare.med.sa",
  name: "WathiqCare IMC Pilot Tenant",
  /** All email domains accepted for this tenant */
  allowedDomains: ["wathiqcare.med.sa", "wathiqcare.online"],
};

const PILOT_PASSWORD = requireEnv("UAT_PILOT_PASSWORD");

/**
 * Unified password for IMC doctor / physician pilot accounts.
 * Can be overridden via IMC_DOCTOR_PILOT_PASSWORD env var; defaults to the
 * canonical pilot doctor password requested for the IMC Preview.
 */
const IMC_DOCTOR_PILOT_PASSWORD =
  process.env.IMC_DOCTOR_PILOT_PASSWORD?.trim() || "IMC@imc2026";

function getUserPassword(userDef) {
  return userDef.role === "doctor" ? IMC_DOCTOR_PILOT_PASSWORD : PILOT_PASSWORD;
}

/** The 5 required UAT accounts. Password is read from UAT_PILOT_PASSWORD. */
const UAT_USERS = [
  {
    email: "dr.ahmed@wathiqcare.med.sa",
    fullName: "Dr. Ahmed Pilot Physician",
    role: "doctor",
    userType: "TENANT_USER",
    label: "Pilot Physician",
  },
  {
    email: "medicaldirector@wathiqcare.med.sa",
    fullName: "Pilot Medical Director",
    role: "medical_director",
    userType: "TENANT_USER",
    label: "Medical Director",
  },
  {
    email: "nursingsupervisor@wathiqcare.med.sa",
    fullName: "Pilot Nursing Supervisor",
    role: "nursing",
    userType: "TENANT_USER",
    label: "Nursing Supervisor",
  },
  {
    email: "legalreviewer@wathiqcare.med.sa",
    fullName: "Pilot Legal Reviewer",
    role: "legal_admin",
    userType: "TENANT_USER",
    label: "Legal Reviewer",
  },
  {
    email: "compliance@wathiqcare.med.sa",
    fullName: "Pilot Compliance Reviewer",
    role: "compliance",
    userType: "TENANT_USER",
    label: "Compliance Reviewer",
  },
];

/** Maps app roles to TenantMembership role enum values (mirrors seed-demo-users.mjs). */
const ROLE_TO_MEMBERSHIP_ROLE = {
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

function toMembershipRole(appRole) {
  return ROLE_TO_MEMBERSHIP_ROLE[appRole] ?? "MEMBER";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const prisma = new PrismaClient();

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Ensure schema columns added by previous migrations are present (idempotent). */
async function ensurePasswordResetSchema() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`,
  );
}

/** Upsert a single allowed-domain record for the tenant. */
async function ensureAllowedDomain(tenantId, domain) {
  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId, domain } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId, domain, isActive: true },
  });
}

/** Upsert the pilot-imc tenant and its allowed email domains. Returns tenantId. */
async function ensurePilotTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { code: PILOT_IMC_TENANT.code },
    update: {
      name: PILOT_IMC_TENANT.name,
      domain: PILOT_IMC_TENANT.domain,
      billingEmail: `billing@${PILOT_IMC_TENANT.domain}`,
      isActive: true,
    },
    create: {
      id: crypto.randomUUID(),
      code: PILOT_IMC_TENANT.code,
      name: PILOT_IMC_TENANT.name,
      domain: PILOT_IMC_TENANT.domain,
      billingEmail: `billing@${PILOT_IMC_TENANT.domain}`,
      isActive: true,
    },
  });

  const domains = [...new Set([PILOT_IMC_TENANT.domain, ...PILOT_IMC_TENANT.allowedDomains])];
  for (const domain of domains) {
    await ensureAllowedDomain(tenant.id, domain.trim().toLowerCase());
  }

  console.log(`  ✓ Tenant ensured: ${PILOT_IMC_TENANT.code} (id: ${tenant.id})`);
  return tenant.id;
}

/**
 * Upsert one UAT user:
 *   - Creates user if not found, updates if found.
 *   - Sets hashedPassword using bcrypt (12 rounds) — same as production auth logic.
 *   - Ensures isActive=true, status="active", emailVerified=true.
 *   - Clears password_reset_required and session_revoked_at.
 *   - Upserts ACTIVE TenantMembership.
 */
async function seedUatUser(userDef, tenantId, hashedPassword) {
  const existing = await prisma.user.findUnique({
    where: { email: userDef.email },
    select: { id: true, email: true },
  });

  let userId;

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
    userId = existing.id;
    console.log(`  ✓ Updated UAT account: ${userDef.email} (${userDef.label})`);
  } else {
    userId = crypto.randomUUID();
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
    console.log(`  ✓ Created UAT account: ${userDef.email} (${userDef.label})`);
  }

  // Clear reset/session-revoke flags so login is not blocked.
  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
    WHERE id = ${userId}
  `;

  // Ensure active membership.
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role: toMembershipRole(userDef.role), status: "ACTIVE" },
    create: {
      tenantId,
      userId,
      role: toMembershipRole(userDef.role),
      status: "ACTIVE",
    },
  }).catch((err) => {
    console.warn(`  ⚠ Membership upsert failed for ${userDef.email}: ${err.message}`);
  });

  return userId;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("[uat-seed] Provisioning UAT pilot users...\n");

  await ensurePasswordResetSchema();

  const tenantId = await ensurePilotTenant();

  for (const userDef of UAT_USERS) {
    const password = getUserPassword(userDef);
    const hashedPassword = await hashPassword(password);

    // Verify that the hash is valid before writing to DB.
    const hashValid = await bcrypt.compare(password, hashedPassword);
    if (!hashValid) {
      throw new Error("Password hash self-check failed — aborting to avoid locking users out.");
    }

    await seedUatUser(userDef, tenantId, hashedPassword);
  }

  console.log("\n[uat-seed] UAT users provisioned successfully.");
  console.log("[uat-seed] Canonical login identifiers:");
  for (const u of UAT_USERS) {
    const passwordHint = u.role === "doctor" ? " (unified doctor password)" : "";
    console.log(`  - ${u.email}  (${u.label})${passwordHint}`);
  }
  console.log("[uat-seed] All accounts: isActive=true, status=active, emailVerified=true, password_reset_required=false");
}

main()
  .catch((err) => {
    console.error("[uat-seed] FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
