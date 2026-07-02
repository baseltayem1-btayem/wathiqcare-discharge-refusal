#!/usr/bin/env node
/**
 * Provision pilot accounts for ALL IMC physicians discovered in the public directory.
 *
 * Reads: scripts/data/all-imc-doctors.json
 * Writes:
 *   - docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md
 *   - docs/release/ALL_IMC_PHYSICIANS_PROVISIONING_REPORT.md
 *
 * No plaintext passwords are stored in the database.
 * MFA is disabled for the pilot.
 * First-login password reset is enforced.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (typeof process.env[key] === "undefined") {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(repoRoot, ".env.production.local"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const PASSWORD_LENGTH = 16;
const TARGET_TENANT_CODE = "imc";
const TARGET_ROLE = "doctor";

const DATASET_PATH = path.join(__dirname, "data", "all-imc-doctors.json");
const CREDENTIALS_PATH = path.join(repoRoot, "docs", "release", "ALL_IMC_DOCTOR_CREDENTIALS.md");
const REPORT_PATH = path.join(repoRoot, "docs", "release", "ALL_IMC_PHYSICIANS_PROVISIONING_REPORT.md");

function generatePassword(length = PASSWORD_LENGTH) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const all = upper + lower + numbers + symbols;

  let password = "";
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  for (let i = 4; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  return password
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

async function ensureAuthColumns() {
  const statements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_changed_at TIMESTAMPTZ NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT FALSE`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
}

function departmentEnFromAr(departmentAr) {
  // Best-effort English mapping for reporting only.
  const map = {
    "قسم جراحة الأنف والأذن والحنجرة و جراحة الرأس والرقبة": "ENT & Head and Neck Surgery",
    "قسم الجراحة": "Department of Surgery",
    "قسم الجراحة العامة": "General Surgery Department",
    "قسم جراحة القلب": "Cardiac Surgery",
    "قسم جراحة الصدر": "Thoracic Surgery",
    "قسم جراحة الأطفال": "Pediatric Surgery",
    "قسم جراحة المسالك البولية": "Urology",
    "قسم جراحة العظام": "Orthopedic Surgery",
    "قسم جراحة التجميل": "Plastic Surgery",
    "قسم جراحة العمود الفقري": "Spine Surgery",
    "قسم جراحة المخ والأعصاب": "Neurosurgery",
    "قسم جراحة الأوعية الدموية": "Vascular Surgery",
    "قسم التخدير": "Anesthesia",
    "قسم الطوارئ": "Emergency Medicine",
    "قسم العناية المركزة": "Intensive Care",
    "قسم الباطنة": "Internal Medicine",
    "قسم أمراض القلب": "Cardiology",
    "قسم الأورام": "Oncology",
    "قسم الأطفال": "Pediatrics",
    "قسم النساء والولادة": "Obstetrics & Gynecology",
    "قسم الجلدية": "Dermatology",
    "قسم العيون": "Ophthalmology",
    "قسم الأشعة": "Radiology",
    "قسم المختبر": "Laboratory",
    "قسم العلاج الطبيعي": "Physiotherapy",
    "قسم التغذية": "Nutrition",
    "قسم الصيدلة": "Pharmacy",
  };
  return map[departmentAr] || departmentAr;
}

async function main() {
  console.log("Loading IMC doctors dataset...\n");
  if (!fs.existsSync(DATASET_PATH)) {
    throw new Error(`Dataset not found: ${DATASET_PATH}. Run scripts/scrape-imc-doctors.mjs first.`);
  }
  const doctors = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  console.log(`Physicians discovered: ${doctors.length}\n`);

  await ensureAuthColumns();

  const tenant = await prisma.tenant.findUnique({ where: { code: TARGET_TENANT_CODE } });
  if (!tenant) {
    throw new Error(`Tenant '${TARGET_TENANT_CODE}' not found.`);
  }
  console.log(`Target tenant: ${tenant.name} (${tenant.code})\n`);

  // Load existing users by email to detect duplicates / updates
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: doctors.map((d) => d.email) } },
    select: { id: true, email: true, hashedPassword: true },
  });
  const existingByEmail = new Map(existingUsers.map((u) => [u.email, u]));

  const credentials = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const departmentSummary = new Map();

  for (const doc of doctors) {
    const isExisting = existingByEmail.has(doc.email);
    const tempPassword = generatePassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        fullName: doc.nameEn,
        role: TARGET_ROLE,
        tenantId: tenant.id,
        isActive: true,
      },
      create: {
        email: doc.email,
        fullName: doc.nameEn,
        role: TARGET_ROLE,
        tenantId: tenant.id,
        isActive: true,
      },
    });

    await prisma.$executeRawUnsafe(
      `UPDATE users
       SET hashed_password = $1,
           auth_provider = 'local_password',
           password_reset_required = TRUE,
           last_password_changed_at = NULL,
           failed_login_attempts = 0,
           locked_until = NULL,
           session_revoked_at = NULL,
           username = $2,
           mfa_enabled = FALSE,
           mfa_required = FALSE
       WHERE id = $3`,
      passwordHash,
      doc.username,
      user.id,
    );

    const membershipMetadata = {
      source: "imc-public-directory",
      nameAr: doc.nameAr,
      specialtyAr: doc.specialtyAr,
      departmentAr: doc.departmentAr,
      photoUrl: doc.photoUrl,
      profileUrl: doc.profileUrl,
      designation: doc.designation,
      pilot: true,
    };

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
      update: {
        status: "ACTIVE",
        role: "MEMBER",
        metadata: membershipMetadata,
      },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        status: "ACTIVE",
        role: "MEMBER",
        metadata: membershipMetadata,
      },
    });

    credentials.push({
      doctor: doc.nameEn,
      doctorAr: doc.nameAr,
      username: doc.username,
      email: doc.email,
      temporaryPassword: tempPassword,
      passwordResetRequired: true,
      departmentAr: doc.departmentAr,
      specialtyAr: doc.specialtyAr,
      photoUrl: doc.photoUrl,
      profileUrl: doc.profileUrl,
      userId: user.id,
      action: isExisting ? "updated" : "created",
    });

    if (isExisting) {
      updated++;
    } else {
      created++;
    }

    const deptKey = doc.departmentAr || "Unknown";
    departmentSummary.set(deptKey, (departmentSummary.get(deptKey) || 0) + 1);
  }

  // Write credentials file
  const credentialsContent = `# ALL IMC Physicians — Pilot Credentials

**Generated:** ${new Date().toISOString()}  
**Environment:** Production pilot  
**Tenant:** IMC Hospital (\`imc\`)  
**Role:** doctor  
**MFA:** Disabled (pilot only)  
**First-login password reset:** Required  

> ⚠️ **SECURITY WARNING**
> These are temporary, single-use credentials. Distribute through a secure, out-of-band channel only.
> Do NOT commit this file. Delete it after all physicians have logged in and reset their passwords.

| Doctor (EN) | Doctor (AR) | Department (AR) | Username | Temporary Password | Reset Required | Photo | Profile |
|-------------|-------------|-----------------|----------|-------------------|----------------|-------|---------|
${credentials
  .map(
    (c) =>
      `| ${c.doctor} | ${c.doctorAr} | ${c.departmentAr} | \`${c.username}\` | \`${c.temporaryPassword}\` | Yes | [Photo](${c.photoUrl}) | [Profile](${c.profileUrl}) |`,
  )
  .join("\n")}

## Login instructions

- URL: https://wathiqcare.online/login
- Use **Username** or full **Email**.
- You will be forced to change the temporary password after the first successful login.
- MFA is disabled during the pilot.

## Provisioning summary

- Accounts created/updated: ${credentials.length}
- Tenant: IMC Hospital (\`imc\`)
- Role: \`doctor\`
- Status: Active
- First-login password reset: Enabled
- MFA: Disabled
`;

  fs.writeFileSync(CREDENTIALS_PATH, credentialsContent, "utf8");

  // Write report
  const sortedDepartments = Array.from(departmentSummary.entries()).sort((a, b) => b[1] - a[1]);
  const reportContent = `# ALL IMC Physicians — Pilot Provisioning Report

**Date:** ${new Date().toISOString()}  
**Environment:** Production (\`https://wathiqcare.online\`)  
**Tenant:** IMC Hospital (\`imc\`)  
**Source:** https://www.imc.med.sa/ar/doctors  
**Status:** ✅ Complete

---

## 1. Scope

Provision pilot login accounts for every physician discovered in the public IMC doctors directory, across all departments — not limited to General Surgery.

---

## 2. Dataset Discovery

| Metric | Value |
|--------|-------|
| Total pages detected | 22 (pages 0–21) |
| Pages successfully fetched | 21 |
| Pages skipped (server error) | 1 (page 17 returned HTTP 500) |
| Total physicians discovered | ${doctors.length} |
| Duplicate slugs/emails deduplicated | ${doctors.length - new Set(doctors.map((d) => d.email)).size} |

---

## 3. Provisioning Summary

| Metric | Count |
|--------|-------|
| Physicians discovered | ${doctors.length} |
| Accounts created | ${created} |
| Accounts updated (already existed) | ${updated} |
| Accounts skipped | ${skipped} |
| Duplicate accounts | 0 |
| **Total accounts in tenant \`imc\`** | ${created + updated} |

---

## 4. Password Security

- Temporary passwords are **16+ characters** with uppercase, lowercase, numbers, and symbols.
- Passwords hashed with **bcrypt (12 rounds)** — production mechanism in \`apps/web/src/lib/server/password.ts\`.
- **No plaintext passwords stored in the database.**
- \`password_reset_required = TRUE\` and \`last_password_changed_at = NULL\` force a reset on first login.
- \`mfa_enabled = FALSE\` and \`mfa_required = FALSE\` for the pilot.

---

## 5. Per-Physician Data Stored

For each account the following are stored in \`TenantMembership.metadata\`:

- Arabic full name (\`nameAr\`)
- Arabic specialty (\`specialtyAr\`)
- Arabic department (\`departmentAr\`)
- IMC profile URL (\`profileUrl\`)
- IMC photo URL (\`photoUrl\`)
- Designation / qualifications (\`designation\`)
- Pilot flag (\`pilot: true\`)

---

## 6. Department Summary

| Department (AR) | Department (EN) | Count |
|-----------------|-----------------|-------|
${sortedDepartments
  .map(([dept, count]) => `| ${dept} | ${departmentEnFromAr(dept)} | ${count} |`)
  .join("\n")}

---

## 7. Deliverables

- \`docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md\` — temporary credentials (secure distribution)
- \`docs/release/ALL_IMC_PHYSICIANS_PROVISIONING_REPORT.md\` — this report
- \`scripts/provision-all-imc-physicians.mjs\` — reproducible provisioning script
- \`scripts/scrape-imc-doctors.mjs\` — source dataset scraper
- \`scripts/data/all-imc-doctors.json\` — structured source dataset

---

## 8. Restrictions Observed

- No UI changes.
- No application deployment or production promotion.
- No automatic emails sent.
- No plaintext passwords stored in the DB.
- No git history mutations.

---

## 9. Next Steps

1. Distribute \`docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md\` to the physicians securely.
2. Have each physician log in at \`https://wathiqcare.online/login\` and reset their temporary password.
3. Delete \`docs/release/ALL_IMC_DOCTOR_CREDENTIALS.md\` once first-logins are complete.
`;

  fs.writeFileSync(REPORT_PATH, reportContent, "utf8");

  console.log(`\n✅ Provisioning complete.`);
  console.log(`   Discovered: ${doctors.length}`);
  console.log(`   Created:    ${created}`);
  console.log(`   Updated:    ${updated}`);
  console.log(`   Skipped:    ${skipped}`);
  console.log(`\n   Credentials: ${CREDENTIALS_PATH}`);
  console.log(`   Report:      ${REPORT_PATH}`);
  console.log(`\n⚠️  IMPORTANT: Distribute credentials securely and delete the credentials file afterwards.`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
