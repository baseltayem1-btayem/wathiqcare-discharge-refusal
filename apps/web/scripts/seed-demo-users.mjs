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

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `FATAL: ${name} is required. Demo seed scripts must not use hardcoded passwords. ` +
        "Set a strong demo password in the environment and retry."
    );
  }
  return value;
}

const DEMO_DEFAULT_PASSWORD = requireEnv("DEMO_DEFAULT_PASSWORD");
const PILOT_DEFAULT_PASSWORD = requireEnv("PILOT_DEFAULT_PASSWORD");

/**
 * Unified password for IMC doctor / physician pilot accounts.
 * Can be overridden via IMC_DOCTOR_PILOT_PASSWORD env var; defaults to the
 * canonical pilot doctor password requested for the IMC Preview.
 */
const IMC_DOCTOR_PILOT_PASSWORD =
  process.env.IMC_DOCTOR_PILOT_PASSWORD?.trim() || "IMC@imc2026";

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

const DEMO_PLATFORM_TENANT = {
  code: "wathiqcare-demo-platform",
  domain: "wathiqcare.local",
  name: "WathiqCare DEMO Platform",
};

const DEMO_IMC_TENANT = {
  code: "demo-imc",
  domain: "demo-imc.local",
  name: "DEMO IMC Tenant",
};

const PILOT_IMC_TENANT = {
  code: "pilot-imc",
  domain: "wathiqcare.med.sa",
  name: "WathiqCare IMC Pilot Tenant",
  allowedDomains: ["wathiqcare.med.sa", "wathiqcare.online"],
};

const PILOT_PASSWORD = PILOT_DEFAULT_PASSWORD;

const DEMO_USERS = [
  {
    email: "demo.platform.admin@wathiqcare.local",
    fullName: "DEMO Platform Admin",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Platform Admin",
    role: "platform_admin",
    userType: "PLATFORM_ADMIN",
    tenantCode: DEMO_PLATFORM_TENANT.code,
  },
  {
    email: "demo.legal.affairs@demo-imc.local",
    fullName: "DEMO Legal Affairs User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Legal Affairs User",
    role: "legal_admin",
    userType: "TENANT_ADMIN",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.doctor@demo-imc.local",
    fullName: "DEMO Doctor User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Doctor User",
    role: "doctor",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.nurse@demo-imc.local",
    fullName: "DEMO Nurse User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Nurse User",
    role: "nursing",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.medical.director@demo-imc.local",
    fullName: "DEMO Medical Director User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Medical Director User",
    role: "medical_director",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.compliance@demo-imc.local",
    fullName: "DEMO Quality Compliance User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Quality / Compliance User",
    role: "compliance",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.finance@demo-imc.local",
    fullName: "DEMO Finance Admin User",
    password: DEMO_DEFAULT_PASSWORD,
    label: "Finance / Authorized Admin User",
    role: "finance_officer",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
];

const PILOT_USERS = [
  {
    email: "dr.ahmed@wathiqcare.med.sa",
    fullName: "Dr. Ahmed Pilot Physician",
    password: IMC_DOCTOR_PILOT_PASSWORD,
    label: "Pilot Physician",
    role: "doctor",
    userType: "TENANT_USER",
    tenantCode: PILOT_IMC_TENANT.code,
  },
  {
    email: "medicaldirector@wathiqcare.med.sa",
    fullName: "Pilot Medical Director",
    password: PILOT_PASSWORD,
    label: "Medical Director",
    role: "medical_director",
    userType: "TENANT_USER",
    tenantCode: PILOT_IMC_TENANT.code,
  },
  {
    email: "nursingsupervisor@wathiqcare.med.sa",
    fullName: "Pilot Nursing Supervisor",
    password: PILOT_PASSWORD,
    label: "Nursing Supervisor",
    role: "nursing",
    userType: "TENANT_USER",
    tenantCode: PILOT_IMC_TENANT.code,
  },
  {
    email: "legalreviewer@wathiqcare.med.sa",
    fullName: "Pilot Legal Reviewer",
    password: PILOT_PASSWORD,
    label: "Legal Reviewer",
    role: "legal_admin",
    userType: "TENANT_USER",
    tenantCode: PILOT_IMC_TENANT.code,
  },
  {
    email: "compliance@wathiqcare.med.sa",
    fullName: "Pilot Compliance Reviewer",
    password: PILOT_PASSWORD,
    label: "Compliance Reviewer",
    role: "compliance",
    userType: "TENANT_USER",
    tenantCode: PILOT_IMC_TENANT.code,
  },
];

const PILOT_MRN_CASES = [
  {
    caseNumber: "IMC-UAT-02000",
    medicalRecordNo: "IMC-2026-02000",
    patientIdNumber: "PILOT-NID-02000",
    patientName: "أحمد خالد العتيبي | Ahmed Khalid Al-Otaibi",
    title: "Pilot Informed Consent Case 1",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    module: "informed-consents",
  },
  {
    caseNumber: "IMC-UAT-02001",
    medicalRecordNo: "IMC-2026-02001",
    patientIdNumber: "PILOT-NID-02001",
    patientName: "فاطمة علي الحربي | Fatimah Ali Al-Harbi",
    title: "Pilot Informed Consent Case 2",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    module: "informed-consents",
  },
  {
    caseNumber: "IMC-UAT-02002",
    medicalRecordNo: "IMC-2026-02002",
    patientIdNumber: "PILOT-NID-02002",
    patientName: "محمد سعد الدوسري | Mohammed Saad Al-Dosari",
    title: "Pilot Informed Consent Case 3",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    module: "informed-consents",
  },
  {
    caseNumber: "IMC-UAT-02003",
    medicalRecordNo: "IMC-2026-02003",
    patientIdNumber: "PILOT-NID-02003",
    patientName: "لولوة ناصر القحطاني | Lolwah Nasser Al-Qahtani",
    title: "Pilot Discharge Refusal Case 1",
    caseType: CaseType.DISCHARGE_REFUSAL,
    status: CaseStatus.IN_PROGRESS,
    module: "discharge-refusal",
  },
  {
    caseNumber: "IMC-UAT-02004",
    medicalRecordNo: "IMC-2026-02004",
    patientIdNumber: "PILOT-NID-02004",
    patientName: "عبدالرحمن يوسف الشهري | Abdulrahman Yousif Al-Shahri",
    title: "Pilot Discharge Refusal Case 2",
    caseType: CaseType.DISCHARGE_REFUSAL,
    status: CaseStatus.IN_PROGRESS,
    module: "discharge-refusal",
  },
  {
    caseNumber: "IMC-UAT-02005",
    medicalRecordNo: "IMC-2026-02005",
    patientIdNumber: "PILOT-NID-02005",
    patientName: "نورة إبراهيم العمري | Noura Ibrahim Al-Amri",
    title: "Pilot Discharge Refusal Case 3",
    caseType: CaseType.DISCHARGE_REFUSAL,
    status: CaseStatus.IN_PROGRESS,
    module: "discharge-refusal",
  },
  {
    caseNumber: "IMC-UAT-02010",
    medicalRecordNo: "IMC-2026-02010",
    patientIdNumber: "PILOT-NID-02010",
    patientName: "تركي منصور الدهام | Turki Mansour Al-Daham",
    title: "Pilot Promissory Note Case 1",
    caseType: CaseType.GENERAL,
    status: CaseStatus.OPEN,
    module: "promissory-notes",
  },
  {
    caseNumber: "IMC-UAT-02015",
    medicalRecordNo: "IMC-2026-02015",
    patientIdNumber: "PILOT-NID-02015",
    patientName: "سارة عبدالله العنزي | Sarah Abdullah Al-Anzi",
    title: "Pilot Promissory Note Case 2",
    caseType: CaseType.GENERAL,
    status: CaseStatus.OPEN,
    module: "promissory-notes",
  },
  {
    caseNumber: "IMC-UAT-02020",
    medicalRecordNo: "IMC-2026-02020",
    patientIdNumber: "PILOT-NID-02020",
    patientName: "مازن فهد السبيعي | Mazen Fahad Al-Subaie",
    title: "Pilot Promissory Note Case 3",
    caseType: CaseType.GENERAL,
    status: CaseStatus.OPEN,
    module: "promissory-notes",
  },
  {
    caseNumber: "IMC-UAT-02024",
    medicalRecordNo: "IMC-2026-02024",
    patientIdNumber: "PILOT-NID-02024",
    patientName: "ريم عادل الشمري | Reem Adel Al-Shammari",
    title: "Pilot Governance Validation Case",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    module: "governance",
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

  const allowedDomains = [tenantDef.domain, ...(tenantDef.allowedDomains ?? [])]
    .map((domain) => (domain || "").trim().toLowerCase())
    .filter(Boolean);

  for (const domain of Array.from(new Set(allowedDomains))) {
    await ensureAllowedDomain(tenant.id, domain);
  }

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
  const hashedPassword = await hashPassword(userDef.password);

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
        lastPasswordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await prisma.$executeRaw`
      UPDATE users
      SET password_reset_required = FALSE,
          session_revoked_at = NULL
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
      lastPasswordChangedAt: new Date(),
    },
  });

  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
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

async function ensurePilotUatData(tenantId, actorUserId) {
  const seededCases = [];
  for (const seed of PILOT_MRN_CASES) {
    const pilotCase = await ensureCase(tenantId, actorUserId, {
      caseNumber: seed.caseNumber,
      caseType: seed.caseType,
      status: seed.status,
      title: seed.title,
      patientName: seed.patientName,
      patientIdNumber: seed.patientIdNumber,
      medicalRecordNo: seed.medicalRecordNo,
      metadata: {
        pilotRecord: true,
        module: seed.module,
        patientNameAr: seed.patientName.split("|")[0]?.trim() ?? "",
        patientNameEn: seed.patientName.split("|")[1]?.trim() ?? seed.patientName,
      },
    });
    seededCases.push({ seed, pilotCase });
  }

  if (await tableExists("consent_records")) {
    for (const seeded of seededCases.filter((entry) => entry.seed.module === "informed-consents")) {
      await ensureConsentRecord(tenantId, seeded.pilotCase.id, "signed", {
        consentMethod: ConsentMethod.ELECTRONIC_SIGNATURE,
        documentVersion: `pilot-${seeded.seed.medicalRecordNo}`,
        witnessName: "Pilot Witness",
        procedure: "Pilot informed consent workflow validation",
      });
    }
  } else {
    console.log("  ! Skipping pilot informed consent records: table public.consent_records is not available.");
  }

  if (await tableExists("discharge_refusal_cases")) {
    for (const seeded of seededCases.filter((entry) => entry.seed.module === "discharge-refusal")) {
      const exists = await prisma.dischargeRefusalCase.findFirst({
        where: { tenantId, caseId: seeded.pilotCase.id },
        select: { id: true },
      });
      if (!exists) {
        await prisma.dischargeRefusalCase.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: seeded.pilotCase.id,
            dischargeStatus: "pilot_refusal_recorded",
            dischargeAlternative: "PILOT_HOME_CARE",
            signatureMethod: "pilot_secure_acknowledgment",
          },
        });
      }
    }
  } else {
    console.log("  ! Skipping pilot discharge refusal records: table public.discharge_refusal_cases is not available.");
  }

  if (await tableExists("promissory_notes")) {
    for (const seeded of seededCases.filter((entry) => entry.seed.module === "promissory-notes")) {
      await ensurePromissoryNote(
        tenantId,
        seeded.pilotCase.id,
        `PN-${seeded.seed.medicalRecordNo}`,
        PromissoryNoteStatus.ACTIVE,
        {
          debtorName: seeded.seed.patientName.split("|")[1]?.trim() ?? seeded.seed.patientName,
          debtorIdNumber: seeded.seed.patientIdNumber,
          issuerName: "WathiqCare Pilot Finance",
          amount: 2500,
          dueDate: new Date("2026-12-31T00:00:00.000Z"),
          metadata: {
            pilotRecord: true,
            medicalRecordNo: seeded.seed.medicalRecordNo,
            demoDisplayStatus: "Pending Signature",
          },
          documentVersion: `pilot-${seeded.seed.medicalRecordNo}`,
        },
      );
    }
  } else {
    console.log("  ! Skipping pilot promissory records: table public.promissory_notes is not available.");
  }
}

async function main() {
  console.log("[demo-seed] Provisioning controlled demo accounts and demo module records...\n");

  await ensurePasswordResetSchema();

  const platformTenantId = await ensureTenant(DEMO_PLATFORM_TENANT);
  const demoImcTenantId = await ensureTenant(DEMO_IMC_TENANT);
  const pilotImcTenantId = await ensureTenant(PILOT_IMC_TENANT);

  let demoActorUserId = null;
  let pilotActorUserId = null;

  for (const userDef of DEMO_USERS) {
    const tenantId = userDef.tenantCode === DEMO_IMC_TENANT.code
      ? demoImcTenantId
      : platformTenantId;

    const userId = await seedUser(userDef, tenantId);
    if (userDef.role === "legal_admin") {
      demoActorUserId = userId;
    }
  }

  for (const userDef of PILOT_USERS) {
    const userId = await seedUser(userDef, pilotImcTenantId);
    if (userDef.role === "legal_admin") {
      pilotActorUserId = userId;
    }
  }

  await ensureDemoModuleData(demoImcTenantId, demoActorUserId);
  await ensurePilotUatData(pilotImcTenantId, pilotActorUserId ?? demoActorUserId);

  console.log("\n[demo-seed] Demo accounts provisioned successfully.");
  console.log("[demo-seed] Canonical login identifiers:");
  for (const u of DEMO_USERS) {
    console.log(`  - ${u.email} (${u.label})`);
  }
  console.log("[demo-seed] Canonical pilot UAT login identifiers:");
  for (const u of PILOT_USERS) {
    console.log(`  - ${u.email} (${u.label})`);
  }
  console.log("[demo-seed] Demo accounts are provisioned with controlled credentials and ready for module validation.");
  console.log("[demo-seed] Rotate the credentials through your normal operational process if you re-purpose them.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
