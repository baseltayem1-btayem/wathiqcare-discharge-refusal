#!/usr/bin/env node

const { PrismaClient, MembershipRole, MembershipStatus, UserType } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const idx = trimmed.indexOf("=");
    if (idx <= 0) {
      continue;
    }

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

const repoRoot = process.cwd();
loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Configure it in shell env or apps/web/.env.local before running admins:ensure.",
  );
}

const prisma = new PrismaClient();

const TENANT_CODE = "wathiqcare";
const TENANT_NAME = "WathiqCare";
const TENANT_DOMAIN = "wathiqcare.online";

const SUPERADMIN_EMAIL = "admin@wathiqcare.online";
const PLATFORM_ADMIN_EMAIL = "admin@wathiqcare.med.sa";

async function clearResetEnforcement(userId) {
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = FALSE,
          session_revoked_at = NULL
      WHERE id = ${userId}
    `;
  } catch (error) {
    if (error && typeof error === "object" && (error.code === "P2022" || error.code === "P2010" || error.code === "P2021")) {
      console.warn("[ensure-admin-access] WARN: password reset enforcement columns missing; skipped reset flag clear.");
      return;
    }
    throw error;
  }
}

function requireEnv(name) {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw new Error(`[ensure-admin-access] ERROR: ${name} is required.`);
  }
  return value;
}

async function ensureTenant() {
  return prisma.tenant.upsert({
    where: { code: TENANT_CODE },
    update: {
      name: TENANT_NAME,
      domain: TENANT_DOMAIN,
      isActive: true,
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: SUPERADMIN_EMAIL,
    },
    create: {
      code: TENANT_CODE,
      name: TENANT_NAME,
      domain: TENANT_DOMAIN,
      isActive: true,
      timezone: "Asia/Riyadh",
      country: "SA",
      billingEmail: SUPERADMIN_EMAIL,
    },
  });
}

async function ensureAllowedDomain(tenantId, domain) {
  try {
    const existing = await prisma.tenantAllowedDomain.findUnique({
      where: { tenantId_domain: { tenantId, domain } },
      select: { id: true },
    });

    if (existing) {
      await prisma.tenantAllowedDomain.update({
        where: { tenantId_domain: { tenantId, domain } },
        data: { isActive: true },
      });
      return;
    }

    await prisma.tenantAllowedDomain.create({
      data: {
        id: randomUUID(),
        tenantId,
        domain,
        isActive: true,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2021") {
      console.warn(
        `[ensure-admin-access] WARN: tenant_allowed_domains table missing; skipped domain allowlist for ${domain}.`,
      );
      return;
    }
    throw error;
  }
}

async function ensureUser({
  tenantId,
  email,
  fullName,
  role,
  membershipRole,
  password,
}) {
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      tenantId,
      fullName,
      role,
      userType: UserType.PLATFORM_ADMIN,
      status: "active",
      isActive: true,
      emailVerified: true,
      authProvider: "local_password",
      hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastPasswordChangedAt: new Date(),
    },
    create: {
      tenantId,
      email,
      fullName,
      role,
      userType: UserType.PLATFORM_ADMIN,
      status: "active",
      isActive: true,
      emailVerified: true,
      authProvider: "local_password",
      hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastPasswordChangedAt: new Date(),
    },
  });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id,
      },
    },
    update: {
      role: membershipRole,
      status: MembershipStatus.ACTIVE,
    },
    create: {
      tenantId,
      userId: user.id,
      role: membershipRole,
      status: MembershipStatus.ACTIVE,
    },
  });


  await clearResetEnforcement(user.id);
  return user;
}

async function main() {
  const superadminPassword = requireEnv("WATHIQCARE_SUPERADMIN_PASSWORD");
  const platformAdminPassword = requireEnv("WATHIQCARE_PLATFORM_ADMIN_PASSWORD");

  const tenant = await ensureTenant();

  await ensureAllowedDomain(tenant.id, "wathiqcare.online");
  await ensureAllowedDomain(tenant.id, "wathiqcare.med.sa");

  await ensureUser({
    tenantId: tenant.id,
    email: SUPERADMIN_EMAIL,
    fullName: "WathiqCare Platform Superadmin",
    role: "platform_superadmin",
    membershipRole: MembershipRole.OWNER,
    password: superadminPassword,
  });

  await ensureUser({
    tenantId: tenant.id,
    email: PLATFORM_ADMIN_EMAIL,
    fullName: "WathiqCare Platform Admin",
    role: "platform_admin",
    membershipRole: MembershipRole.ADMIN,
    password: platformAdminPassword,
  });

  console.log("[ensure-admin-access] Completed successfully.");
  console.log(`[ensure-admin-access] Bootstrap superadmin login identifier: ${SUPERADMIN_EMAIL}`);
  console.log(`[ensure-admin-access] Bootstrap platform admin login identifier: ${PLATFORM_ADMIN_EMAIL}`);
  console.log("[ensure-admin-access] Bootstrap accounts are internal operational accounts, not demo accounts.");
  console.log("[ensure-admin-access] Password values are not printed. Rotate bootstrap credentials through the managed reset flow.");
}

main()
  .catch((error) => {
    console.error("[ensure-admin-access] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
