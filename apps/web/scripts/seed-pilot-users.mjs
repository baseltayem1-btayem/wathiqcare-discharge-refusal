/**
 * seed-pilot-users.mjs
 * Provisions controlled production pilot accounts for IMC-JEDDAH (International Medical Center).
 *
 * Tenant:     IMC-JEDDAH
 * Env tag:    PILOT_PRODUCTION_IMC
 * Domain:     imc.wathiqcare.online
 *
 * Security:
 *   - All pilot users are provisioned with password_reset_required = TRUE.
 *   - Passwords are bcrypt-hashed at 12 rounds. No plaintext is stored.
 *   - No demo/fake patient data is created.
 *   - Audit logging is preserved (session_revoked_at is not set on provision).
 *
 * Usage (from apps/web):
 *   npm run pilot:seed
 *
 * Run with --apply to execute. Without --apply the script performs a dry-run and
 * prints what would be provisioned.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const path = require("node:path");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

// ---------------------------------------------------------------------------
// Environment loading
// ---------------------------------------------------------------------------
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
    if (typeof process.env[key] === "undefined") process.env[key] = value;
  }
}

const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
  ? path.resolve(process.cwd(), "..", "..")
  : process.cwd();
loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));

const IS_APPLY = process.argv.includes("--apply");

if (!IS_APPLY) {
  console.log(
    "[pilot-seed] DRY-RUN mode — pass --apply to execute. No database writes will occur.\n",
  );
}

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Tenant definition
// ---------------------------------------------------------------------------
const PILOT_TENANT = {
  code: "IMC-JEDDAH",
  name: "International Medical Center — Jeddah (Pilot)",
  domain: "imc.wathiqcare.online",
  environmentTag: "PILOT_PRODUCTION_IMC",
};

// ---------------------------------------------------------------------------
// Pilot user definitions
// ---------------------------------------------------------------------------

/**
 * Canonical roles are stored in the `role` column. The application resolves
 * aliases at runtime via canonicalizeUserRole() in roles.ts.
 * Adding aliases: legal_director → legal_admin, quality_compliance → compliance,
 * finance_admin → finance_officer, executive_viewer → viewer.
 */
const PILOT_USERS = [
  {
    displayName: "WathiqCare Platform Admin",
    username: "platform.admin",
    email: "platform.admin@imc.wathiqcare.online",
    temporaryPassword: "WathiqCare@Admin2026!",
    role: "platform_superadmin",
    userType: "PLATFORM_ADMIN",
    allowedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    displayName: "Basel Tayem",
    username: "legal.director",
    email: "legal.director@imc.wathiqcare.online",
    temporaryPassword: "Legal@Wathiq2026!",
    role: "legal_director",
    userType: "TENANT_ADMIN",
    allowedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    displayName: "Legal Officer 01",
    username: "legal.officer01",
    email: "legal.officer01@imc.wathiqcare.online",
    temporaryPassword: "LegalOfficer@2026!",
    role: "legal_officer",
    userType: "TENANT_ADMIN",
    allowedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    displayName: "Medical Director IMC",
    username: "medical.director",
    email: "medical.director@imc.wathiqcare.online",
    temporaryPassword: "MedicalDirector@2026!",
    role: "medical_director",
    userType: "TENANT_USER",
    allowedModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    displayName: "Dr. Ahmed Pilot",
    username: "doctor.ahmed",
    email: "doctor.ahmed@imc.wathiqcare.online",
    temporaryPassword: "DoctorAhmed@2026!",
    role: "doctor",
    userType: "TENANT_USER",
    allowedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    displayName: "Dr. Sara Pilot",
    username: "doctor.sara",
    email: "doctor.sara@imc.wathiqcare.online",
    temporaryPassword: "DoctorSara@2026!",
    role: "doctor",
    userType: "TENANT_USER",
    allowedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    displayName: "Nurse Fatimah",
    username: "nurse.fatimah",
    email: "nurse.fatimah@imc.wathiqcare.online",
    temporaryPassword: "NurseFatimah@2026!",
    role: "nurse",
    userType: "TENANT_USER",
    allowedModules: ["informed-consents", "discharge-refusal"],
  },
  {
    displayName: "Quality Compliance Officer",
    username: "quality.compliance",
    email: "quality.compliance@imc.wathiqcare.online",
    temporaryPassword: "QualityCompliance@2026!",
    role: "quality_compliance",
    userType: "TENANT_USER",
    allowedModules: ["informed-consents", "promissory-notes", "discharge-refusal", "audit-review"],
  },
  {
    displayName: "Finance Admin",
    username: "finance.admin",
    email: "finance.admin@imc.wathiqcare.online",
    temporaryPassword: "FinanceAdmin@2026!",
    role: "finance_admin",
    userType: "TENANT_USER",
    allowedModules: ["promissory-notes"],
  },
  {
    displayName: "Executive Viewer",
    username: "executive.viewer",
    email: "executive.viewer@imc.wathiqcare.online",
    temporaryPassword: "ExecutiveViewer@2026!",
    role: "executive_viewer",
    userType: "TENANT_USER",
    allowedModules: ["read-only dashboard", "executive analytics"],
  },
];

// ---------------------------------------------------------------------------
// Role → MembershipRole mapping
// ---------------------------------------------------------------------------
function toMembershipRole(role) {
  const map = {
    platform_superadmin: "OWNER",
    platform_admin: "ADMIN",
    legal_director: "ADMIN",
    legal_officer: "ADMIN",
    legal_admin: "ADMIN",
    tenant_owner: "OWNER",
    tenant_admin: "ADMIN",
    medical_director: "OWNER",
    doctor: "MANAGER",
    nurse: "MEMBER",
    nursing: "MEMBER",
    quality_compliance: "VIEWER",
    compliance: "VIEWER",
    finance_admin: "ADMIN",
    finance_officer: "ADMIN",
    executive_viewer: "VIEWER",
    viewer: "VIEWER",
  };
  return map[role] ?? "MEMBER";
}

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------
async function ensurePasswordResetColumns() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`,
  );
}

async function ensureAllowedDomain(tenantId, domain) {
  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId, domain } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId, domain, isActive: true },
  });
}

async function ensurePilotTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { code: PILOT_TENANT.code },
    update: {
      name: PILOT_TENANT.name,
      domain: PILOT_TENANT.domain,
      billingEmail: `billing@${PILOT_TENANT.domain}`,
      isActive: true,
      metadata: {
        environmentTag: PILOT_TENANT.environmentTag,
        pilotProvisionedAt: new Date().toISOString(),
      },
    },
    create: {
      id: crypto.randomUUID(),
      code: PILOT_TENANT.code,
      name: PILOT_TENANT.name,
      domain: PILOT_TENANT.domain,
      billingEmail: `billing@${PILOT_TENANT.domain}`,
      isActive: true,
      metadata: {
        environmentTag: PILOT_TENANT.environmentTag,
        pilotProvisionedAt: new Date().toISOString(),
      },
    },
  });

  await ensureAllowedDomain(tenant.id, PILOT_TENANT.domain);
  console.log(`  ✓ Tenant ensured: ${PILOT_TENANT.code} (id=${tenant.id})`);
  return tenant.id;
}

// ---------------------------------------------------------------------------
// User provisioning
// ---------------------------------------------------------------------------
async function provisionPilotUser(userDef, tenantId) {
  console.log(
    `  → Provisioning: ${userDef.email} | role=${userDef.role} | displayName=${userDef.displayName}`,
  );

  const hashedPassword = await bcrypt.hash(userDef.temporaryPassword, BCRYPT_ROUNDS);
  const membershipRole = toMembershipRole(userDef.role);

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
        fullName: userDef.displayName,
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
    // Force password reset on first login, preserve audit trail
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = TRUE
      WHERE id = ${existing.id}
    `;
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: existing.id } },
      update: { role: membershipRole, status: "ACTIVE" },
      create: { tenantId, userId: existing.id, role: membershipRole, status: "ACTIVE" },
    });
    console.log(`    ✓ Updated pilot account: ${userDef.email}`);
    userId = existing.id;
  } else {
    userId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        tenantId,
        email: userDef.email,
        fullName: userDef.displayName,
        role: userDef.role,
        userType: userDef.userType,
        status: "active",
        isActive: true,
        emailVerified: true,
        hashedPassword,
        authProvider: "local_password",
        lastPasswordChangedAt: new Date(),
      },
    });
    // Force password reset on first login
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = TRUE
      WHERE id = ${userId}
    `;
    await prisma.tenantMembership
      .create({
        data: {
          tenantId,
          userId,
          role: membershipRole,
          status: "ACTIVE",
        },
      })
      .catch((err) => {
        console.warn(`    ⚠ Membership skipped for ${userDef.email}: ${err.message}`);
      });
    console.log(`    ✓ Created pilot account: ${userDef.email}`);
  }

  return userId;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(
    `[pilot-seed] IMC Pilot Account Provisioning — Tenant: ${PILOT_TENANT.code}\n`,
  );
  console.log(`[pilot-seed] Environment tag: ${PILOT_TENANT.environmentTag}`);
  console.log(`[pilot-seed] Domain:          ${PILOT_TENANT.domain}`);
  console.log(`[pilot-seed] Users to provision: ${PILOT_USERS.length}\n`);

  if (!IS_APPLY) {
    console.log("[pilot-seed] === DRY-RUN PREVIEW ===\n");
    for (const u of PILOT_USERS) {
      console.log(
        `  • ${u.displayName} <${u.email}>  role=${u.role}  type=${u.userType}`,
      );
      console.log(`    modules: ${u.allowedModules.join(", ")}`);
    }
    console.log(
      "\n[pilot-seed] Run with --apply to execute provisioning against the database.",
    );
    return;
  }

  await ensurePasswordResetColumns();

  const tenantId = await ensurePilotTenant();

  console.log("\n[pilot-seed] Provisioning pilot users...\n");
  for (const userDef of PILOT_USERS) {
    await provisionPilotUser(userDef, tenantId);
  }

  console.log("\n[pilot-seed] ─────────────────────────────────────────────");
  console.log("[pilot-seed] PILOT ACCOUNTS PROVISIONED SUCCESSFULLY");
  console.log("[pilot-seed] ─────────────────────────────────────────────");
  console.log("\nCanonical login identifiers:");
  for (const u of PILOT_USERS) {
    console.log(`  ${u.email}  (${u.displayName} / ${u.role})`);
  }
  console.log("\nSecurity notes:");
  console.log("  • All pilot accounts are set to require password reset on first login.");
  console.log("  • Passwords are bcrypt-hashed (rounds=12). No plaintext is stored.");
  console.log("  • No fake patient data has been created.");
  console.log("  • Audit logging columns are preserved.");
  console.log(
    "\n  Deliver passwords through internal authorized channel only.",
  );
}

main()
  .catch((err) => {
    console.error("[pilot-seed] Provisioning failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
