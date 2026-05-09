/**
 * seed-pilot-users.ts
 *
 * Production-grade pilot provisioning for IMC-JEDDAH.
 * Provisions ten canonical pilot accounts, one per operational role,
 * scoped to the imc-jeddah tenant. Temporary first-login passwords are
 * generated at runtime and printed ONCE to stdout; they are never stored
 * in the repository or the database in plaintext.
 *
 * Usage:
 *   # dry-run (default – no writes)
 *   npm run pilot:seed -w apps/web
 *
 *   # apply (writes to database)
 *   npm run pilot:seed:apply -w apps/web
 *
 * Flags (appended after --):
 *   --apply      Execute writes. Without this flag the script is read-only.
 *   --dry-run    Explicit dry-run (default behaviour, same as omitting --apply).
 */

import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/server/password";
import { ensurePasswordResetSchema } from "../src/lib/server/auth-reset";

// ─── Tenant Definition ────────────────────────────────────────────────────────

const IMC_JEDDAH_TENANT = {
  code: "imc-jeddah",
  domain: "imc-jeddah.sa",
  name: "International Medical Center – Jeddah",
} as const;

// ─── Role → MembershipRole mapping ───────────────────────────────────────────

type MembershipRoleValue = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
type UserTypeValue = "PLATFORM_ADMIN" | "TENANT_ADMIN" | "TENANT_USER";

function toMembershipRole(appRole: string): MembershipRoleValue {
  const map: Record<string, MembershipRoleValue> = {
    platform_admin: "ADMIN",
    legal_admin: "ADMIN",
    medical_director: "OWNER",
    doctor: "MANAGER",
    nursing: "MEMBER",
    compliance: "VIEWER",
    finance_officer: "ADMIN",
    auditor: "VIEWER",
    patient_affairs: "MEMBER",
    read_only_manager: "VIEWER",
  };
  return map[appRole] ?? "MEMBER";
}

function toUserType(appRole: string): UserTypeValue {
  if (appRole === "platform_admin") return "PLATFORM_ADMIN";
  if (appRole === "legal_admin") return "TENANT_ADMIN";
  return "TENANT_USER";
}

// ─── Pilot User Definitions ───────────────────────────────────────────────────

type PilotUserDef = {
  key: string;
  displayName: string;
  email: string;
  role: string;
  enabledModules: readonly string[];
};

const PILOT_USERS: readonly PilotUserDef[] = [
  {
    key: "platform-admin",
    displayName: "Pilot Platform Administrator",
    email: "pilot.platform.admin@imc-jeddah.sa",
    role: "platform_admin",
    enabledModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "legal-affairs",
    displayName: "Pilot Legal Affairs Officer",
    email: "pilot.legal@imc-jeddah.sa",
    role: "legal_admin",
    enabledModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "medical-director",
    displayName: "Pilot Medical Director",
    email: "pilot.medical.director@imc-jeddah.sa",
    role: "medical_director",
    enabledModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "physician",
    displayName: "Pilot Physician",
    email: "pilot.physician@imc-jeddah.sa",
    role: "doctor",
    enabledModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "nurse",
    displayName: "Pilot Nurse",
    email: "pilot.nurse@imc-jeddah.sa",
    role: "nursing",
    enabledModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "quality-compliance",
    displayName: "Pilot Quality & Compliance Officer",
    email: "pilot.quality@imc-jeddah.sa",
    role: "compliance",
    enabledModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "finance",
    displayName: "Pilot Finance Officer",
    email: "pilot.finance@imc-jeddah.sa",
    role: "finance_officer",
    enabledModules: ["promissory-notes"],
  },
  {
    key: "risk-management",
    displayName: "Pilot Risk Management Auditor",
    email: "pilot.risk@imc-jeddah.sa",
    role: "auditor",
    enabledModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
  {
    key: "operations",
    displayName: "Pilot Operations Coordinator",
    email: "pilot.operations@imc-jeddah.sa",
    role: "patient_affairs",
    enabledModules: ["informed-consents", "discharge-refusal"],
  },
  {
    key: "executive-viewer",
    displayName: "Pilot Executive Viewer",
    email: "pilot.executive@imc-jeddah.sa",
    role: "read_only_manager",
    enabledModules: ["informed-consents", "promissory-notes", "discharge-refusal"],
  },
] as const;

// ─── Password Generation ──────────────────────────────────────────────────────

/**
 * Generates a cryptographically random temporary password that satisfies the
 * platform password policy (≥12 chars, upper, lower, digit, special char).
 * The password is printed to stdout once and never stored.
 */
function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const allChars = upper + lower + digits + special;

  const randomChar = (charset: string): string =>
    charset[crypto.randomInt(charset.length)];

  // Guarantee at least one of each required class
  const required = [
    randomChar(upper),
    randomChar(upper),
    randomChar(lower),
    randomChar(lower),
    randomChar(digits),
    randomChar(digits),
    randomChar(special),
    randomChar(special),
  ];

  // Fill remaining characters from the full character set to reach 16 chars
  const remaining = Array.from({ length: 8 }, () => randomChar(allChars));

  // Shuffle using Fisher-Yates with crypto-sourced indices
  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

// ─── Prisma Helpers ───────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function ensureAllowedDomain(tenantId: string, domain: string): Promise<void> {
  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId, domain } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId, domain, isActive: true },
  });
}

async function ensureTenant(): Promise<string> {
  const tenant = await prisma.tenant.upsert({
    where: { code: IMC_JEDDAH_TENANT.code },
    update: {
      name: IMC_JEDDAH_TENANT.name,
      domain: IMC_JEDDAH_TENANT.domain,
      billingEmail: `billing@${IMC_JEDDAH_TENANT.domain}`,
      isActive: true,
    },
    create: {
      id: crypto.randomUUID(),
      code: IMC_JEDDAH_TENANT.code,
      name: IMC_JEDDAH_TENANT.name,
      domain: IMC_JEDDAH_TENANT.domain,
      billingEmail: `billing@${IMC_JEDDAH_TENANT.domain}`,
      isActive: true,
    },
  });

  await ensureAllowedDomain(tenant.id, IMC_JEDDAH_TENANT.domain);
  return tenant.id;
}

type UpsertResult = {
  userId: string;
  email: string;
  created: boolean;
};

async function upsertPilotUser(
  userDef: PilotUserDef,
  tenantId: string,
  hashedPassword: string,
): Promise<UpsertResult> {
  const existing = await prisma.user.findUnique({
    where: { email: userDef.email },
    select: { id: true, email: true },
  });

  const userType = toUserType(userDef.role);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        tenantId,
        fullName: userDef.displayName,
        role: userDef.role,
        userType,
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

    // Force password reset on first login
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = TRUE,
          session_revoked_at = NOW()
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

    return { userId: existing.id, email: userDef.email, created: false };
  }

  const userId = crypto.randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      tenantId,
      email: userDef.email,
      fullName: userDef.displayName,
      role: userDef.role,
      userType,
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
    SET password_reset_required = TRUE,
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
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  ⚠ Membership skipped for ${userDef.email}: ${message}`);
    });

  return { userId, email: userDef.email, created: true };
}

// ─── Argument Parsing ─────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { apply: boolean } {
  const flags = new Set(argv);
  if (flags.has("--help") || flags.has("-h")) {
    console.log([
      "Usage:",
      "  npm run pilot:seed -w apps/web           # dry-run (read-only)",
      "  npm run pilot:seed:apply -w apps/web     # apply (write to database)",
      "",
      "Flags:",
      "  --apply     Execute writes. Without this flag the script runs in dry-run mode.",
      "  --dry-run   Explicit dry-run (default).",
      "  --help      Show this help.",
    ].join("\n"));
    process.exit(0);
  }

  return { apply: flags.has("--apply") };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2));
  const mode = apply ? "apply" : "dry-run";

  console.log(`\n[pilot-seed] IMC-JEDDAH pilot provisioning — mode: ${mode.toUpperCase()}\n`);

  // Generate temporary passwords for this run
  const passwordMap = new Map<string, string>(
    PILOT_USERS.map((u) => [u.key, generateTemporaryPassword()]),
  );

  if (!apply) {
    console.log("[pilot-seed] DRY-RUN — no database writes will occur.\n");
    console.log("[pilot-seed] Pilot accounts that would be provisioned:\n");

    for (const user of PILOT_USERS) {
      console.log(JSON.stringify({
        key: user.key,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        userType: toUserType(user.role),
        membershipRole: toMembershipRole(user.role),
        tenant: IMC_JEDDAH_TENANT.code,
        enabledModules: user.enabledModules,
        firstLoginRequired: true,
        tempPassword: passwordMap.get(user.key),
      }, null, 2));
    }

    console.log("\n[pilot-seed] Run with --apply to write these accounts to the database.");
    console.log("[pilot-seed] Temporary passwords above are for this dry-run preview only.");
    return;
  }

  // Ensure schema columns exist
  await ensurePasswordResetSchema(prisma);

  // Ensure IMC-JEDDAH tenant
  console.log("[pilot-seed] Ensuring IMC-JEDDAH tenant...");
  const tenantId = await ensureTenant();
  console.log(`  ✓ Tenant ready: ${IMC_JEDDAH_TENANT.code} (${tenantId})\n`);

  // Provision each pilot user
  console.log("[pilot-seed] Provisioning pilot accounts...\n");

  const report: Array<{
    key: string;
    email: string;
    role: string;
    action: string;
    firstLoginRequired: boolean;
    tempPassword: string;
  }> = [];

  for (const userDef of PILOT_USERS) {
    const tempPassword = passwordMap.get(userDef.key)!;
    const hashedPw = await hashPassword(tempPassword);
    const result = await upsertPilotUser(userDef, tenantId, hashedPw);
    const action = result.created ? "created" : "updated";

    console.log(`  ✓ ${action.toUpperCase().padEnd(7)} ${userDef.email} (${userDef.role})`);

    report.push({
      key: userDef.key,
      email: userDef.email,
      role: userDef.role,
      action,
      firstLoginRequired: true,
      tempPassword,
    });
  }

  // Print the one-time credential summary
  console.log("\n" + "═".repeat(72));
  console.log("[pilot-seed] ONE-TIME CREDENTIAL SUMMARY — IMC-JEDDAH PILOT");
  console.log("[pilot-seed] These temporary passwords are displayed ONCE.");
  console.log("[pilot-seed] All accounts require a password change on first login.");
  console.log("═".repeat(72) + "\n");

  for (const entry of report) {
    console.log(`  ${entry.email.padEnd(44)} ${entry.tempPassword}`);
  }

  console.log("\n" + "═".repeat(72));
  console.log("[pilot-seed] Pilot provisioning complete.");
  console.log("[pilot-seed] Distribute credentials through a secure channel (not email/chat).");
  console.log("[pilot-seed] Users will be forced to change their password on first login.");
  console.log("═".repeat(72) + "\n");
}

main()
  .catch((error: unknown) => {
    console.error(
      "[pilot-seed] FATAL:",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
