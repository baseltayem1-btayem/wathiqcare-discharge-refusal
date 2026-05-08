/**
 * seed-demo-users.mjs
 * Provisions controlled demo-only accounts and safe demo data for module validation.
 * Public signup remains disabled. This script is for invite-only demo access and test fixtures.
 */

import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const fs = require("node:fs");
const path = require("node:path");

// Load bcryptjs for password hashing
const bcrypt = require("bcryptjs");
const { PrismaClient, PromissoryNoteStatus, CaseType, CaseStatus, ConsentMethod } = require("@prisma/client");

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

const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
  ? path.resolve(process.cwd(), "..", "..")
  : process.cwd();
loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env"));
loadEnvFile(path.join(repoRoot, "apps", "web", ".env.local"));

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const PILOT_PASSWORD_FILE_ENV = "WATHIQCARE_PILOT_PASSWORD_FILE";

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

const DEMO_PLATFORM_TENANT = {
  code: "wathiqcare-demo-platform",
  domain: "wathiqcare.online",
  name: "WathiqCare Pilot Platform",
};

const DEMO_IMC_TENANT = {
  code: "demo-imc",
  domain: "pilot.imc.wathiqcare.online",
  name: "Pilot IMC Tenant",
};

function loadPilotPasswords() {
  const filePath = process.env[PILOT_PASSWORD_FILE_ENV];
  if (!filePath) {
    throw new Error(`Missing ${PILOT_PASSWORD_FILE_ENV}. Provide a secure JSON file with pilot account passwords.`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${PILOT_PASSWORD_FILE_ENV} must point to a JSON object keyed by pilot account role.`);
  }

  return parsed;
}

const pilotPasswords = loadPilotPasswords();

function requirePilotPassword(key) {
  const password = pilotPasswords[key];
  if (typeof password !== "string" || password.length < 16) {
    throw new Error(`Missing secure password for pilot account '${key}'.`);
  }
  return password;
}

const DEMO_USERS = [
  {
    key: "platform-admin",
    email: "platform.admin@wathiqcare.online",
    fullName: "Platform Admin",
    label: "Platform Admin",
    role: "platform_admin",
    userType: "PLATFORM_ADMIN",
    tenantCode: DEMO_PLATFORM_TENANT.code,
  },
  {
    key: "legal-affairs",
    email: "legal.affairs@pilot.imc.wathiqcare.online",
    fullName: "Legal Affairs",
    label: "Legal Affairs",
    role: "legal_admin",
    userType: "TENANT_ADMIN",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    key: "doctor",
    email: "doctor@pilot.imc.wathiqcare.online",
    fullName: "Doctor",
    label: "Doctor",
    role: "doctor",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    key: "nurse",
    email: "nurse@pilot.imc.wathiqcare.online",
    fullName: "Nurse",
    label: "Nurse",
    role: "nursing",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    key: "medical-director",
    email: "medical.director@pilot.imc.wathiqcare.online",
    fullName: "Medical Director",
    label: "Medical Director",
    role: "medical_director",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    key: "quality-compliance",
    email: "quality.compliance@pilot.imc.wathiqcare.online",
    fullName: "Quality / Compliance",
    label: "Quality / Compliance",
    role: "compliance",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    key: "finance-admin",
    email: "finance.admin@pilot.imc.wathiqcare.online",
    fullName: "Finance / Authorized Admin",
    label: "Finance / Authorized Admin",
    role: "finance_officer",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
];

async function ensurePasswordResetSchema() {
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL`);
}

async function ensureAllowedDomain(tenantId, domain) {
  await prisma.tenantAllowedDomain.upsert({
    where: { tenantId_domain: { tenantId, domain } },
    update: { isActive: true },
    create: { id: crypto.randomUUID(), tenantId, domain, isActive: true },
  });
}

async function ensureTenant(tenantDef) {
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

  await ensureAllowedDomain(tenant.id, tenantDef.domain);
  return tenant.id;
}

// Map app roles to MembershipRole enum values
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

async function seedUser(userDef, tenantId) {
  const hashedPassword = await hashPassword(requirePilotPassword(userDef.key));

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
        lastPasswordChangedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = TRUE,
          session_revoked_at = NOW()
      WHERE id = ${existing.id}
    `;
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: existing.id } },
      update: { role: toMembershipRole(userDef.role), status: "ACTIVE" },
      create: { tenantId, userId: existing.id, role: toMembershipRole(userDef.role), status: "ACTIVE" },
    });
    console.log(`  ✓ Updated demo account: ${userDef.email} (${userDef.label})`);
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
        lastPasswordChangedAt: null,
      },
    });

  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = TRUE,
        session_revoked_at = NOW()
    WHERE id = ${userId}
  `;

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

  console.log(`  ✓ Created demo account: ${userDef.email} (${userDef.label})`);
  return userId;
}

async function ensureCase(tenantId, createdByUserId, data) {
  return prisma.case.upsert({
    where: { tenantId_caseNumber: { tenantId, caseNumber: data.caseNumber } },
    update: {
      caseType: data.caseType,
      status: data.status,
      title: data.title,
      patientName: data.patientName,
      patientIdNumber: data.patientIdNumber,
      medicalRecordNo: data.medicalRecordNo,
      metadata: data.metadata,
      updatedByUserId: createdByUserId,
    },
    create: {
      id: crypto.randomUUID(),
      tenantId,
      caseNumber: data.caseNumber,
      caseType: data.caseType,
      status: data.status,
      title: data.title,
      patientName: data.patientName,
      patientIdNumber: data.patientIdNumber,
      medicalRecordNo: data.medicalRecordNo,
      metadata: data.metadata,
      createdByUserId,
      updatedByUserId: createdByUserId,
    },
  });
}

async function ensureConsentRecord(tenantId, caseId, status, overrides = {}) {
  const existing = await prisma.consentRecord.findFirst({
    where: { tenantId, caseId, status, documentVersion: overrides.documentVersion ?? status },
    select: { id: true },
  });
  if (existing) return existing.id;

  const record = await prisma.consentRecord.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      caseId,
      processingPurpose: overrides.processingPurpose ?? "DEMO informed consent workflow",
      lawfulBasis: overrides.lawfulBasis ?? "patient_authorization",
      consentType: overrides.consentType ?? "procedure_consent",
      consentMethod: overrides.consentMethod ?? ConsentMethod.WRITTEN,
      documentVersion: overrides.documentVersion ?? status,
      witnessName: overrides.witnessName ?? "DEMO Witness",
      otpReference: overrides.otpReference ?? null,
      status,
      metadata: {
        demoRecord: true,
        demoLabel: status,
        procedure: overrides.procedure ?? "DEMO Laparoscopic Cholecystectomy",
      },
    },
  });
  return record.id;
}

async function ensurePromissoryNote(tenantId, caseId, noteNumber, status, overrides = {}) {
  return prisma.promissoryNote.upsert({
    where: { tenantId_noteNumber: { tenantId, noteNumber } },
    update: {
      debtorName: overrides.debtorName,
      debtorIdNumber: overrides.debtorIdNumber,
      issuerName: overrides.issuerName,
      amount: overrides.amount,
      currency: "SAR",
      dueDate: overrides.dueDate,
      status,
      metadata: overrides.metadata,
      documentVersion: overrides.documentVersion ?? "demo-v1",
    },
    create: {
      id: crypto.randomUUID(),
      tenantId,
      caseId,
      noteNumber,
      debtorName: overrides.debtorName,
      debtorIdNumber: overrides.debtorIdNumber,
      issuerName: overrides.issuerName,
      amount: overrides.amount,
      currency: "SAR",
      dueDate: overrides.dueDate,
      status,
      documentVersion: overrides.documentVersion ?? "demo-v1",
      documentHash: crypto.createHash("sha256").update(noteNumber).digest("hex"),
      metadata: overrides.metadata,
    },
  });
}

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass('public.${tableName}')::text AS name`);
  return Boolean(rows?.[0]?.name);
}

async function ensureDemoModuleData(tenantId, actorUserId) {
  const consentCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-IC-001",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    title: "DEMO Informed Consent Case",
    patientName: "DEMO PATIENT CONSENT",
    patientIdNumber: "DEMO-NID-IC-001",
    medicalRecordNo: "DEMO-MRN-IC-001",
    metadata: { demoRecord: true, module: "informed-consents" },
  });

  if (await tableExists("consent_records")) {
    await ensureConsentRecord(tenantId, consentCase.id, "draft", {
      consentMethod: ConsentMethod.WRITTEN,
      documentVersion: "demo-draft",
    });
    await ensureConsentRecord(tenantId, consentCase.id, "pending_signature", {
      consentMethod: ConsentMethod.OTP,
      documentVersion: "demo-pending",
      otpReference: "DEMO-OTP-001",
    });
    await ensureConsentRecord(tenantId, consentCase.id, "signed", {
      consentMethod: ConsentMethod.ELECTRONIC_SIGNATURE,
      documentVersion: "demo-signed",
    });
  } else {
    console.log("  ! Skipping informed consent demo records: table public.consent_records is not available.");
  }

  const promissoryCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-PN-001",
    caseType: CaseType.GENERAL,
    status: CaseStatus.OPEN,
    title: "DEMO Promissory Note Case",
    patientName: "DEMO PATIENT FINANCE",
    patientIdNumber: "DEMO-NID-PN-001",
    medicalRecordNo: "DEMO-MRN-PN-001",
    metadata: { demoRecord: true, module: "promissory-notes" },
  });

  if (await tableExists("promissory_notes")) {
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-DRAFT", PromissoryNoteStatus.DRAFT, {
      debtorName: "DEMO DEBTOR DRAFT",
      debtorIdNumber: "DEMO-DEBTOR-001",
      issuerName: "DEMO IMC FINANCE",
      amount: 1500,
      dueDate: new Date("2026-12-31T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Draft" },
    });
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-PENDING", PromissoryNoteStatus.ACTIVE, {
      debtorName: "DEMO DEBTOR PENDING",
      debtorIdNumber: "DEMO-DEBTOR-002",
      issuerName: "DEMO IMC FINANCE",
      amount: 2750,
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Pending Signature" },
    });
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-SIGNED", PromissoryNoteStatus.SETTLED, {
      debtorName: "DEMO DEBTOR SIGNED",
      debtorIdNumber: "DEMO-DEBTOR-003",
      issuerName: "DEMO IMC FINANCE",
      amount: 4300,
      dueDate: new Date("2026-10-31T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Signed" },
    });
  } else {
    console.log("  ! Skipping promissory note demo records: table public.promissory_notes is not available.");
  }

  const dischargeCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-DR-001",
    caseType: CaseType.DISCHARGE_REFUSAL,
    status: CaseStatus.IN_PROGRESS,
    title: "DEMO Discharge Refusal Validation Case",
    patientName: "DEMO PATIENT DISCHARGE",
    patientIdNumber: "DEMO-NID-DR-001",
    medicalRecordNo: "DEMO-MRN-DR-001",
    metadata: { demoRecord: true, module: "discharge-refusal" },
  });

  if (await tableExists("discharge_refusal_cases")) {
    const dischargeExisting = await prisma.dischargeRefusalCase.findFirst({
      where: { tenantId, caseId: dischargeCase.id },
      select: { id: true },
    });
    if (!dischargeExisting) {
      await prisma.dischargeRefusalCase.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          caseId: dischargeCase.id,
          dischargeStatus: "demo_refusal_recorded",
          dischargeAlternative: "DEMO_HOME_CARE",
          signatureMethod: "demo_witness_acknowledgment",
        },
      });
    }
  } else {
    console.log("  ! Skipping discharge refusal demo records: table public.discharge_refusal_cases is not available.");
  }
}

async function main() {
  console.log("[pilot-seed] Provisioning controlled pilot accounts and module validation records...\n");

  await ensurePasswordResetSchema();

  const platformTenantId = await ensureTenant(DEMO_PLATFORM_TENANT);
  const demoImcTenantId = await ensureTenant(DEMO_IMC_TENANT);

  let demoActorUserId = null;

  for (const userDef of DEMO_USERS) {
    const tenantId = userDef.tenantCode === DEMO_IMC_TENANT.code
      ? demoImcTenantId
      : platformTenantId;

    const userId = await seedUser(userDef, tenantId);
    if (userDef.role === "legal_admin") {
      demoActorUserId = userId;
    }
  }

  await ensureDemoModuleData(demoImcTenantId, demoActorUserId);

  console.log("\n[pilot-seed] Pilot accounts provisioned successfully.");
  console.log("[pilot-seed] Canonical login identifiers:");
  for (const u of DEMO_USERS) {
    console.log(`  - ${u.email} (${u.label})`);
  }
  console.log("[pilot-seed] Password delivery remains outside source control and must follow the secure internal channel.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
