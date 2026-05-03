/**
 * seed-demo-users.mjs
 * Seeds WathiqCare demo accounts for testing and onboarding.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node apps/web/scripts/seed-demo-users.mjs
 *
 * Demo credentials:
 *   superadmin          / Admin@12345   → platform_superadmin
 *   imc.admin           / Welcome@123   → tenant_admin (IMC)
 *   imc.jeddah.doctor1  / Doctor@123    → doctor (IMC Jeddah)
 *   imc.jeddah.nurse1   / Nurse@123     → nursing (IMC Jeddah)
 *   imc.legal           / Legal@123     → legal_admin (IMC)
 *   imc.medicaldirector / Medical@123   → medical_director (IMC)
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);

// Load bcryptjs for password hashing
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

const DEMO_USERS = [
  {
    username: "superadmin",
    email: "superadmin@wathiqcare.local",
    fullName: "WathiqCare Super Admin",
    password: "Admin@12345",
    role: "platform_superadmin",
    userType: "PLATFORM_ADMIN",
    tenantCode: null,
  },
  {
    username: "imc.admin",
    email: "imc.admin@imc.local",
    fullName: "IMC Hospital Admin",
    password: "Welcome@123",
    role: "tenant_admin",
    userType: "TENANT_ADMIN",
    tenantCode: "imc",
  },
  {
    username: "imc.jeddah.doctor1",
    email: "imc.jeddah.doctor1@imc.local",
    fullName: "Dr. Ahmed Al-Jeddah",
    password: "Doctor@123",
    role: "doctor",
    userType: "TENANT_USER",
    tenantCode: "imc",
  },
  {
    username: "imc.jeddah.nurse1",
    email: "imc.jeddah.nurse1@imc.local",
    fullName: "Nurse Sara Al-Jeddah",
    password: "Nurse@123",
    role: "nursing",
    userType: "TENANT_USER",
    tenantCode: "imc",
  },
  {
    username: "imc.legal",
    email: "imc.legal@imc.local",
    fullName: "IMC Legal Officer",
    password: "Legal@123",
    role: "legal_admin",
    userType: "TENANT_USER",
    tenantCode: "imc",
  },
  {
    username: "imc.medicaldirector",
    email: "imc.medicaldirector@imc.local",
    fullName: "IMC Medical Director",
    password: "Medical@123",
    role: "medical_director",
    userType: "TENANT_USER",
    tenantCode: "imc",
  },
];

async function ensureTenant(tenantCode) {
  if (!tenantCode) return null;

  const existing = await prisma.tenant.findFirst({
    where: { code: tenantCode },
    select: { id: true },
  });

  if (existing) {
    console.log(`  → Using existing tenant: ${tenantCode} (${existing.id})`);
    return existing.id;
  }

  const tenantId = crypto.randomUUID();
  await prisma.tenant.create({
    data: {
      id: tenantId,
      code: tenantCode,
      name: tenantCode.toUpperCase() + " Hospital",
      billingEmail: `billing@${tenantCode}.local`,
      isActive: true,
    },
  });

  console.log(`  → Created tenant: ${tenantCode} (${tenantId})`);
  return tenantId;
}

async function ensurePlatformTenant() {
  const existing = await prisma.tenant.findFirst({
    where: { code: "platform" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const tenantId = crypto.randomUUID();
  await prisma.tenant.create({
    data: {
      id: tenantId,
      code: "platform",
      name: "WathiqCare Platform",
      billingEmail: "platform@wathiqcare.local",
      isActive: true,
    },
  });
  console.log(`  → Created platform tenant (${tenantId})`);
  return tenantId;
}

// Map app roles to MembershipRole enum values
function toMembershipRole(appRole) {
  const map = {
    platform_superadmin: "OWNER",
    platform_admin: "OWNER",
    tenant_admin: "ADMIN",
    tenant_owner: "OWNER",
    doctor: "MEMBER",
    nursing: "MEMBER",
    legal_admin: "MEMBER",
    medical_director: "MANAGER",
    finance_officer: "MEMBER",
  };
  return map[appRole] ?? "MEMBER";
}

async function seedUser(userDef, tenantId) {
  const hashedPassword = await hashPassword(userDef.password);

  const existing = await prisma.user.findUnique({
    where: { email: userDef.email },
    select: { id: true, email: true },
  });

  if (existing) {
    // Update password and reset lastPasswordChangedAt so first-login triggers
    await prisma.$executeRaw`
      UPDATE users
      SET hashed_password = ${hashedPassword},
          is_active = true,
          auth_provider = 'local_password',
          last_password_changed_at = NULL
      WHERE id = ${existing.id}
    `;
    console.log(`  ✓ Updated: ${userDef.email} (${userDef.role})`);
    return;
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
    },
  });

  // Create active membership with correct enum value
  await prisma.tenantMembership.create({
    data: {
      tenantId,
      userId,
      role: toMembershipRole(userDef.role),
      status: "ACTIVE",
    },
  }).catch((err) => {
    console.warn(`  ⚠ Membership skipped for ${userDef.email}: ${err.message}`);
  });

  console.log(`  ✓ Created: ${userDef.email} (${userDef.role})`);
}

async function main() {
  console.log("🌱 Seeding WathiqCare demo users...\n");

  const platformTenantId = await ensurePlatformTenant();

  for (const userDef of DEMO_USERS) {
    const tenantId = userDef.tenantCode
      ? await ensureTenant(userDef.tenantCode)
      : platformTenantId;

    await seedUser(userDef, tenantId);
  }

  console.log("\n✅ Demo users seeded successfully!\n");
  console.log("Login credentials:");
  console.log("─────────────────────────────────────────────────────");
  for (const u of DEMO_USERS) {
    console.log(`  ${u.username.padEnd(25)} → ${u.password.padEnd(14)} (${u.role})`);
  }
  console.log("─────────────────────────────────────────────────────");
  console.log("\nNote: lastPasswordChangedAt is NULL → users will be prompted to change");
  console.log("      password on first login via /first-login page.\n");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
