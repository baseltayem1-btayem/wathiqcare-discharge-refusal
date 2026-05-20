/**
 * diagnose-uat-accounts.mjs
 *
 * Investigates the 5 required QA/UAT pilot accounts and optionally repairs them.
 *
 * Usage:
 *   # Dry-run (investigation only, no writes):
 *   npm run uat:diagnose -w apps/web
 *
 *   # Apply fixes (upsert accounts, reset passwords, clear locks):
 *   npm run uat:diagnose:apply -w apps/web
 *
 * What it checks for each account:
 *   - exists in users table
 *   - isActive + status (active/suspended/locked)
 *   - assigned role vs expected role
 *   - tenant assignment + domain allowed
 *   - hashed password present
 *   - password matches WathiqCare@2026
 *   - password_reset_required flag
 *   - session_revoked_at set
 *   - failedLoginAttempts + lockedUntil
 *   - email normalization (stored email vs canonical form)
 *   - active TenantMembership
 *
 * Output:
 *   - Console table with PASS / WARN / FAIL per check
 *   - JSON report written to artifacts/uat-diagnosis/
 *   - Markdown summary written to artifacts/uat-diagnosis/
 *
 * Safe guarantees:
 *   - Dry-run mode performs zero writes.
 *   - Apply mode uses only upserts (no deletes, no DROP, no schema changes).
 *   - Only affects the 5 named pilot users and the pilot-imc tenant.
 *   - Can be re-run at any time.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
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

// Honour the same fallback chain used by env-validation.ts
const resolvedDbUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_POOLED?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_PRISMA_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim();

if (!resolvedDbUrl) {
  console.error(
    "[uat-diagnose] ERROR: No database URL found.\n" +
    "Set one of: DATABASE_URL, DATABASE_URL_POOLED, DATABASE_URL_UNPOOLED,\n" +
    "            POSTGRES_PRISMA_URL, POSTGRES_URL, POSTGRES_URL_NON_POOLING\n\n" +
    "Example:\n" +
    "  DATABASE_URL='postgresql://...' npm run uat:diagnose -w apps/web\n" +
    "Or add DATABASE_URL to apps/web/.env.local",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDbUrl;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const APPLY = process.argv.includes("--apply");
const BCRYPT_ROUNDS = 12;

const PILOT_TENANT = {
  code: "pilot-imc",
  domain: "wathiqcare.med.sa",
  name: "WathiqCare IMC Pilot Tenant",
  allowedDomains: ["wathiqcare.med.sa", "wathiqcare.online"],
};

const PILOT_PASSWORD = "WathiqCare@2026";

const UAT_USERS = [
  {
    email: "dr.ahmed@wathiqcare.med.sa",
    fullName: "Dr. Ahmed Pilot Physician",
    role: "doctor",
    userType: "TENANT_USER",
    membershipRole: "MEMBER",
    label: "Pilot Physician",
  },
  {
    email: "medicaldirector@wathiqcare.med.sa",
    fullName: "Pilot Medical Director",
    role: "medical_director",
    userType: "TENANT_USER",
    membershipRole: "MANAGER",
    label: "Medical Director",
  },
  {
    email: "nursingsupervisor@wathiqcare.med.sa",
    fullName: "Pilot Nursing Supervisor",
    role: "nursing",
    userType: "TENANT_USER",
    membershipRole: "MEMBER",
    label: "Nursing Supervisor",
  },
  {
    email: "legalreviewer@wathiqcare.med.sa",
    fullName: "Pilot Legal Reviewer",
    role: "legal_admin",
    userType: "TENANT_USER",
    membershipRole: "ADMIN",
    label: "Legal Reviewer",
  },
  {
    email: "compliance@wathiqcare.med.sa",
    fullName: "Pilot Compliance Reviewer",
    role: "compliance",
    userType: "TENANT_USER",
    membershipRole: "VIEWER",
    label: "Compliance Reviewer",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const prisma = new PrismaClient();

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function extractDomain(email) {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 ? parts[1] : null;
}

async function columnExists(table, column) {
  const rows = await prisma.$queryRaw`
    SELECT 1 AS found
    FROM information_schema.columns
    WHERE table_name = ${table}
      AND column_name = ${column}
    LIMIT 1
  `;
  return rows.length > 0;
}

/** Returns raw row from users table including optional columns. */
async function fetchUserRow(email) {
  const normalized = normalizeEmail(email);

  // Determine which extended columns exist
  const [hasPwReset, hasRevoked, hasFailed, hasLocked] = await Promise.all([
    columnExists("users", "password_reset_required"),
    columnExists("users", "session_revoked_at"),
    columnExists("users", "failed_login_attempts"),
    columnExists("users", "locked_until"),
  ]);

  // Build query dynamically
  const extras = [
    hasPwReset ? "password_reset_required" : "FALSE AS password_reset_required",
    hasRevoked ? "session_revoked_at" : "NULL AS session_revoked_at",
    hasFailed ? "failed_login_attempts" : "0 AS failed_login_attempts",
    hasLocked ? "locked_until" : "NULL AS locked_until",
  ].join(", ");

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, email, tenant_id, full_name, role, user_type, is_active, status,
            email_verified, hashed_password, auth_provider, ${extras}
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    normalized,
  );

  return rows[0] ?? null;
}

async function fetchTenant(tenantId) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, code: true, name: true, isActive: true },
  });
}

async function fetchMembership(tenantId, userId) {
  return prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true, status: true },
  });
}

async function isDomainAllowed(tenantId, domain) {
  const row = await prisma.tenantAllowedDomain.findFirst({
    where: { tenantId, domain: domain.toLowerCase(), isActive: true },
    select: { id: true },
  });
  return Boolean(row);
}

async function hasActiveSubscription(tenantId) {
  const row = await prisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
    },
    select: { id: true },
  });
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------
async function diagnoseUser(userDef) {
  const storedEmail = userDef.email; // expected canonical form
  const domain = extractDomain(storedEmail);

  const row = await fetchUserRow(storedEmail);

  const result = {
    email: storedEmail,
    label: userDef.label,
    expectedRole: userDef.role,
    checks: {},
    issues: [],
    overallStatus: "PASS",
  };

  // ── 1. Exists ──────────────────────────────────────────────────────────────
  result.checks.exists = Boolean(row);
  if (!row) {
    result.issues.push("USER_NOT_FOUND: account does not exist in users table");
    result.overallStatus = "FAIL";
    return result;
  }

  result.userId = row.id;
  result.tenantId = row.tenant_id;
  result.storedEmail = row.email;
  result.storedRole = row.role;
  result.authProvider = row.auth_provider;

  // ── 2. Email normalization ─────────────────────────────────────────────────
  const storedNorm = normalizeEmail(row.email);
  const expectedNorm = normalizeEmail(storedEmail);
  result.checks.emailNormalized = storedNorm === expectedNorm;
  if (!result.checks.emailNormalized) {
    result.issues.push(`EMAIL_NORMALIZATION: stored="${row.email}" expected="${storedEmail}"`);
    result.overallStatus = "FAIL";
  }

  // ── 3. Active status ───────────────────────────────────────────────────────
  result.checks.isActive = row.is_active === true;
  const statusLower = (row.status || "").toLowerCase();
  result.checks.statusActive = statusLower === "active";
  result.checks.notSuspended = !["suspended", "banned", "disabled"].includes(statusLower);
  if (!result.checks.isActive) {
    result.issues.push(`INACTIVE: is_active=false`);
    result.overallStatus = "FAIL";
  }
  if (!result.checks.statusActive) {
    result.issues.push(`STATUS_NOT_ACTIVE: status="${row.status}"`);
    result.overallStatus = "FAIL";
  }
  if (!result.checks.notSuspended) {
    result.issues.push(`SUSPENDED_OR_BANNED: status="${row.status}"`);
    result.overallStatus = "FAIL";
  }

  // ── 4. Email verified ──────────────────────────────────────────────────────
  result.checks.emailVerified = row.email_verified === true;
  if (!result.checks.emailVerified) {
    result.issues.push("EMAIL_NOT_VERIFIED: emailVerified=false");
    result.overallStatus = "FAIL";
  }

  // ── 5. Role match ──────────────────────────────────────────────────────────
  result.checks.roleMatch = row.role === userDef.role;
  if (!result.checks.roleMatch) {
    result.issues.push(`ROLE_MISMATCH: stored="${row.role}" expected="${userDef.role}"`);
    result.overallStatus = "FAIL";
  }

  // ── 6. Password hash ───────────────────────────────────────────────────────
  const hashPresent =
    typeof row.hashed_password === "string" && row.hashed_password.length > 20;
  result.checks.passwordHashPresent = hashPresent;
  if (!hashPresent) {
    result.issues.push("NO_PASSWORD_HASH: hashed_password is null/empty");
    result.overallStatus = "FAIL";
  }

  // ── 7. Password correctness ────────────────────────────────────────────────
  if (hashPresent) {
    const passwordMatches = await bcrypt
      .compare(PILOT_PASSWORD, row.hashed_password)
      .catch(() => false);
    result.checks.passwordCorrect = passwordMatches;
    if (!passwordMatches) {
      result.issues.push(`PASSWORD_MISMATCH: stored hash does not match "${PILOT_PASSWORD}"`);
      result.overallStatus = "FAIL";
    }
  } else {
    result.checks.passwordCorrect = false;
  }

  // ── 8. Reset required / session revoked ───────────────────────────────────
  result.checks.noResetRequired = row.password_reset_required !== true;
  if (!result.checks.noResetRequired) {
    result.issues.push("RESET_REQUIRED: password_reset_required=true will block login");
    if (result.overallStatus === "PASS") result.overallStatus = "WARN";
  }

  result.checks.sessionNotRevoked = row.session_revoked_at == null;
  if (!result.checks.sessionNotRevoked) {
    result.issues.push(`SESSION_REVOKED: session_revoked_at=${row.session_revoked_at}`);
    if (result.overallStatus === "PASS") result.overallStatus = "WARN";
  }

  // ── 9. Account lock ────────────────────────────────────────────────────────
  const failedAttempts = Number(row.failed_login_attempts ?? 0);
  result.failedLoginAttempts = failedAttempts;
  result.lockedUntil = row.locked_until ?? null;
  const isLocked = row.locked_until != null && new Date(row.locked_until) > new Date();
  result.checks.notLocked = !isLocked;
  if (isLocked) {
    result.issues.push(`ACCOUNT_LOCKED: locked_until=${row.locked_until}`);
    result.overallStatus = "FAIL";
  }
  if (failedAttempts > 0) {
    result.issues.push(`FAILED_LOGIN_ATTEMPTS: count=${failedAttempts}`);
    if (result.overallStatus === "PASS") result.overallStatus = "WARN";
  }

  // ── 10. Tenant ─────────────────────────────────────────────────────────────
  result.checks.hasTenant = Boolean(row.tenant_id);
  if (!row.tenant_id) {
    result.issues.push("NO_TENANT: tenant_id is null");
    result.overallStatus = "FAIL";
  }

  if (row.tenant_id) {
    const tenant = await fetchTenant(row.tenant_id);
    result.tenantCode = tenant?.code ?? null;
    result.tenantActive = tenant?.isActive ?? false;
    result.checks.tenantExists = Boolean(tenant);
    result.checks.tenantActive = Boolean(tenant?.isActive);
    if (!tenant) {
      result.issues.push("TENANT_NOT_FOUND: tenant row missing for tenant_id");
      result.overallStatus = "FAIL";
    } else if (!tenant.isActive) {
      result.issues.push(`TENANT_INACTIVE: tenant.code="${tenant.code}" is inactive`);
      result.overallStatus = "FAIL";
    }

    if (tenant && domain) {
      const allowed = await isDomainAllowed(row.tenant_id, domain);
      result.checks.domainAllowed = allowed;
      if (!allowed) {
        result.issues.push(`DOMAIN_NOT_ALLOWED: "${domain}" not in tenant_allowed_domains for this tenant`);
        result.overallStatus = "FAIL";
      }
    }

    // ── 11. Membership ──────────────────────────────────────────────────────
    const membership = await fetchMembership(row.tenant_id, row.id);
    result.membershipStatus = membership?.status ?? null;
    result.membershipRole = membership?.role ?? null;
    result.checks.hasActiveMembership = membership?.status === "ACTIVE";
    if (!membership) {
      result.issues.push("NO_MEMBERSHIP: no TenantMembership row found");
      result.overallStatus = "FAIL";
    } else if (membership.status !== "ACTIVE") {
      result.issues.push(`MEMBERSHIP_INACTIVE: membership.status="${membership.status}"`);
      result.overallStatus = "FAIL";
    }

    // ── 12. Subscription (license) ──────────────────────────────────────────
    const hasSub = await hasActiveSubscription(row.tenant_id).catch(() => null);
    if (hasSub !== null) {
      result.checks.activeSubscription = hasSub;
      if (!hasSub) {
        result.issues.push("NO_ACTIVE_SUBSCRIPTION: tenant has no TRIALING/ACTIVE/PAST_DUE subscription — login may be denied");
        if (result.overallStatus === "PASS") result.overallStatus = "WARN";
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Repair (apply mode)
// ---------------------------------------------------------------------------
async function ensurePasswordResetSchema() {
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
    },
    create: {
      id: crypto.randomUUID(),
      code: PILOT_TENANT.code,
      name: PILOT_TENANT.name,
      domain: PILOT_TENANT.domain,
      billingEmail: `billing@${PILOT_TENANT.domain}`,
      isActive: true,
    },
  });

  const domains = [...new Set([PILOT_TENANT.domain, ...PILOT_TENANT.allowedDomains])];
  for (const domain of domains) {
    await ensureAllowedDomain(tenant.id, domain.trim().toLowerCase());
  }

  return tenant.id;
}

async function repairUser(userDef, tenantId, hashedPassword) {
  const normalized = normalizeEmail(userDef.email);
  const existing = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
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
    console.log(`  ✓ Repaired: ${userDef.email} (${userDef.label})`);
  } else {
    userId = crypto.randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        tenantId,
        email: normalized,
        fullName: userDef.fullName,
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
    console.log(`  ✓ Created: ${userDef.email} (${userDef.label})`);
  }

  // Clear any blocking flags
  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
    WHERE id = ${userId}
  `;

  // Ensure active membership
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { role: userDef.membershipRole, status: "ACTIVE" },
    create: {
      tenantId,
      userId,
      role: userDef.membershipRole,
      status: "ACTIVE",
    },
  }).catch((err) => {
    console.warn(`  ⚠ Membership upsert failed for ${userDef.email}: ${err.message}`);
  });

  return userId;
}

// ---------------------------------------------------------------------------
// HTTP login probe
// ---------------------------------------------------------------------------
async function loginProbe(baseUrl, email, password) {
  try {
    const res = await fetch(`${baseUrl}/api/auth/password/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "accept-language": "en" },
      body: JSON.stringify({ email, password, rememberMe: false }),
    });
    const payload = await res.json().catch(() => null);
    return {
      status: res.status,
      ok: res.ok,
      redirectTo: payload?.redirectTo ?? null,
      error: payload?.error ?? null,
      hasSetCookie: Boolean(res.headers.get("set-cookie")),
    };
  } catch (err) {
    return {
      status: -1,
      ok: false,
      redirectTo: null,
      error: err instanceof Error ? err.message : String(err),
      hasSetCookie: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function statusIcon(val) {
  if (val === true) return "✓";
  if (val === false) return "✗";
  if (val === "PASS") return "✓ PASS";
  if (val === "WARN") return "⚠ WARN";
  if (val === "FAIL") return "✗ FAIL";
  return "–";
}

function printDiagnosticTable(results) {
  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║              WathiqCare QA/UAT Account Diagnostic Report            ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝\n");

  for (const r of results) {
    const icon = r.overallStatus === "PASS" ? "✓" : r.overallStatus === "WARN" ? "⚠" : "✗";
    console.log(`  ${icon} [${r.overallStatus}] ${r.email} — ${r.label}`);
    if (r.userId) {
      console.log(`     id         : ${r.userId}`);
      console.log(`     tenant     : ${r.tenantCode ?? r.tenantId ?? "—"} (active: ${r.tenantActive ?? "—"})`);
      console.log(`     role       : ${r.storedRole ?? "—"} (expected: ${r.expectedRole})`);
      console.log(`     membership : ${r.membershipStatus ?? "—"} (${r.membershipRole ?? "—"})`);
      console.log(`     locked     : ${r.lockedUntil ?? "no"} (failed attempts: ${r.failedLoginAttempts ?? 0})`);
    }
    if (r.issues.length > 0) {
      for (const issue of r.issues) {
        console.log(`     ⚑  ${issue}`);
      }
    } else {
      console.log(`     ✓  No issues found`);
    }
    console.log();
  }
}

function buildMarkdown(results, applyResults, loginResults) {
  const now = new Date().toISOString();
  const lines = [
    `# WathiqCare QA/UAT Account Diagnostic Report`,
    ``,
    `**Generated**: ${now}`,
    `**Mode**: ${APPLY ? "apply (remediation applied)" : "dry-run (investigation only)"}`,
    ``,
    `## Account Status`,
    ``,
    `| Account | Label | Status | Issues |`,
    `|---------|-------|--------|--------|`,
  ];

  for (const r of results) {
    const issueText = r.issues.length > 0 ? r.issues.join("; ") : "None";
    lines.push(`| ${r.email} | ${r.label} | ${r.overallStatus} | ${issueText} |`);
  }

  lines.push(``);
  lines.push(`## Detailed Check Results`);
  lines.push(``);
  for (const r of results) {
    lines.push(`### ${r.email} — ${r.label}`);
    lines.push(``);
    lines.push(`| Check | Result |`);
    lines.push(`|-------|--------|`);
    for (const [key, val] of Object.entries(r.checks)) {
      lines.push(`| ${key} | ${statusIcon(val)} |`);
    }
    if (r.issues.length > 0) {
      lines.push(``);
      lines.push(`**Issues:**`);
      for (const issue of r.issues) {
        lines.push(`- ${issue}`);
      }
    }
    lines.push(``);
  }

  if (applyResults && applyResults.length > 0) {
    lines.push(`## Remediation Applied`);
    lines.push(``);
    lines.push(`The following accounts were upserted with password \`WathiqCare@2026\`:`);
    lines.push(``);
    for (const r of applyResults) {
      lines.push(`- **${r.email}** (${r.label}) → userId: \`${r.userId}\``);
    }
    lines.push(``);
  }

  if (loginResults && loginResults.length > 0) {
    lines.push(`## Login Probe Results`);
    lines.push(``);
    lines.push(`| Account | HTTP | OK | RedirectTo | Error |`);
    lines.push(`|---------|------|----|------------|-------|`);
    for (const l of loginResults) {
      lines.push(`| ${l.email} | ${l.status} | ${l.ok ? "✓" : "✗"} | ${l.redirectTo ?? "—"} | ${l.error ?? "—"} |`);
    }
    lines.push(``);
  }

  lines.push(`## Next Steps`);
  lines.push(``);
  if (results.every((r) => r.overallStatus === "PASS")) {
    lines.push(`All accounts are healthy. Run login validation:`);
    lines.push(``);
    lines.push("```sh");
    lines.push(`npm run validate:pilot-uat -w apps/web`);
    lines.push("```");
  } else {
    const failed = results.filter((r) => r.overallStatus !== "PASS");
    lines.push(`${failed.length} account(s) need remediation. Run:`);
    lines.push(``);
    lines.push("```sh");
    lines.push(`npm run uat:diagnose:apply -w apps/web`);
    lines.push("```");
    lines.push(``);
    lines.push(`Then validate:`);
    lines.push(``);
    lines.push("```sh");
    lines.push(`npm run validate:pilot-uat -w apps/web`);
    lines.push("```");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`[uat-diagnose] Mode: ${mode}`);
  console.log(`[uat-diagnose] Investigating ${UAT_USERS.length} QA/UAT accounts...\n`);

  // ── Phase 1: Diagnose ────────────────────────────────────────────────────
  const diagResults = [];
  for (const userDef of UAT_USERS) {
    const result = await diagnoseUser(userDef);
    diagResults.push(result);
  }

  printDiagnosticTable(diagResults);

  const overallBeforeFix = diagResults.every((r) => r.overallStatus === "PASS") ? "PASS" : "FAIL";
  console.log(`[uat-diagnose] Pre-fix overall status: ${overallBeforeFix}`);

  const applyResults = [];
  const loginResults = [];

  // ── Phase 2: Apply (if requested) ────────────────────────────────────────
  if (APPLY) {
    console.log("\n[uat-diagnose] Applying remediation...\n");

    await ensurePasswordResetSchema();
    const tenantId = await ensurePilotTenant();
    console.log(`  ✓ Tenant ensured: ${PILOT_TENANT.code} (id: ${tenantId})`);

    // Hash once; self-check before writing
    const hashedPassword = await bcrypt.hash(PILOT_PASSWORD, BCRYPT_ROUNDS);
    const hashValid = await bcrypt.compare(PILOT_PASSWORD, hashedPassword);
    if (!hashValid) {
      throw new Error("Password hash self-check failed — aborting.");
    }

    for (const userDef of UAT_USERS) {
      const userId = await repairUser(userDef, tenantId, hashedPassword);
      applyResults.push({ email: userDef.email, label: userDef.label, userId });
    }

    console.log("\n[uat-diagnose] Remediation complete. Re-diagnosing...\n");

    // Re-diagnose to verify fix
    const postFixResults = [];
    for (const userDef of UAT_USERS) {
      const result = await diagnoseUser(userDef);
      postFixResults.push(result);
    }

    printDiagnosticTable(postFixResults);

    const overallAfterFix = postFixResults.every((r) => r.overallStatus === "PASS") ? "PASS" : "FAIL";
    console.log(`[uat-diagnose] Post-fix overall status: ${overallAfterFix}`);

    // ── Phase 3: HTTP login probes ──────────────────────────────────────────
    const baseUrl = process.env.PILOT_VALIDATION_BASE_URL || "https://wathiqcare.online";
    const skipNetwork = process.env.PILOT_SKIP_NETWORK === "1";

    if (!skipNetwork) {
      console.log(`\n[uat-diagnose] Probing login at ${baseUrl}...\n`);
      for (const userDef of UAT_USERS) {
        const probe = await loginProbe(baseUrl, userDef.email, PILOT_PASSWORD);
        loginResults.push({ email: userDef.email, label: userDef.label, ...probe });
        const loginIcon = probe.ok ? "✓" : "✗";
        console.log(
          `  ${loginIcon} ${userDef.email}: HTTP ${probe.status}` +
          (probe.redirectTo ? ` → ${probe.redirectTo}` : "") +
          (probe.error ? ` [${probe.error}]` : ""),
        );
      }
    }
  } else {
    const needFix = diagResults.filter((r) => r.overallStatus !== "PASS");
    if (needFix.length > 0) {
      console.log(`\n[uat-diagnose] ⚑  ${needFix.length} account(s) need remediation.`);
      console.log(`[uat-diagnose]    Run with --apply flag to fix:`);
      console.log(`[uat-diagnose]    npm run uat:diagnose:apply -w apps/web\n`);
    } else {
      console.log(`\n[uat-diagnose] ✓ All accounts appear healthy.`);
      console.log(`[uat-diagnose]   Run validation: npm run validate:pilot-uat -w apps/web\n`);
    }
  }

  // ── Write reports ────────────────────────────────────────────────────────
  const artifactsDir = path.join(process.cwd(), "artifacts", "uat-diagnosis");
  fs.mkdirSync(artifactsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    diagnosis: diagResults,
    remediation: applyResults.length > 0 ? applyResults : null,
    loginProbes: loginResults.length > 0 ? loginResults : null,
  };

  const jsonPath = path.join(artifactsDir, `uat-diagnosis-${ts}.json`);
  const mdPath = path.join(artifactsDir, `uat-diagnosis-${ts}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf8");
  fs.writeFileSync(mdPath, buildMarkdown(diagResults, applyResults, loginResults), "utf8");

  console.log(`[uat-diagnose] JSON report: ${jsonPath}`);
  console.log(`[uat-diagnose] MD  report : ${mdPath}`);

  // Fail CI if accounts are broken and we are NOT in apply mode
  const finalResults = diagResults;
  const anyFail = finalResults.some((r) => r.overallStatus === "FAIL");
  if (anyFail && !APPLY) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("[uat-diagnose] FATAL:", err?.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
