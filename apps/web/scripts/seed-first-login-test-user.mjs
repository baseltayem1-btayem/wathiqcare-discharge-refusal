/**
 * Creates/updates a dedicated test account that forces the first-login password-change flow.
 * Intended for Playwright validation only.
 */
import { createRequire } from "node:module";
import crypto from "node:crypto";
import path from "node:path";

const require = createRequire(import.meta.url);
const fs = require("node:fs");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

const prisma = new PrismaClient();

const TEST_EMAIL = "first-login.test@demo-imc.local";
const TEST_FULL_NAME = "First Login Test Doctor";
const TEMP_PASSWORD = "TempPass123!@";
const TENANT_CODE = "demo-imc";
const TENANT_NAME = "Demo IMC";
const TENANT_DOMAIN = "demo-imc.local";

async function ensureTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { code: TENANT_CODE },
    update: { name: TENANT_NAME, domain: TENANT_DOMAIN, isActive: true },
    create: {
      id: crypto.randomUUID(),
      code: TENANT_CODE,
      name: TENANT_NAME,
      domain: TENANT_DOMAIN,
      billingEmail: `billing@${TENANT_DOMAIN}`,
      isActive: true,
    },
  });

  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId: tenant.id, domain: TENANT_DOMAIN } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId: tenant.id, domain: TENANT_DOMAIN, isActive: true },
  });

  return tenant.id;
}

async function main() {
  const tenantId = await ensureTenant();
  const hashedPassword = await bcrypt.hash(TEMP_PASSWORD, 12);

  const existing = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true },
  });

  let userId;
  if (existing) {
    userId = existing.id;
    await prisma.user.update({
      where: { id: userId },
      data: {
        tenantId,
        fullName: TEST_FULL_NAME,
        role: "doctor",
        userType: "TENANT_USER",
        status: "active",
        isActive: true,
        emailVerified: true,
        hashedPassword,
        authProvider: "local_password",
        lastPasswordChangedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  } else {
    userId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        tenantId,
        email: TEST_EMAIL,
        fullName: TEST_FULL_NAME,
        role: "doctor",
        userType: "TENANT_USER",
        status: "active",
        isActive: true,
        emailVerified: true,
        hashedPassword,
        authProvider: "local_password",
        lastPasswordChangedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = TRUE,
        session_revoked_at = NULL
    WHERE id = ${userId}
  `;

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role: "MEMBER", status: "ACTIVE" },
    create: { id: crypto.randomUUID(), tenantId, userId, role: "MEMBER", status: "ACTIVE" },
  });

  console.log(`First-login test account ready: ${TEST_EMAIL}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed first-login test user:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
