/**
 * seed-pilot-users.mjs
 * Dry-run by default. Use --apply to upsert pilot users for production validation access.
 */

import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const APPLY = process.argv.includes("--apply");
const IMC_DOMAIN = "imc.med.sa";

const PILOT_USERS = [
  {
    email: "legal.admin@imc.med.sa",
    fullName: "IMC Legal Admin",
    role: "legal_admin",
    userType: "TENANT_ADMIN",
    membershipRole: "ADMIN",
    passwordEnv: "PILOT_LEGAL_ADMIN_PASSWORD",
  },
  {
    email: "doctor.er@imc.med.sa",
    fullName: "IMC ER Doctor",
    role: "doctor",
    userType: "TENANT_USER",
    membershipRole: "MEMBER",
    passwordEnv: "PILOT_DOCTOR_PASSWORD",
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    // Skip malformed entries and lines with empty keys.
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
    ? path.resolve(process.cwd(), "..", "..")
    : process.cwd();
  loadEnvFile(path.join(repoRoot, ".env"));
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
  loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));
}

async function resolveTenant() {
  const imcTenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ code: "IMC" }, { domain: IMC_DOMAIN }],
    },
    select: { id: true, code: true, name: true, domain: true },
  });

  if (imcTenant) return imcTenant;

  const fallback = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true, domain: true },
  });

  if (!fallback) {
    throw new Error("No active tenant found. Seed aborted.");
  }

  console.warn(`[pilot-seed] IMC tenant not found; using active tenant '${fallback.code}'.`);
  return fallback;
}

async function upsertPilotUser(tenant, def) {
  const existing = await prisma.user.findUnique({
    where: { email: def.email.toLowerCase() },
    select: { id: true },
  });

  const action = existing ? "update" : "create";
  if (!APPLY) {
    console.log(`  - DRY RUN: would ${action} ${def.email} (${def.role})`);
    return { created: 0, updated: 0 };
  }

  const rawPassword = process.env[def.passwordEnv]?.trim();
  if (!rawPassword) {
    throw new Error(`Missing required environment variable ${def.passwordEnv} for user ${def.email}`);
  }
  const hashedPassword = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);
  const data = {
    tenantId: tenant.id,
    email: def.email.toLowerCase(),
    fullName: def.fullName,
    role: def.role,
    userType: def.userType,
    status: "active",
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    hashedPassword,
    authProvider: "local_password",
    lastPasswordChangedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
  };

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          ...data,
        },
      });

  await prisma.tenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: { role: def.membershipRole, status: "ACTIVE" },
    create: {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      userId: user.id,
      role: def.membershipRole,
      status: "ACTIVE",
    },
  });

  console.log(`  ✓ ${existing ? "Updated" : "Created"} ${def.email}`);
  return existing ? { created: 0, updated: 1 } : { created: 1, updated: 0 };
}

async function main() {
  loadEnv();
  console.log(`[pilot-seed] Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const tenant = await resolveTenant();
  console.log(`[pilot-seed] Target tenant: ${tenant.code} (${tenant.name})`);
  console.log(`[pilot-seed] Upserting ${PILOT_USERS.length} pilot users...`);

  let created = 0;
  let updated = 0;
  for (const def of PILOT_USERS) {
    const result = await upsertPilotUser(tenant, def);
    created += result.created;
    updated += result.updated;
  }

  console.log("\n[pilot-seed] Completed.");
  console.log(`[pilot-seed] created=${created}, updated=${updated}, total=${PILOT_USERS.length}`);
  if (!APPLY) {
    console.log("[pilot-seed] Re-run with --apply to persist changes.");
    console.log("[pilot-seed] Apply mode requires PILOT_LEGAL_ADMIN_PASSWORD and PILOT_DOCTOR_PASSWORD.");
  }
}

main()
  .catch((err) => {
    console.error("[pilot-seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
