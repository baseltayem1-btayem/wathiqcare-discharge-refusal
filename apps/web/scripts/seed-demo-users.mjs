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

const ENTERPRISE_DEPARTMENTS = [
  { code: "EMERGENCY", name: "Emergency / الطوارئ" },
  { code: "INPATIENT", name: "Inpatient / التنويم" },
  { code: "NURSING", name: "Nursing / التمريض" },
  { code: "LEGAL_AFFAIRS", name: "Legal Affairs / الشؤون القانونية" },
  { code: "FINANCE", name: "Finance / المالية" },
  { code: "QUALITY", name: "Quality / الجودة" },
  { code: "COMPLIANCE", name: "Compliance / الامتثال" },
  { code: "RISK", name: "Risk Management / إدارة المخاطر" },
];

const TENANT_ROLE_TEMPLATES = {
  legal_admin: {
    name: "Legal Affairs",
    description: "Enterprise legal governance, review, escalation, and evidence ownership.",
  },
  doctor: {
    name: "Physician",
    description: "Clinical workflow ownership, patient education, and signature authority.",
  },
  nursing: {
    name: "Nurse",
    description: "Operational workflow support, witness capture, and patient coordination.",
  },
  medical_director: {
    name: "Medical Director",
    description: "Clinical governance oversight with approval authority.",
  },
  compliance: {
    name: "Compliance",
    description: "Compliance review, audit visibility, and escalation oversight.",
  },
  finance_officer: {
    name: "Finance",
    description: "Financial approval authority and promissory note visibility.",
  },
  external_reviewer: {
    name: "External Reviewer",
    description: "Delegated external review and approval participation.",
  },
  read_only_auditor: {
    name: "Read-Only Auditor",
    description: "Read-only access to enterprise audit, reports, and final documents.",
  },
  quality: {
    name: "Quality Manager",
    description: "Quality governance oversight, approval visibility, and reporting access.",
  },
  risk_manager: {
    name: "Risk Officer",
    description: "Risk escalation monitoring, delegated approvals, and legal workflow oversight.",
  },
};

const DEMO_USERS = [
  {
    email: "demo.platform.admin@wathiqcare.local",
    fullName: "DEMO Platform Admin",
    password: "DemoPlatformAdmin@2026!",
    label: "Platform Admin",
    role: "platform_admin",
    userType: "PLATFORM_ADMIN",
    tenantCode: DEMO_PLATFORM_TENANT.code,
  },
  {
    email: "demo.legal.affairs@demo-imc.local",
    fullName: "DEMO Legal Affairs User",
    password: "DemoLegalAffairs@2026!",
    label: "Legal Affairs User",
    role: "legal_admin",
    userType: "TENANT_ADMIN",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.doctor@demo-imc.local",
    fullName: "DEMO Doctor User",
    password: "DemoDoctor@2026!",
    label: "Doctor User",
    role: "doctor",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.nurse@demo-imc.local",
    fullName: "DEMO Nurse User",
    password: "DemoNurse@2026!",
    label: "Nurse User",
    role: "nursing",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.medical.director@demo-imc.local",
    fullName: "DEMO Medical Director User",
    password: "DemoMedicalDirector@2026!",
    label: "Medical Director User",
    role: "medical_director",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.compliance@demo-imc.local",
    fullName: "DEMO Compliance User",
    password: "DemoCompliance@2026!",
    label: "Compliance User",
    role: "compliance",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.finance@demo-imc.local",
    fullName: "DEMO Finance Admin User",
    password: "DemoFinance@2026!",
    label: "Finance / Authorized Admin User",
    role: "finance_officer",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.external.reviewer@demo-imc.local",
    fullName: "DEMO External Reviewer User",
    password: "DemoExternalReviewer@2026!",
    label: "External Reviewer User",
    role: "external_reviewer",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.readonly.auditor@demo-imc.local",
    fullName: "DEMO Read-Only Auditor User",
    password: "DemoReadOnlyAuditor@2026!",
    label: "Read-Only Auditor User",
    role: "read_only_auditor",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.quality.manager@demo-imc.local",
    fullName: "DEMO Quality Manager User",
    password: "DemoQualityManager@2026!",
    label: "Quality Manager User",
    role: "quality",
    userType: "TENANT_USER",
    tenantCode: DEMO_IMC_TENANT.code,
  },
  {
    email: "demo.risk.officer@demo-imc.local",
    fullName: "DEMO Risk Officer User",
    password: "DemoRiskOfficer@2026!",
    label: "Risk Officer User",
    role: "risk_manager",
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
    quality: "VIEWER",
    risk_manager: "VIEWER",
    external_reviewer: "VIEWER",
    read_only_auditor: "VIEWER",
  };
  return map[appRole] ?? "MEMBER";
}

function buildStableHash(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function ensureDepartment(tenantId, department) {
  const existing = await prisma.department.findFirst({
    where: { tenantId, code: department.code },
    select: { id: true },
  });

  if (existing) {
    await prisma.department.update({
      where: { id: existing.id },
      data: { name: department.name, isActive: true },
    });
    return;
  }

  await prisma.department.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      code: department.code,
      name: department.name,
      isActive: true,
    },
  });
}

async function ensureTenantRoleAssignment(tenantId, userId, roleCode) {
  const template = TENANT_ROLE_TEMPLATES[roleCode];
  if (!template) {
    return;
  }

  const existingTenantRole = await prisma.tenantRole.findFirst({
    where: { tenantId, code: roleCode },
    select: { id: true },
  });

  const tenantRole = existingTenantRole
    ? await prisma.tenantRole.update({
        where: { id: existingTenantRole.id },
        data: {
          name: template.name,
          description: template.description,
          status: "ACTIVE",
          isTemplate: true,
        },
      })
    : await prisma.tenantRole.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          code: roleCode,
          name: template.name,
          description: template.description,
          status: "ACTIVE",
          isTemplate: true,
        },
      });

  const existingAssignment = await prisma.userRoleAssignment.findFirst({
    where: { tenantId, userId, tenantRoleId: tenantRole.id },
    select: { id: true },
  });

  if (existingAssignment) {
    await prisma.userRoleAssignment.update({
      where: { id: existingAssignment.id },
      data: { isPrimary: true },
    });
    return;
  }

  await prisma.userRoleAssignment.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      userId,
      tenantRoleId: tenantRole.id,
      isPrimary: true,
    },
  });
}

async function ensurePermissionFramework(tenantId) {
  const policyMatrix = {
    legal_admin: [
      ["legal-cases", "workflow", "review"],
      ["legal-documents", "document", "finalize"],
      ["approvals", "approval", "delegate"],
      ["discharge-refusal", "workflow", "escalate"],
    ],
    medical_director: [
      ["discharge-refusal", "workflow", "approve"],
      ["legal-cases", "workflow", "approve"],
      ["approvals", "approval", "approve"],
    ],
    finance_officer: [
      ["promissory-notes", "document", "approve"],
      ["legal-documents", "document", "read"],
      ["approvals", "approval", "approve"],
    ],
    compliance: [
      ["approvals", "approval", "hold"],
      ["risk-management", "audit", "read"],
      ["incident-reports", "report", "read"],
    ],
    quality: [
      ["informed-consents", "workflow", "review"],
      ["approvals", "approval", "clarify"],
      ["risk-management", "report", "read"],
    ],
    risk_manager: [
      ["discharge-refusal", "workflow", "escalate"],
      ["legal-cases", "workflow", "review"],
      ["risk-management", "risk", "manage"],
      ["approvals", "approval", "approve"],
    ],
    external_reviewer: [
      ["legal-cases", "workflow", "review"],
      ["approvals", "approval", "approve"],
      ["legal-documents", "document", "read"],
    ],
    read_only_auditor: [
      ["legal-documents", "document", "read"],
      ["risk-management", "audit", "read"],
      ["promissory-notes", "document", "read"],
    ],
  };

  for (const [roleCode, policies] of Object.entries(policyMatrix)) {
    const template = TENANT_ROLE_TEMPLATES[roleCode] ?? { name: roleCode, description: null };
    const existingPermissionRole = await prisma.permissionRole.findFirst({
      where: { tenantId, code: roleCode },
      select: { id: true },
    });
    const permissionRole = existingPermissionRole
      ? await prisma.permissionRole.update({
          where: { id: existingPermissionRole.id },
          data: {
            name: template.name,
            description: template.description,
            isSystem: true,
          },
        })
      : await prisma.permissionRole.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            code: roleCode,
            name: template.name,
            description: template.description,
            isSystem: true,
          },
        });

    for (const [moduleCode, resourceType, actionKey] of policies) {
      const existingPolicy = await prisma.permissionPolicy.findFirst({
        where: { tenantId, permissionRoleId: permissionRole.id, moduleCode, resourceType, actionKey },
        select: { id: true },
      });

      if (existingPolicy) {
        await prisma.permissionPolicy.update({
          where: { id: existingPolicy.id },
          data: { effect: "allow" },
        });
      } else {
        await prisma.permissionPolicy.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            permissionRoleId: permissionRole.id,
            moduleCode,
            resourceType,
            actionKey,
            effect: "allow",
          },
        });
      }
    }
  }
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
    await ensureTenantRoleAssignment(tenantId, existing.id, userDef.role);
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
  await ensureTenantRoleAssignment(tenantId, userId, userDef.role);

  console.log(`  ✓ Created demo account: ${userDef.email} (${userDef.label})`);
  return userId;
}

async function ensureCase(tenantId, createdByUserId, data) {
  return prisma.case.upsert({
    where: { tenantId_caseNumber: { tenantId, caseNumber: data.caseNumber } },
    update: {
      caseType: data.caseType,
      status: data.status,
      workflowType: data.workflowType,
      title: data.title,
      patientName: data.patientName,
      patientIdNumber: data.patientIdNumber,
      medicalRecordNo: data.medicalRecordNo,
      roomNumber: data.roomNumber ?? null,
      metadata: data.metadata,
      updatedByUserId: createdByUserId,
    },
    create: {
      id: crypto.randomUUID(),
      tenantId,
      caseNumber: data.caseNumber,
      caseType: data.caseType,
      status: data.status,
      workflowType: data.workflowType,
      title: data.title,
      patientName: data.patientName,
      patientIdNumber: data.patientIdNumber,
      medicalRecordNo: data.medicalRecordNo,
      roomNumber: data.roomNumber ?? null,
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

async function ensureDocumentRecord(tenantId, caseId, generatedByUserId, data) {
  const existing = await prisma.document.findFirst({
    where: { tenantId, documentCode: data.documentCode },
    select: { id: true },
  });

  const payload = {
    tenantId,
    caseId,
    documentType: data.documentType,
    status: data.status,
    documentCode: data.documentCode,
    titleEn: data.titleEn,
    titleAr: data.titleAr,
    templateKey: data.templateKey,
    versionLabel: data.versionLabel ?? "1.0",
    fileName: data.fileName,
    mimeType: data.mimeType ?? "application/pdf",
    storagePath: data.storagePath ?? null,
    previewHtml: data.previewHtml ?? null,
    payloadJson: data.payloadJson ?? {},
    sizeBytes: BigInt(data.sizeBytes ?? 0),
    generatedByUserId,
    signedByUserId: data.signedByUserId ?? null,
    signedAt: data.signedAt ?? null,
    metadata: data.metadata ?? null,
  };

  if (existing) {
    return prisma.document.update({ where: { id: existing.id }, data: payload });
  }

  return prisma.document.create({
    data: {
      id: crypto.randomUUID(),
      generatedAt: data.generatedAt ?? new Date(),
      ...payload,
    },
  });
}

async function ensureAuditLogRecord(tenantId, userId, data) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      tenantId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.auditLog.update({
      where: { id: existing.id },
      data: {
        userId,
        details: data.details ?? null,
        caseId: data.caseId ?? null,
        documentId: data.documentId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      userId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      details: data.details ?? null,
      caseId: data.caseId ?? null,
      documentId: data.documentId ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureWorkflowStateRecord(tenantId, data) {
  return prisma.workflowState.upsert({
    where: {
      tenantId_moduleCode_recordType_recordId: {
        tenantId,
        moduleCode: data.moduleCode,
        recordType: data.recordType,
        recordId: data.recordId,
      },
    },
    update: {
      workflowCode: data.workflowCode,
      currentState: data.currentState,
      previousState: data.previousState ?? null,
      isLocked: Boolean(data.isLocked),
      lockedAt: data.lockedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      slaDeadline: data.slaDeadline ?? null,
      escalatedAt: data.escalatedAt ?? null,
      metadataJson: data.metadataJson ?? null,
    },
    create: {
      id: crypto.randomUUID(),
      tenantId,
      moduleCode: data.moduleCode,
      recordType: data.recordType,
      recordId: data.recordId,
      workflowCode: data.workflowCode,
      currentState: data.currentState,
      previousState: data.previousState ?? null,
      isLocked: Boolean(data.isLocked),
      lockedAt: data.lockedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      slaDeadline: data.slaDeadline ?? null,
      escalatedAt: data.escalatedAt ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureWorkflowTransitionRecord(tenantId, workflowStateId, transitionKey, data) {
  const existing = await prisma.workflowTransition.findFirst({
    where: { tenantId, workflowStateId, transitionKey },
    select: { id: true },
  });

  if (existing) {
    return prisma.workflowTransition.update({
      where: { id: existing.id },
      data: {
        fromState: data.fromState,
        toState: data.toState,
        actorUserId: data.actorUserId ?? null,
        actorRole: data.actorRole ?? null,
        comments: data.comments ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.workflowTransition.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      workflowStateId,
      transitionKey,
      fromState: data.fromState,
      toState: data.toState,
      actorUserId: data.actorUserId ?? null,
      actorRole: data.actorRole ?? null,
      comments: data.comments ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureApprovalChainRecord(tenantId, workflowStateId, data) {
  const existing = await prisma.approvalChain.findFirst({
    where: { tenantId, moduleCode: data.moduleCode, recordId: data.recordId, chainCode: data.chainCode },
    select: { id: true },
  });

  if (existing) {
    return prisma.approvalChain.update({
      where: { id: existing.id },
      data: {
        workflowStateId,
        status: data.status,
        routingMode: data.routingMode,
        currentLevel: data.currentLevel ?? 0,
        delegatedFromUserId: data.delegatedFromUserId ?? null,
        delegatedToUserId: data.delegatedToUserId ?? null,
        escalatedAt: data.escalatedAt ?? null,
        slaDeadline: data.slaDeadline ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.approvalChain.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      workflowStateId,
      moduleCode: data.moduleCode,
      recordId: data.recordId,
      chainCode: data.chainCode,
      status: data.status,
      routingMode: data.routingMode,
      currentLevel: data.currentLevel ?? 0,
      delegatedFromUserId: data.delegatedFromUserId ?? null,
      delegatedToUserId: data.delegatedToUserId ?? null,
      escalatedAt: data.escalatedAt ?? null,
      slaDeadline: data.slaDeadline ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureApprovalActionRecord(tenantId, approvalChainId, actionKey, data) {
  const existing = await prisma.approvalAction.findFirst({
    where: { tenantId, approvalChainId, action: actionKey },
    select: { id: true },
  });

  if (existing) {
    return prisma.approvalAction.update({
      where: { id: existing.id },
      data: {
        decision: data.decision ?? null,
        actorUserId: data.actorUserId ?? null,
        actorRole: data.actorRole ?? null,
        comments: data.comments ?? null,
        delegatedFromUserId: data.delegatedFromUserId ?? null,
        delegatedToUserId: data.delegatedToUserId ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.approvalAction.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      approvalChainId,
      action: actionKey,
      decision: data.decision ?? null,
      actorUserId: data.actorUserId ?? null,
      actorRole: data.actorRole ?? null,
      comments: data.comments ?? null,
      delegatedFromUserId: data.delegatedFromUserId ?? null,
      delegatedToUserId: data.delegatedToUserId ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureAuditEventRecord(tenantId, data) {
  const existing = await prisma.auditEvent.findFirst({
    where: { tenantId, moduleCode: data.moduleCode, recordId: data.recordId, eventType: data.eventType },
    select: { id: true },
  });

  if (existing) {
    return prisma.auditEvent.update({
      where: { id: existing.id },
      data: {
        workflowStateId: data.workflowStateId ?? null,
        approvalChainId: data.approvalChainId ?? null,
        actorUserId: data.actorUserId ?? null,
        actorRole: data.actorRole ?? null,
        ipAddress: data.ipAddress ?? null,
        deviceInfo: data.deviceInfo ?? null,
        sessionInfo: data.sessionInfo ?? null,
        changeSetJson: data.changeSetJson ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.auditEvent.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      workflowStateId: data.workflowStateId ?? null,
      approvalChainId: data.approvalChainId ?? null,
      moduleCode: data.moduleCode,
      recordId: data.recordId,
      eventType: data.eventType,
      actorUserId: data.actorUserId ?? null,
      actorRole: data.actorRole ?? null,
      ipAddress: data.ipAddress ?? null,
      deviceInfo: data.deviceInfo ?? null,
      sessionInfo: data.sessionInfo ?? null,
      changeSetJson: data.changeSetJson ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureAuditChainEventRecord(tenantId, data) {
  const existing = await prisma.auditChainEvent.findFirst({
    where: { tenantId, caseId: data.caseId ?? null, eventType: data.eventType, payloadSummary: data.payloadSummary },
    select: { id: true },
  });

  const previousHash = data.previousHash ?? null;
  const currentHash = buildStableHash(`${tenantId}:${data.caseId ?? "none"}:${data.eventType}:${data.payloadSummary}`);

  if (existing) {
    return prisma.auditChainEvent.update({
      where: { id: existing.id },
      data: {
        actorId: data.actorId ?? null,
        actorRole: data.actorRole ?? null,
        sourceIp: data.sourceIp ?? null,
        deviceInfo: data.deviceInfo ?? null,
        sessionInfo: data.sessionInfo ?? null,
        previousHash,
        currentHash,
        documentVersion: data.documentVersion ?? null,
        metadataJson: data.metadataJson ?? null,
      },
    });
  }

  return prisma.auditChainEvent.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      caseId: data.caseId ?? null,
      eventType: data.eventType,
      actorId: data.actorId ?? null,
      actorRole: data.actorRole ?? null,
      sourceIp: data.sourceIp ?? null,
      deviceInfo: data.deviceInfo ?? null,
      sessionInfo: data.sessionInfo ?? null,
      previousHash,
      currentHash,
      payloadSummary: data.payloadSummary,
      documentVersion: data.documentVersion ?? null,
      metadataJson: data.metadataJson ?? null,
    },
  });
}

async function ensureDelegationRuleRecord(tenantId, approvalChainId, data) {
  const existing = await prisma.delegationRule.findFirst({
    where: {
      tenantId,
      approvalChainId: approvalChainId ?? null,
      moduleCode: data.moduleCode,
      delegatorUserId: data.delegatorUserId,
      delegateUserId: data.delegateUserId,
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.delegationRule.update({
      where: { id: existing.id },
      data: {
        startsAt: data.startsAt,
        endsAt: data.endsAt ?? null,
        reason: data.reason ?? null,
        isAuto: Boolean(data.isAuto),
        backupUserId: data.backupUserId ?? null,
      },
    });
  }

  return prisma.delegationRule.create({
    data: {
      id: crypto.randomUUID(),
      tenantId,
      approvalChainId: approvalChainId ?? null,
      permissionRoleId: data.permissionRoleId ?? null,
      moduleCode: data.moduleCode,
      delegatorUserId: data.delegatorUserId,
      delegateUserId: data.delegateUserId,
      backupUserId: data.backupUserId ?? null,
      startsAt: data.startsAt,
      endsAt: data.endsAt ?? null,
      reason: data.reason ?? null,
      isAuto: Boolean(data.isAuto),
    },
  });
}

async function ensureDemoModuleData(tenantId, userIds) {
  const legalAdminUserId = userIds.legal_admin ?? null;
  const doctorUserId = userIds.doctor ?? legalAdminUserId;
  const nurseUserId = userIds.nursing ?? legalAdminUserId;
  const medicalDirectorUserId = userIds.medical_director ?? legalAdminUserId;
  const financeUserId = userIds.finance_officer ?? legalAdminUserId;
  const complianceUserId = userIds.compliance ?? legalAdminUserId;
  const externalReviewerUserId = userIds.external_reviewer ?? legalAdminUserId;
  const readOnlyAuditorUserId = userIds.read_only_auditor ?? legalAdminUserId;
  const qualityManagerUserId = userIds.quality ?? complianceUserId;
  const riskOfficerUserId = userIds.risk_manager ?? complianceUserId;
  const actorUserId = legalAdminUserId ?? doctorUserId;

  if (await tableExists("departments")) {
    for (const department of ENTERPRISE_DEPARTMENTS) {
      await ensureDepartment(tenantId, department);
    }
  }

  if (await tableExists("permission_roles") && await tableExists("permission_policies")) {
    await ensurePermissionFramework(tenantId);
  }

  const consentCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-IC-001",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    workflowType: "informed-consents",
    title: "Bilingual informed consent / موافقة مستنيرة ثنائية اللغة",
    patientName: "Lina Omar / لينا عمر",
    patientIdNumber: "2468135790",
    medicalRecordNo: "IMC-IC-001",
    roomNumber: "ER-12",
    metadata: {
      demoRecord: true,
      module: "informed-consents",
      locale: ["ar", "en"],
      departments: ["EMERGENCY", "LEGAL_AFFAIRS"],
      workflowState: "ready_for_signature",
      signatureFlow: "patient + physician + witness",
    },
  });

  const promissoryCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-PN-001",
    caseType: CaseType.GENERAL,
    status: CaseStatus.OPEN,
    workflowType: "promissory-notes",
    title: "Promissory undertaking for discharge / تعهد مالي للخروج",
    patientName: "Maha Saeed / مها سعيد",
    patientIdNumber: "1357924680",
    medicalRecordNo: "IMC-PN-001",
    roomNumber: "FIN-04",
    metadata: {
      demoRecord: true,
      module: "promissory-notes",
      locale: ["ar", "en"],
      departments: ["FINANCE", "LEGAL_AFFAIRS"],
      workflowState: "awaiting_finance_approval",
      approvalMode: "sequential",
    },
  });

  const dischargeCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-DR-001",
    caseType: CaseType.DISCHARGE_REFUSAL,
    status: CaseStatus.IN_PROGRESS,
    workflowType: "discharge-refusal",
    title: "Discharge refusal escalation / تصعيد رفض الخروج",
    patientName: "Faisal Nasser / فيصل ناصر",
    patientIdNumber: "1122334455",
    medicalRecordNo: "IMC-DR-001",
    roomNumber: "MED-21",
    metadata: {
      demoRecord: true,
      module: "discharge-refusal",
      locale: ["ar", "en"],
      departments: ["NURSING", "QUALITY", "COMPLIANCE", "RISK"],
      workflowState: "escalated_medical_director",
      escalationReason: "High-risk discharge against medical advice",
    },
  });

  const legalCase = await ensureCase(tenantId, actorUserId, {
    caseNumber: "DEMO-LC-001",
    caseType: CaseType.GENERAL,
    status: CaseStatus.IN_PROGRESS,
    workflowType: "legal-cases",
    title: "Medication liability legal review / مراجعة قانونية لمسؤولية دوائية",
    patientName: "Salma Adel / سلمى عادل",
    patientIdNumber: "5566778899",
    medicalRecordNo: "IMC-LC-001",
    roomNumber: "LEG-03",
    metadata: {
      demoRecord: true,
      module: "legal-cases",
      locale: ["ar", "en"],
      departments: ["LEGAL_AFFAIRS", "QUALITY", "RISK"],
      workflowState: "delegated_external_review",
      delegationScenario: true,
    },
  });

  if (await tableExists("consent_records")) {
    await ensureConsentRecord(tenantId, consentCase.id, "draft", {
      consentMethod: ConsentMethod.WRITTEN,
      documentVersion: "demo-draft-ar-en",
      witnessName: "Huda Salem / هدى سالم",
      procedure: "Laparoscopic cholecystectomy / استئصال المرارة بالمنظار",
    });
    await ensureConsentRecord(tenantId, consentCase.id, "pending_signature", {
      consentMethod: ConsentMethod.OTP,
      documentVersion: "demo-pending-signature",
      otpReference: "OTP-IC-2026-001",
      witnessName: "Huda Salem / هدى سالم",
      procedure: "Laparoscopic cholecystectomy / استئصال المرارة بالمنظار",
    });
    await ensureConsentRecord(tenantId, consentCase.id, "signed", {
      consentMethod: ConsentMethod.ELECTRONIC_SIGNATURE,
      documentVersion: "demo-final-signed",
      witnessName: "Huda Salem / هدى سالم",
      procedure: "Laparoscopic cholecystectomy / استئصال المرارة بالمنظار",
    });
  }

  if (await tableExists("promissory_notes")) {
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-DRAFT", PromissoryNoteStatus.DRAFT, {
      debtorName: "Maha Saeed / مها سعيد",
      debtorIdNumber: "PN-DEBTOR-001",
      issuerName: "IMC Finance / مالية المركز الطبي الدولي",
      amount: 1500,
      dueDate: new Date("2026-12-31T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Draft", language: "bilingual" },
    });
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-PENDING", PromissoryNoteStatus.ACTIVE, {
      debtorName: "Maha Saeed / مها سعيد",
      debtorIdNumber: "PN-DEBTOR-002",
      issuerName: "IMC Finance / مالية المركز الطبي الدولي",
      amount: 2750,
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Pending Signature", language: "bilingual" },
    });
    await ensurePromissoryNote(tenantId, promissoryCase.id, "DEMO-PN-SIGNED", PromissoryNoteStatus.SETTLED, {
      debtorName: "Maha Saeed / مها سعيد",
      debtorIdNumber: "PN-DEBTOR-003",
      issuerName: "IMC Finance / مالية المركز الطبي الدولي",
      amount: 4300,
      dueDate: new Date("2026-10-31T00:00:00.000Z"),
      metadata: { demoRecord: true, demoDisplayStatus: "Signed", language: "bilingual" },
    });
  }

  let dischargeRefusalRecord = null;
  if (await tableExists("discharge_refusal_cases")) {
    const existing = await prisma.dischargeRefusalCase.findFirst({
      where: { tenantId, caseId: dischargeCase.id },
      select: { id: true },
    });

    if (existing) {
      dischargeRefusalRecord = await prisma.dischargeRefusalCase.update({
        where: { id: existing.id },
        data: {
          dischargeStatus: "patient_refused_after_escalation",
          dischargeAlternative: "HOME_CARE_WITH_RISK_ESCALATION",
          rightsAcknowledgmentDocPath: "staging://demo/discharge-refusal/rights-acknowledgment.pdf",
          refusalFormDocPath: "staging://demo/discharge-refusal/refusal-form.pdf",
          signatureMethod: "witness_acknowledgment",
          signatureTimestamp: new Date("2026-04-15T11:30:00.000Z"),
          signatureDevice: "staging-tablet-01",
          signatureIpAddress: "10.10.10.15",
          signatureHash: buildStableHash(`discharge:${dischargeCase.id}`),
        },
      });
    } else {
      dischargeRefusalRecord = await prisma.dischargeRefusalCase.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          caseId: dischargeCase.id,
          dischargeStatus: "patient_refused_after_escalation",
          dischargeAlternative: "HOME_CARE_WITH_RISK_ESCALATION",
          rightsAcknowledgmentDocPath: "staging://demo/discharge-refusal/rights-acknowledgment.pdf",
          refusalFormDocPath: "staging://demo/discharge-refusal/refusal-form.pdf",
          signatureMethod: "witness_acknowledgment",
          signatureTimestamp: new Date("2026-04-15T11:30:00.000Z"),
          signatureDevice: "staging-tablet-01",
          signatureIpAddress: "10.10.10.15",
          signatureHash: buildStableHash(`discharge:${dischargeCase.id}`),
        },
      });
    }

    if (await tableExists("home_care_plans")) {
      const existingHomeCare = await prisma.homeCarePlan.findFirst({
        where: { tenantId, dischargeRefusalCaseId: dischargeRefusalRecord.id },
        select: { id: true },
      });
      if (existingHomeCare) {
        await prisma.homeCarePlan.update({
          where: { id: existingHomeCare.id },
          data: {
            caseId: dischargeCase.id,
            careType: "Skilled nursing + medication reconciliation",
            equipmentRequired: ["Walker", "Pulse oximeter"],
            careProvider: "IMC Home Care Team / فريق الرعاية المنزلية",
            agreementDocPath: "staging://demo/discharge-refusal/home-care-agreement.pdf",
          },
        });
      } else {
        await prisma.homeCarePlan.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: dischargeCase.id,
            dischargeRefusalCaseId: dischargeRefusalRecord.id,
            careType: "Skilled nursing + medication reconciliation",
            equipmentRequired: ["Walker", "Pulse oximeter"],
            careProvider: "IMC Home Care Team / فريق الرعاية المنزلية",
            agreementDocPath: "staging://demo/discharge-refusal/home-care-agreement.pdf",
          },
        });
      }
    }

    if (await tableExists("equipment_requests")) {
      const existingEquipment = await prisma.equipmentRequest.findFirst({
        where: { tenantId, dischargeRefusalCaseId: dischargeRefusalRecord.id, requestedEquipment: "Portable oxygen concentrator" },
        select: { id: true },
      });
      if (existingEquipment) {
        await prisma.equipmentRequest.update({
          where: { id: existingEquipment.id },
          data: {
            caseId: dischargeCase.id,
            department: "Nursing / التمريض",
            status: "approved",
            requestDocPath: "staging://demo/discharge-refusal/equipment-request.pdf",
            temporaryApprovalDocPath: "staging://demo/discharge-refusal/equipment-approval.pdf",
          },
        });
      } else {
        await prisma.equipmentRequest.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: dischargeCase.id,
            dischargeRefusalCaseId: dischargeRefusalRecord.id,
            requestedEquipment: "Portable oxygen concentrator",
            department: "Nursing / التمريض",
            status: "approved",
            requestDocPath: "staging://demo/discharge-refusal/equipment-request.pdf",
            temporaryApprovalDocPath: "staging://demo/discharge-refusal/equipment-approval.pdf",
          },
        });
      }
    }

    if (await tableExists("transfer_requests")) {
      const existingTransfer = await prisma.transferRequest.findFirst({
        where: { tenantId, dischargeRefusalCaseId: dischargeRefusalRecord.id, receivingHospital: "King Faisal Specialist Hospital" },
        select: { id: true },
      });
      if (existingTransfer) {
        await prisma.transferRequest.update({
          where: { id: existingTransfer.id },
          data: {
            caseId: dischargeCase.id,
            transferReason: "Fallback escalation path / مسار تصعيد بديل",
            medicalStabilityConfirmation: true,
            authorizationDocPath: "staging://demo/discharge-refusal/transfer-authorization.pdf",
          },
        });
      } else {
        await prisma.transferRequest.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: dischargeCase.id,
            dischargeRefusalCaseId: dischargeRefusalRecord.id,
            receivingHospital: "King Faisal Specialist Hospital",
            transferReason: "Fallback escalation path / مسار تصعيد بديل",
            medicalStabilityConfirmation: true,
            authorizationDocPath: "staging://demo/discharge-refusal/transfer-authorization.pdf",
          },
        });
      }
    }

    if (await tableExists("patient_financial_liability")) {
      const existingLiability = await prisma.patientFinancialLiability.findFirst({
        where: { tenantId, dischargeRefusalCaseId: dischargeRefusalRecord.id },
        select: { id: true },
      });
      if (existingLiability) {
        await prisma.patientFinancialLiability.update({
          where: { id: existingLiability.id },
          data: {
            caseId: dischargeCase.id,
            noticeDocPath: "staging://demo/discharge-refusal/financial-liability.pdf",
            accepted: true,
            signedAt: new Date("2026-04-15T11:45:00.000Z"),
            signatureMethod: "tablet_signature",
            signatureHash: buildStableHash(`financial-liability:${dischargeCase.id}`),
          },
        });
      } else {
        await prisma.patientFinancialLiability.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: dischargeCase.id,
            dischargeRefusalCaseId: dischargeRefusalRecord.id,
            noticeDocPath: "staging://demo/discharge-refusal/financial-liability.pdf",
            accepted: true,
            signedAt: new Date("2026-04-15T11:45:00.000Z"),
            signatureMethod: "tablet_signature",
            signatureHash: buildStableHash(`financial-liability:${dischargeCase.id}`),
          },
        });
      }
    }
  }

  if (await tableExists("documents")) {
    const informedConsentDocument = await ensureDocumentRecord(tenantId, consentCase.id, doctorUserId, {
      documentType: "OTHER",
      status: "SIGNED",
      documentCode: "DEMO-DOC-IC-001",
      titleEn: "Bilingual informed consent package",
      titleAr: "حزمة الموافقة المستنيرة الثنائية اللغة",
      templateKey: "enterprise-informed-consent",
      versionLabel: "2026.04",
      fileName: "demo-informed-consent.pdf",
      storagePath: "staging://demo/informed-consents/demo-informed-consent.pdf",
      signedByUserId: doctorUserId,
      signedAt: new Date("2026-04-15T10:15:00.000Z"),
      sizeBytes: 421734,
      payloadJson: { qrReference: "IC-QR-001", immutable: true, signatures: 3 },
      metadata: { demoRecord: true, legalPackage: true, locale: "bilingual" },
    });

    const dischargeDocument = await ensureDocumentRecord(tenantId, dischargeCase.id, legalAdminUserId, {
      documentType: "DISCHARGE_REFUSAL_FORM",
      status: "GENERATED",
      documentCode: "DEMO-DOC-DR-001",
      titleEn: "Discharge refusal legal package",
      titleAr: "الحزمة القانونية لرفض الخروج",
      templateKey: "enterprise-discharge-refusal",
      versionLabel: "2026.04",
      fileName: "demo-discharge-refusal.pdf",
      storagePath: "staging://demo/discharge-refusal/demo-discharge-refusal.pdf",
      sizeBytes: 368912,
      payloadJson: { qrReference: "DR-QR-001", immutable: false, escalation: true },
      metadata: { demoRecord: true, module: "discharge-refusal", locale: "bilingual" },
    });

    const promissoryDocument = await ensureDocumentRecord(tenantId, promissoryCase.id, financeUserId, {
      documentType: "FINANCIAL_RESPONSIBILITY_NOTICE",
      status: "SIGNED",
      documentCode: "DEMO-DOC-PN-001",
      titleEn: "Promissory note package",
      titleAr: "حزمة السند لأمر",
      templateKey: "enterprise-promissory-note",
      versionLabel: "2026.04",
      fileName: "demo-promissory-note.pdf",
      storagePath: "staging://demo/promissory-notes/demo-promissory-note.pdf",
      signedByUserId: financeUserId,
      signedAt: new Date("2026-04-16T09:00:00.000Z"),
      sizeBytes: 245112,
      payloadJson: { qrReference: "PN-QR-001", immutable: true, signatures: 2 },
      metadata: { demoRecord: true, module: "promissory-notes", locale: "bilingual" },
    });

    const legalDocument = await ensureDocumentRecord(tenantId, legalCase.id, legalAdminUserId, {
      documentType: "CASE_FILE",
      status: "ARCHIVED",
      documentCode: "DEMO-DOC-LC-001",
      titleEn: "Legal case review package",
      titleAr: "حزمة مراجعة القضية القانونية",
      templateKey: "enterprise-legal-case-review",
      versionLabel: "2026.04",
      fileName: "demo-legal-case-review.pdf",
      storagePath: "staging://demo/legal-cases/demo-legal-case-review.pdf",
      signedByUserId: externalReviewerUserId,
      signedAt: new Date("2026-04-17T13:10:00.000Z"),
      sizeBytes: 512804,
      payloadJson: { qrReference: "LC-QR-001", immutable: true, signatures: 2 },
      metadata: { demoRecord: true, module: "legal-cases", locale: "bilingual" },
    });

    if (await tableExists("audit_logs")) {
      await ensureAuditLogRecord(tenantId, doctorUserId, {
        entityType: "document",
        entityId: informedConsentDocument.id,
        action: "generated",
        details: "Seeded bilingual informed consent PDF for sandbox UAT.",
        caseId: consentCase.id,
        documentId: informedConsentDocument.id,
      });
      await ensureAuditLogRecord(tenantId, legalAdminUserId, {
        entityType: "document",
        entityId: dischargeDocument.id,
        action: "generated",
        details: "Seeded discharge refusal legal package.",
        caseId: dischargeCase.id,
        documentId: dischargeDocument.id,
      });
      await ensureAuditLogRecord(tenantId, financeUserId, {
        entityType: "document",
        entityId: promissoryDocument.id,
        action: "signed",
        details: "Seeded promissory note evidence package.",
        caseId: promissoryCase.id,
        documentId: promissoryDocument.id,
      });
      await ensureAuditLogRecord(tenantId, legalAdminUserId, {
        entityType: "document",
        entityId: legalDocument.id,
        action: "archived",
        details: "Seeded legal review archive package with immutable reference.",
        caseId: legalCase.id,
        documentId: legalDocument.id,
      });
    }
  }

  if (await tableExists("legal_readiness_checks")) {
    const existingLegalReadiness = await prisma.legalReadinessCheck.findFirst({
      where: { tenantId, caseId: legalCase.id },
      select: { id: true },
    });

    const legalReadinessPayload = {
      status: "COMPLIANT",
      canFinalize: true,
      checklistJson: {
        bilingualSummary: true,
        delegatedReviewRecorded: true,
        auditEvidenceComplete: true,
      },
      blockersJson: [],
      checkedByUserId: legalAdminUserId,
      checkedAt: new Date("2026-04-17T13:20:00.000Z"),
    };

    if (existingLegalReadiness) {
      await prisma.legalReadinessCheck.update({
        where: { id: existingLegalReadiness.id },
        data: legalReadinessPayload,
      });
    } else {
      await prisma.legalReadinessCheck.create({
        data: {
          id: crypto.randomUUID(),
          tenantId,
          caseId: legalCase.id,
          ...legalReadinessPayload,
        },
      });
    }
  }

  if (await tableExists("workflow_states")) {
    const consentWorkflow = await ensureWorkflowStateRecord(tenantId, {
      moduleCode: "informed-consents",
      recordType: "case",
      recordId: consentCase.id,
      workflowCode: "enterprise-informed-consent",
      currentState: "ready_for_signature",
      previousState: "legal_review_complete",
      slaDeadline: new Date("2026-04-15T12:00:00.000Z"),
      metadataJson: { demoRecord: true, mobileReady: true, arabic: true },
    });

    const dischargeWorkflow = await ensureWorkflowStateRecord(tenantId, {
      moduleCode: "discharge-refusal",
      recordType: "case",
      recordId: dischargeCase.id,
      workflowCode: "enterprise-discharge-refusal",
      currentState: "escalated_medical_director",
      previousState: "pending_compliance_review",
      slaDeadline: new Date("2026-04-15T13:00:00.000Z"),
      escalatedAt: new Date("2026-04-15T11:00:00.000Z"),
      metadataJson: { demoRecord: true, escalationScenario: true, mobileReady: true },
    });

    const promissoryWorkflow = await ensureWorkflowStateRecord(tenantId, {
      moduleCode: "promissory-notes",
      recordType: "case",
      recordId: promissoryCase.id,
      workflowCode: "enterprise-promissory-note",
      currentState: "awaiting_finance_signature",
      previousState: "legal_approved",
      slaDeadline: new Date("2026-04-16T12:00:00.000Z"),
      metadataJson: { demoRecord: true, signatureFlow: true, pdfReady: true },
    });

    const legalWorkflow = await ensureWorkflowStateRecord(tenantId, {
      moduleCode: "legal-cases",
      recordType: "case",
      recordId: legalCase.id,
      workflowCode: "enterprise-legal-review",
      currentState: "delegated_external_review",
      previousState: "legal_triage",
      slaDeadline: new Date("2026-04-17T15:00:00.000Z"),
      escalatedAt: new Date("2026-04-17T12:15:00.000Z"),
      metadataJson: { demoRecord: true, delegationScenario: true, externalReview: true },
    });

    await ensureWorkflowTransitionRecord(tenantId, consentWorkflow.id, "submit_for_legal_review", {
      fromState: "draft",
      toState: "legal_review_complete",
      actorUserId: doctorUserId,
      actorRole: "doctor",
      comments: "Clinical wording finalized for legal readiness.",
    });
    await ensureWorkflowTransitionRecord(tenantId, consentWorkflow.id, "collect_signature", {
      fromState: "legal_review_complete",
      toState: "ready_for_signature",
      actorUserId: nurseUserId,
      actorRole: "nursing",
      comments: "Patient and witness guided through bilingual signature flow.",
    });

    await ensureWorkflowTransitionRecord(tenantId, dischargeWorkflow.id, "compliance_review", {
      fromState: "clinical_documented",
      toState: "pending_compliance_review",
      actorUserId: complianceUserId,
      actorRole: "compliance",
      comments: "Compliance review recorded before medical escalation.",
    });
    await ensureWorkflowTransitionRecord(tenantId, dischargeWorkflow.id, "medical_escalation", {
      fromState: "pending_compliance_review",
      toState: "escalated_medical_director",
      actorUserId: riskOfficerUserId,
      actorRole: "risk_manager",
      comments: "High-risk refusal escalated to medical director.",
    });

    await ensureWorkflowTransitionRecord(tenantId, promissoryWorkflow.id, "legal_clearance", {
      fromState: "draft",
      toState: "legal_approved",
      actorUserId: legalAdminUserId,
      actorRole: "legal_admin",
      comments: "Legal team approved the financial wording.",
    });
    await ensureWorkflowTransitionRecord(tenantId, promissoryWorkflow.id, "finance_signature", {
      fromState: "legal_approved",
      toState: "awaiting_finance_signature",
      actorUserId: financeUserId,
      actorRole: "finance_officer",
      comments: "Finance review moved the package to signing.",
    });

    await ensureWorkflowTransitionRecord(tenantId, legalWorkflow.id, "delegate_external_review", {
      fromState: "legal_triage",
      toState: "delegated_external_review",
      actorUserId: legalAdminUserId,
      actorRole: "legal_admin",
      comments: "External reviewer delegated for independent opinion.",
    });

    if (await tableExists("approval_chains")) {
      const consentApproval = await ensureApprovalChainRecord(tenantId, consentWorkflow.id, {
        moduleCode: "informed-consents",
        recordId: consentCase.id,
        chainCode: "DEMO-CONSENT-CHAIN",
        status: "APPROVED",
        routingMode: "SEQUENTIAL",
        currentLevel: 3,
        metadataJson: { approvers: ["doctor", "legal_admin", "quality"] },
      });
      const dischargeApproval = await ensureApprovalChainRecord(tenantId, dischargeWorkflow.id, {
        moduleCode: "discharge-refusal",
        recordId: dischargeCase.id,
        chainCode: "DEMO-DISCHARGE-CHAIN",
        status: "ESCALATED",
        routingMode: "SEQUENTIAL",
        currentLevel: 2,
        delegatedToUserId: medicalDirectorUserId,
        escalatedAt: new Date("2026-04-15T11:00:00.000Z"),
        metadataJson: { approvers: ["compliance", "medical_director"], escalationScenario: true },
      });
      const promissoryApproval = await ensureApprovalChainRecord(tenantId, promissoryWorkflow.id, {
        moduleCode: "promissory-notes",
        recordId: promissoryCase.id,
        chainCode: "DEMO-PROMISSORY-CHAIN",
        status: "APPROVED",
        routingMode: "SEQUENTIAL",
        currentLevel: 2,
        metadataJson: { approvers: ["legal_admin", "finance_officer"] },
      });
      const legalApproval = await ensureApprovalChainRecord(tenantId, legalWorkflow.id, {
        moduleCode: "legal-cases",
        recordId: legalCase.id,
        chainCode: "DEMO-LEGAL-CHAIN",
        status: "DELEGATED",
        routingMode: "SEQUENTIAL",
        currentLevel: 2,
        delegatedFromUserId: legalAdminUserId,
        delegatedToUserId: externalReviewerUserId,
        escalatedAt: new Date("2026-04-17T12:15:00.000Z"),
        metadataJson: { approvers: ["legal_admin", "external_reviewer", "read_only_auditor"], delegated: true },
      });

      await ensureApprovalActionRecord(tenantId, consentApproval.id, "quality_review", {
        decision: "approved",
        actorUserId: qualityManagerUserId,
        actorRole: "quality",
        comments: "Quality checkpoint passed.",
      });
      await ensureApprovalActionRecord(tenantId, dischargeApproval.id, "medical_director_escalation", {
        decision: "pending",
        actorUserId: medicalDirectorUserId,
        actorRole: "medical_director",
        comments: "Awaiting final medical director confirmation.",
        delegatedToUserId: medicalDirectorUserId,
      });
      await ensureApprovalActionRecord(tenantId, promissoryApproval.id, "finance_signoff", {
        decision: "approved",
        actorUserId: financeUserId,
        actorRole: "finance_officer",
        comments: "Financial undertaking approved and signed.",
      });
      await ensureApprovalActionRecord(tenantId, legalApproval.id, "external_reviewer_opinion", {
        decision: "approved",
        actorUserId: externalReviewerUserId,
        actorRole: "external_reviewer",
        comments: "Independent review completed with no additional blockers.",
        delegatedFromUserId: legalAdminUserId,
        delegatedToUserId: externalReviewerUserId,
      });

      if (await tableExists("delegation_rules")) {
        const externalPermissionRole = await prisma.permissionRole.findFirst({
          where: { tenantId, code: "external_reviewer" },
          select: { id: true },
        });

        await ensureDelegationRuleRecord(tenantId, legalApproval.id, {
          permissionRoleId: externalPermissionRole?.id ?? null,
          moduleCode: "legal-cases",
          delegatorUserId: legalAdminUserId,
          delegateUserId: externalReviewerUserId,
          backupUserId: readOnlyAuditorUserId,
          startsAt: new Date("2026-04-17T12:00:00.000Z"),
          endsAt: new Date("2026-04-19T12:00:00.000Z"),
          reason: "Independent external review required for enterprise sandbox certification.",
          isAuto: false,
        });
      }

      if (await tableExists("audit_events")) {
        await ensureAuditEventRecord(tenantId, {
          workflowStateId: consentWorkflow.id,
          approvalChainId: consentApproval.id,
          moduleCode: "informed-consents",
          recordId: consentCase.id,
          eventType: "signature_completed",
          actorUserId: doctorUserId,
          actorRole: "doctor",
          ipAddress: "10.20.1.15",
          deviceInfo: "staging-ipad-consent",
          sessionInfo: "sandbox-consent-session",
          metadataJson: { demoRecord: true, pdfGenerated: true, notificationSent: true },
        });
        await ensureAuditEventRecord(tenantId, {
          workflowStateId: dischargeWorkflow.id,
          approvalChainId: dischargeApproval.id,
          moduleCode: "discharge-refusal",
          recordId: dischargeCase.id,
          eventType: "workflow_escalated",
          actorUserId: riskOfficerUserId,
          actorRole: "risk_manager",
          ipAddress: "10.20.2.22",
          deviceInfo: "staging-mobile-risk",
          sessionInfo: "sandbox-discharge-session",
          metadataJson: { demoRecord: true, escalationScenario: true },
        });
        await ensureAuditEventRecord(tenantId, {
          workflowStateId: promissoryWorkflow.id,
          approvalChainId: promissoryApproval.id,
          moduleCode: "promissory-notes",
          recordId: promissoryCase.id,
          eventType: "pdf_finalized",
          actorUserId: financeUserId,
          actorRole: "finance_officer",
          ipAddress: "10.20.3.11",
          deviceInfo: "staging-finance-desktop",
          sessionInfo: "sandbox-promissory-session",
          metadataJson: { demoRecord: true, immutablePdf: true },
        });
        await ensureAuditEventRecord(tenantId, {
          workflowStateId: legalWorkflow.id,
          approvalChainId: legalApproval.id,
          moduleCode: "legal-cases",
          recordId: legalCase.id,
          eventType: "delegated_review_completed",
          actorUserId: externalReviewerUserId,
          actorRole: "external_reviewer",
          ipAddress: "10.20.4.30",
          deviceInfo: "staging-external-review",
          sessionInfo: "sandbox-legal-session",
          metadataJson: { demoRecord: true, delegationScenario: true, readOnlyAuditorVisible: true },
        });
      }
    }

    if (await tableExists("audit_chain_events")) {
      const consentHash = await ensureAuditChainEventRecord(tenantId, {
        caseId: consentCase.id,
        eventType: "consent_pdf_signed",
        actorId: doctorUserId,
        actorRole: "doctor",
        sourceIp: "10.20.1.15",
        deviceInfo: "staging-ipad-consent",
        sessionInfo: "sandbox-consent-session",
        payloadSummary: "Consent package signed with physician, patient, and witness evidence.",
        documentVersion: "2026.04",
        metadataJson: { demoRecord: true, qrReference: "IC-QR-001" },
      });
      const dischargeHash = await ensureAuditChainEventRecord(tenantId, {
        caseId: dischargeCase.id,
        eventType: "discharge_escalated",
        actorId: riskOfficerUserId,
        actorRole: "risk_manager",
        sourceIp: "10.20.2.22",
        deviceInfo: "staging-mobile-risk",
        sessionInfo: "sandbox-discharge-session",
        previousHash: consentHash.currentHash,
        payloadSummary: "Discharge refusal escalated to medical director with compliance evidence.",
        documentVersion: "2026.04",
        metadataJson: { demoRecord: true, escalationScenario: true },
      });
      const promissoryHash = await ensureAuditChainEventRecord(tenantId, {
        caseId: promissoryCase.id,
        eventType: "promissory_finalized",
        actorId: financeUserId,
        actorRole: "finance_officer",
        sourceIp: "10.20.3.11",
        deviceInfo: "staging-finance-desktop",
        sessionInfo: "sandbox-promissory-session",
        previousHash: dischargeHash.currentHash,
        payloadSummary: "Promissory note finalized with bilingual PDF evidence and QR reference.",
        documentVersion: "2026.04",
        metadataJson: { demoRecord: true, qrReference: "PN-QR-001" },
      });
      await ensureAuditChainEventRecord(tenantId, {
        caseId: legalCase.id,
        eventType: "external_review_archived",
        actorId: externalReviewerUserId,
        actorRole: "external_reviewer",
        sourceIp: "10.20.4.30",
        deviceInfo: "staging-external-review",
        sessionInfo: "sandbox-legal-session",
        previousHash: promissoryHash.currentHash,
        payloadSummary: "External legal review archived with immutable evidence package.",
        documentVersion: "2026.04",
        metadataJson: { demoRecord: true, qrReference: "LC-QR-001" },
      });
    }
  }

  if (await tableExists("operation_notifications")) {
    const notificationRecords = [
      {
        caseId: consentCase.id,
        recipientUserId: nurseUserId,
        triggeredByUserId: doctorUserId,
        eventType: "consent_ready_for_signature",
        title: "Consent ready for bedside signature",
        message: "The bilingual informed consent package is ready for patient signature on mobile.",
      },
      {
        caseId: dischargeCase.id,
        recipientUserId: medicalDirectorUserId,
        triggeredByUserId: riskOfficerUserId,
        eventType: "discharge_refusal_escalated",
        title: "Discharge refusal escalated",
        message: "A high-risk discharge refusal case requires medical director review.",
      },
      {
        caseId: legalCase.id,
        recipientUserId: externalReviewerUserId,
        triggeredByUserId: legalAdminUserId,
        eventType: "external_review_requested",
        title: "External legal review requested",
        message: "A delegated legal review package is ready in the sandbox workspace.",
      },
    ];

    for (const notification of notificationRecords) {
      const existing = await prisma.operationNotification.findFirst({
        where: {
          tenantId,
          caseId: notification.caseId,
          recipientUserId: notification.recipientUserId,
          eventType: notification.eventType,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.operationNotification.update({
          where: { id: existing.id },
          data: {
            triggeredByUserId: notification.triggeredByUserId,
            channel: "IN_APP",
            title: notification.title,
            message: notification.message,
            status: "SENT",
            sentAt: new Date("2026-04-17T13:30:00.000Z"),
            metadata: { demoRecord: true, deliveryMode: "mock" },
          },
        });
      } else {
        await prisma.operationNotification.create({
          data: {
            id: crypto.randomUUID(),
            tenantId,
            caseId: notification.caseId,
            recipientUserId: notification.recipientUserId,
            triggeredByUserId: notification.triggeredByUserId,
            channel: "IN_APP",
            eventType: notification.eventType,
            title: notification.title,
            message: notification.message,
            status: "SENT",
            sentAt: new Date("2026-04-17T13:30:00.000Z"),
            metadata: { demoRecord: true, deliveryMode: "mock" },
          },
        });
      }
    }
  }
}

async function main() {
  console.log("[demo-seed] Provisioning controlled demo accounts and demo module records...\n");

  await ensurePasswordResetSchema();

  const platformTenantId = await ensureTenant(DEMO_PLATFORM_TENANT);
  const demoImcTenantId = await ensureTenant(DEMO_IMC_TENANT);

  const demoUserIds = {};

  for (const userDef of DEMO_USERS) {
    const tenantId = userDef.tenantCode === DEMO_IMC_TENANT.code
      ? demoImcTenantId
      : platformTenantId;

    const userId = await seedUser(userDef, tenantId);
    demoUserIds[userDef.role] = userId;
  }

  await ensureDemoModuleData(demoImcTenantId, demoUserIds);

  console.log("\n[demo-seed] Demo accounts provisioned successfully.");
  console.log("[demo-seed] Canonical login identifiers:");
  for (const u of DEMO_USERS) {
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
