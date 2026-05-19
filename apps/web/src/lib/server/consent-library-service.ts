import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  ConsentAlertLevel,
  ConsentCommitteeType,
  ConsentDocumentStatus,
  ConsentEvidenceCopyType,
  ConsentMethod,
  ConsentReviewDecision,
  ConsentRiskClass,
  ConsentRiskSeverity,
  ConsentSectionKind,
  ConsentSignatureRole,
  ConsentTemplateStatus,
} from "@/lib/server/prisma-enums";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";
import { hasInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

const prisma = () => getPrisma();

export const CONSENT_TYPE_OPTIONS = [
  "GENERAL_CONSENT",
  "PROCEDURE_SPECIFIC_CONSENT",
  "SURGERY_CONSENT",
  "ENDOSCOPY_CONSENT",
  "ANESTHESIA_CONSENT",
  "BLOOD_TRANSFUSION_CONSENT",
  "SEDATION_CONSENT",
  "HIGH_RISK_PROCEDURE_CONSENT",
  "REFUSAL_OF_TREATMENT",
  "DAMA_REFUSAL_OF_DISCHARGE",
  "RESEARCH_CLINICAL_TRIAL_CONSENT",
  "RADIOLOGY_CONTRAST_CONSENT",
  "DENTAL_CONSENT",
  "CUSTOM",
] as const;

export const SPECIALTY_OPTIONS = [
  "SURGERY",
  "ENT",
  "GASTROENTEROLOGY",
  "CARDIOLOGY",
  "ORTHOPEDICS",
  "ONCOLOGY",
  "ICU",
  "RADIOLOGY",
  "OBSTETRICS_GYNECOLOGY",
  "PEDIATRICS",
  "DENTAL",
  "ANESTHESIA",
  "EMERGENCY_MEDICINE",
  "GENERAL_MEDICINE",
] as const;

const RISK_CLASS_ORDER: ConsentRiskClass[] = [
  ConsentRiskClass.COMMON,
  ConsentRiskClass.LESS_COMMON,
  ConsentRiskClass.RARE,
  ConsentRiskClass.SERIOUS,
  ConsentRiskClass.LIFE_THREATENING,
];

const DEFAULT_AI_WARNING_AR = "AI-assisted draft pending physician validation.";
const DEFAULT_AI_WARNING_EN = "AI-assisted draft pending physician validation.";
const DEFAULT_GENERATOR_MODEL = "gpt-5.3-codex";

type GovernanceEditableBy = "PHYSICIAN" | "AI_ASSIST" | "SYSTEM" | "GOVERNANCE";

type FieldGovernanceRule = {
  editableBy: GovernanceEditableBy;
  aiAllowed: boolean;
  requiresApproval: boolean;
  auditRequired: boolean;
  bilingualSyncRequired: boolean;
};

type BilingualSyncIssueCode =
  | "missing_language"
  | "mismatch"
  | "inconsistent_approval"
  | "orphan_wording";

type BilingualSyncIssue = {
  code: BilingualSyncIssueCode;
  field: string;
  message: string;
};

const FIXED_CLAUSE_FIELDS = [
  "legalTextAr",
  "legalTextEn",
  "pdplTextAr",
  "pdplTextEn",
  "witnessDeclAr",
  "witnessDeclEn",
  "physicianCertAr",
  "physicianCertEn",
] as const;

const BILINGUAL_FIELD_PAIRS: Array<{ ar: string; en: string; label: string }> = [
  { ar: "legalTextAr", en: "legalTextEn", label: "legal_text" },
  { ar: "pdplTextAr", en: "pdplTextEn", label: "pdpl_text" },
  { ar: "witnessDeclAr", en: "witnessDeclEn", label: "witness_declaration" },
  { ar: "physicianCertAr", en: "physicianCertEn", label: "physician_certification" },
  { ar: "aiWarningAr", en: "aiWarningEn", label: "ai_warning" },
  { ar: "wordingAr", en: "wordingEn", label: "wording_repository" },
];

const AI_EDITABLE_FIELDS = new Set([
  "diagnosis",
  "plannedProcedure",
  "procedureDetails",
  "physicianSpecialty",
  "risksAr",
  "risksEn",
  "sideEffectsAr",
  "sideEffectsEn",
  "alternativesAr",
  "alternativesEn",
  "refusalRisksAr",
  "refusalRisksEn",
  "expectedOutcomesAr",
  "expectedOutcomesEn",
  "physicianNotesAr",
  "physicianNotesEn",
]);

const PROHIBITED_AI_FIELDS = new Set([
  ...FIXED_CLAUSE_FIELDS,
  "status",
  "approvedAt",
  "approvedByUserId",
  "finalizedAt",
  "finalizedByUserId",
  "immutablePdfHash",
  "auditChecksum",
  "documentVersion",
]);

const DYNAMIC_FIELD_GOVERNANCE: Record<string, FieldGovernanceRule> = {
  diagnosis: {
    editableBy: "PHYSICIAN",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: false,
  },
  plannedProcedure: {
    editableBy: "PHYSICIAN",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: false,
  },
  procedureDetails: {
    editableBy: "PHYSICIAN",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: false,
  },
  physicianNotesAr: {
    editableBy: "PHYSICIAN",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  physicianNotesEn: {
    editableBy: "PHYSICIAN",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  risksAr: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  risksEn: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  sideEffectsAr: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  sideEffectsEn: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  alternativesAr: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  alternativesEn: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  refusalRisksAr: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  refusalRisksEn: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  expectedOutcomesAr: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
  expectedOutcomesEn: {
    editableBy: "AI_ASSIST",
    aiAllowed: true,
    requiresApproval: true,
    auditRequired: true,
    bilingualSyncRequired: true,
  },
};

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function sanitizeAiText(value: string | null | undefined): string {
  return normalizeText(value)
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .slice(0, 10000);
}

function hasHallucinationSignal(value: string | null | undefined): boolean {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }
  return /\b(as an ai|language model|cannot provide|i (?:cannot|can'?t) verify|placeholder)\b/.test(normalized);
}

function computeFixedClauseChecksum(input: Record<string, unknown>): string {
  const payload: Record<string, string> = {};
  for (const field of FIXED_CLAUSE_FIELDS) {
    payload[field] = normalizeText(input[field] as string | null | undefined);
  }
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function validateBilingualSync(args: {
  record: Record<string, unknown>;
  expectedVersion?: string | null;
  status?: string | null;
  requireApprovedPair?: boolean;
}): BilingualSyncIssue[] {
  const issues: BilingualSyncIssue[] = [];

  for (const pair of BILINGUAL_FIELD_PAIRS) {
    const arValue = normalizeText(args.record[pair.ar] as string | null | undefined);
    const enValue = normalizeText(args.record[pair.en] as string | null | undefined);
    if (Boolean(arValue) !== Boolean(enValue)) {
      issues.push({
        code: "missing_language",
        field: pair.label,
        message: `${pair.label}: Arabic/English pair is incomplete`,
      });
    }
  }

  const approvedBy = normalizeText(args.record.approvedByUserId as string | null | undefined);
  const approvedAt = args.record.approvedAt;
  const isApprovedLike = ["APPROVED", "ACTIVE"].includes((args.status || "").toUpperCase());

  if (isApprovedLike && (!approvedBy || !approvedAt)) {
    issues.push({
      code: "inconsistent_approval",
      field: "approval",
      message: "Approved wording requires approver and approval timestamp",
    });
  }

  const version = normalizeText((args.record.versionLabel || args.record.documentVersion) as string | null | undefined);
  if (args.expectedVersion && version && normalizeText(args.expectedVersion) !== version) {
    issues.push({
      code: "mismatch",
      field: "version",
      message: `Version mismatch detected (expected ${args.expectedVersion}, got ${version})`,
    });
  }

  if (args.requireApprovedPair && isApprovedLike) {
    for (const pair of BILINGUAL_FIELD_PAIRS.slice(0, 4)) {
      const arValue = normalizeText(args.record[pair.ar] as string | null | undefined);
      const enValue = normalizeText(args.record[pair.en] as string | null | undefined);
      if (!arValue || !enValue) {
        issues.push({
          code: "orphan_wording",
          field: pair.label,
          message: `${pair.label}: approved record has orphan wording in one language`,
        });
      }
    }
  }

  return issues;
}

function resolveSectionGovernance(
  sectionKind: ConsentSectionKind,
  isEditableByPhysician: boolean,
): FieldGovernanceRule {
  if (sectionKind === ConsentSectionKind.FIXED_LEGAL) {
    return {
      editableBy: "GOVERNANCE",
      aiAllowed: false,
      requiresApproval: true,
      auditRequired: true,
      bilingualSyncRequired: true,
    };
  }

  if (sectionKind === ConsentSectionKind.DYNAMIC_MEDICAL) {
    return {
      editableBy: isEditableByPhysician ? "PHYSICIAN" : "SYSTEM",
      aiAllowed: true,
      requiresApproval: true,
      auditRequired: true,
      bilingualSyncRequired: true,
    };
  }

  return {
    editableBy: "SYSTEM",
    aiAllowed: false,
    requiresApproval: false,
    auditRequired: true,
    bilingualSyncRequired: false,
  };
}

function buildDocumentWordingSnapshot(args: {
  doc: {
    legalTextAr: string;
    legalTextEn: string;
    pdplTextAr: string;
    pdplTextEn: string;
    witnessDeclAr: string;
    witnessDeclEn: string;
    physicianCertAr: string;
    physicianCertEn: string;
    documentVersion: string | null;
  };
  templateVersion: {
    id: string;
    versionLabel: string;
    versionNumber: number;
    approvedByUserId: string | null;
    approvedAt: Date | null;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
  };
  status: string;
}): Record<string, unknown> {
  const fixedClausePayload: Record<string, unknown> = {
    legalTextAr: args.doc.legalTextAr,
    legalTextEn: args.doc.legalTextEn,
    pdplTextAr: args.doc.pdplTextAr,
    pdplTextEn: args.doc.pdplTextEn,
    witnessDeclAr: args.doc.witnessDeclAr,
    witnessDeclEn: args.doc.witnessDeclEn,
    physicianCertAr: args.doc.physicianCertAr,
    physicianCertEn: args.doc.physicianCertEn,
  };

  return {
    schema: "consent_wording_snapshot_v2",
    status: args.status,
    capturedAt: new Date().toISOString(),
    version: {
      documentVersion: args.doc.documentVersion,
      templateVersionId: args.templateVersion.id,
      versionLabel: args.templateVersion.versionLabel,
      versionNumber: args.templateVersion.versionNumber,
    },
    approval: {
      approvedByUserId: args.templateVersion.approvedByUserId,
      approvedAt: args.templateVersion.approvedAt ? args.templateVersion.approvedAt.toISOString() : null,
      effectiveFrom: args.templateVersion.effectiveFrom ? args.templateVersion.effectiveFrom.toISOString() : null,
      effectiveTo: args.templateVersion.effectiveTo ? args.templateVersion.effectiveTo.toISOString() : null,
    },
    fixedClauses: fixedClausePayload,
    checksum: computeFixedClauseChecksum(fixedClausePayload),
  };
}

function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  return auth.tenant_id;
}

function ensureArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function nowIsoStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function generateReference(prefix: string): string {
  const tail = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${nowIsoStamp()}-${tail}`;
}

function normalizeConsentMethod(value: string | null | undefined): ConsentMethod {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === ConsentMethod.OTP) return ConsentMethod.OTP;
  if (normalized === ConsentMethod.WITNESS_ACKNOWLEDGMENT) return ConsentMethod.WITNESS_ACKNOWLEDGMENT;
  if (normalized === ConsentMethod.WRITTEN) return ConsentMethod.WRITTEN;
  return ConsentMethod.ELECTRONIC_SIGNATURE;
}

function normalizeSignatureRole(value: string | null | undefined): ConsentSignatureRole {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === ConsentSignatureRole.PHYSICIAN) return ConsentSignatureRole.PHYSICIAN;
  if (normalized === ConsentSignatureRole.WITNESS) return ConsentSignatureRole.WITNESS;
  if (normalized === ConsentSignatureRole.INTERPRETER) return ConsentSignatureRole.INTERPRETER;
  if (normalized === ConsentSignatureRole.GUARDIAN) return ConsentSignatureRole.GUARDIAN;
  return ConsentSignatureRole.PATIENT;
}

function normalizeRiskClass(value: string | null | undefined): ConsentRiskClass {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === ConsentRiskClass.LESS_COMMON) return ConsentRiskClass.LESS_COMMON;
  if (normalized === ConsentRiskClass.RARE) return ConsentRiskClass.RARE;
  if (normalized === ConsentRiskClass.SERIOUS) return ConsentRiskClass.SERIOUS;
  if (normalized === ConsentRiskClass.LIFE_THREATENING) return ConsentRiskClass.LIFE_THREATENING;
  return ConsentRiskClass.COMMON;
}

function normalizeRiskSeverity(value: string | null | undefined): ConsentRiskSeverity {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === ConsentRiskSeverity.MEDIUM) return ConsentRiskSeverity.MEDIUM;
  if (normalized === ConsentRiskSeverity.HIGH) return ConsentRiskSeverity.HIGH;
  if (normalized === ConsentRiskSeverity.CRITICAL) return ConsentRiskSeverity.CRITICAL;
  return ConsentRiskSeverity.LOW;
}

function normalizeAlertLevel(value: string | null | undefined): ConsentAlertLevel {
  const normalized = (value || "").trim().toUpperCase();
  if (normalized === ConsentAlertLevel.WARNING) return ConsentAlertLevel.WARNING;
  if (normalized === ConsentAlertLevel.HIGH_ALERT) return ConsentAlertLevel.HIGH_ALERT;
  if (normalized === ConsentAlertLevel.LEGAL_CRITICAL) return ConsentAlertLevel.LEGAL_CRITICAL;
  return ConsentAlertLevel.INFO;
}

async function writeConsentAudit(args: {
  tenantId: string;
  auth: AuthContext;
  action: string;
  summary: string;
  source?: string;
  consentDocumentId?: string;
  templateId?: string;
  templateVersionId?: string;
  caseId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}) {
  await prisma().consentAuditEvent.create({
    data: {
      tenantId: args.tenantId,
      consentDocumentId: args.consentDocumentId,
      templateId: args.templateId,
      templateVersionId: args.templateVersionId,
      action: args.action,
      source: args.source,
      actorUserId: args.auth.sub,
      actorRole: args.auth.role || null,
      summary: args.summary,
      metadata: args.metadata as JsonInputValue | undefined,
    },
  });

  await writeAuditLog({
    tenantId: args.tenantId,
    userId: args.auth.sub,
    entityType: "consent_library",
    entityId: args.consentDocumentId || args.templateVersionId || args.templateId || args.tenantId,
    action: args.action,
    details: args.summary,
    caseId: args.caseId,
    metadataJson: {
      source: args.source || "consent-library",
      templateId: args.templateId || null,
      templateVersionId: args.templateVersionId || null,
      consentDocumentId: args.consentDocumentId || null,
      ...(args.metadata || {}),
    },
    request: args.request,
  });

  await appendAuditChainEvent({
    tenantId: args.tenantId,
    caseId: args.caseId || null,
    eventType: args.action.toUpperCase(),
    actorId: args.auth.sub,
    actorRole: args.auth.role || null,
    payloadSummary: args.summary,
    documentVersion: undefined,
    metadataJson: {
      consentDocumentId: args.consentDocumentId || null,
      templateId: args.templateId || null,
      templateVersionId: args.templateVersionId || null,
      ...(args.metadata || {}),
    },
    request: args.request,
  }).catch(() => undefined);

  if (args.consentDocumentId) {
    await prisma().consentTimelineEvent.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.consentDocumentId,
        action: args.action,
        actorUserId: args.auth.sub,
        actorRole: args.auth.role || null,
        deviceInfo: args.request?.headers.get("sec-ch-ua-platform") || null,
        ipAddress: args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        userAgent: args.request?.headers.get("user-agent") || null,
        metadata: (args.metadata || {}) as JsonInputValue,
      },
    });
  }
}

export type CreateConsentTemplatePayload = {
  categoryCode?: string;
  categoryNameAr?: string;
  categoryNameEn?: string;
  templateCode?: string;
  consentType?: string;
  specialty?: string;
  department?: string;
  titleAr?: string;
  titleEn?: string;
  summaryAr?: string;
  summaryEn?: string;
  legalTextAr?: string;
  legalTextEn?: string;
  pdplTextAr?: string;
  pdplTextEn?: string;
  witnessDeclAr?: string;
  witnessDeclEn?: string;
  physicianCertAr?: string;
  physicianCertEn?: string;
  aiWarningAr?: string;
  aiWarningEn?: string;
  sections?: Array<{
    sectionKey?: string;
    sectionKind?: string;
    titleAr?: string;
    titleEn?: string;
    contentAr?: string;
    contentEn?: string;
    isRequired?: boolean;
    isEditableByPhysician?: boolean;
    sortOrder?: number;
  }>;
};

export async function listConsentLibrary(auth: AuthContext) {
  const tenantId = requireTenantId(auth);

  const [categories, templates, prompts, promptRegistry, wordingRepository, procedures] = await Promise.all([
    prisma().consentCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
    prisma().consentTemplate.findMany({
      where: { tenantId },
      include: {
        category: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma().consentAIPrompt.findMany({
      where: { tenantId },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma().consentPromptRegistry.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
    prisma().consentWordingRepository.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    }),
    prisma().consentProcedureCatalog.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ specialty: "asc" }, { nameEn: "asc" }],
      include: {
        riskItems: { orderBy: [{ sortOrder: "asc" }] },
      },
      take: 300,
    }),
  ]);

  const syncIssues: BilingualSyncIssue[] = [];
  for (const wording of wordingRepository) {
    syncIssues.push(
      ...validateBilingualSync({
        record: {
          wordingAr: wording.wordingAr,
          wordingEn: wording.wordingEn,
          approvedByUserId: wording.approvedByUserId,
          approvedAt: wording.approvedAt,
          versionLabel: "repository",
        },
        status: wording.approvedByUserId ? "APPROVED" : "DRAFT",
        requireApprovedPair: true,
      }).map((issue) => ({
        ...issue,
        message: `${issue.message} (wording:${wording.id})`,
      })),
    );
  }

  for (const template of templates) {
    const latestVersion = template.versions[0];
    if (!latestVersion) {
      continue;
    }
    syncIssues.push(
      ...validateBilingualSync({
        record: latestVersion as unknown as Record<string, unknown>,
        status: latestVersion.status,
        requireApprovedPair: true,
      }).map((issue) => ({
        ...issue,
        message: `${issue.message} (template:${template.templateCode})`,
      })),
    );
  }

  return {
    categories,
    templates,
    prompts,
    promptRegistry,
    wordingRepository,
    procedures,
    consentTypeOptions: CONSENT_TYPE_OPTIONS,
    specialtyOptions: SPECIALTY_OPTIONS,
    riskClassOptions: RISK_CLASS_ORDER,
    governance: {
      bilingualSync: {
        ok: syncIssues.length === 0,
        issues: syncIssues,
      },
    },
  };
}

export async function createConsentTemplate(
  auth: AuthContext,
  payload: CreateConsentTemplatePayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const categoryCode = (payload.categoryCode || "GENERAL").trim().toUpperCase();
  const templateCode = (payload.templateCode || generateReference("CT")).trim().toUpperCase();
  const consentType = (payload.consentType || "GENERAL_CONSENT").trim().toUpperCase();
  const specialty = (payload.specialty || "GENERAL_MEDICINE").trim();

  if (!specialty) {
    throw new ApiError(400, "specialty is required");
  }

  const category = await prisma().consentCategory.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code: categoryCode,
      },
    },
    update: {
      nameAr: (payload.categoryNameAr || categoryCode).trim(),
      nameEn: (payload.categoryNameEn || categoryCode).trim(),
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      code: categoryCode,
      nameAr: (payload.categoryNameAr || categoryCode).trim(),
      nameEn: (payload.categoryNameEn || categoryCode).trim(),
    },
  });

  const created = await prisma().$transaction(async (tx) => {
    const template = await tx.consentTemplate.create({
      data: {
        tenantId,
        categoryId: category.id,
        templateCode,
        consentType,
        specialty,
        department: payload.department?.trim() || null,
        status: ConsentTemplateStatus.DRAFT,
        titleAr: (payload.titleAr || "Ù†Ù…ÙˆØ°Ø¬ Ù…ÙˆØ§ÙÙ‚Ø© Ø·Ø¨ÙŠØ©").trim(),
        titleEn: (payload.titleEn || "Medical Consent Form").trim(),
        summaryAr: payload.summaryAr?.trim() || null,
        summaryEn: payload.summaryEn?.trim() || null,
      },
    });

    const version = await tx.consentTemplateVersion.create({
      data: {
        tenantId,
        templateId: template.id,
        versionLabel: "v1.0",
        versionNumber: 1,
        status: ConsentTemplateStatus.DRAFT,
        legalTextAr:
          payload.legalTextAr?.trim() ||
          "Ø£Ù‚Ø± Ø¨Ø£Ù† Ø§Ù„Ø·Ø¨ÙŠØ¨ Ø´Ø±Ø­ Ù„ÙŠ Ø·Ø¨ÙŠØ¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø·Ø¨ÙŠ ÙˆØ§Ù„ÙÙˆØ§Ø¦Ø¯ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ù…Ø­ØªÙ…Ù„Ø© Ø¨Ù„ØºØ© ÙˆØ§Ø¶Ø­Ø© ÙˆÙ…ÙÙ‡ÙˆÙ…Ø©.",
        legalTextEn:
          payload.legalTextEn?.trim() ||
          "I acknowledge that the physician explained the nature of the procedure, benefits, risks, alternatives, and potential complications in a clear manner.",
        pdplTextAr:
          payload.pdplTextAr?.trim() ||
          "Ø£ÙˆØ§ÙÙ‚ Ø¹Ù„Ù‰ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø¨ÙŠØ§Ù†Ø§ØªÙŠ Ø§Ù„ØµØ­ÙŠØ© ÙˆÙÙ‚ Ù†Ø¸Ø§Ù… Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ§Ù„Ø£Ù†Ø¸Ù…Ø© Ø§Ù„ØµØ­ÙŠØ© Ø§Ù„Ù…Ø¹Ù…ÙˆÙ„ Ø¨Ù‡Ø§ ÙÙŠ Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©.",
        pdplTextEn:
          payload.pdplTextEn?.trim() ||
          "I consent to processing my health data under PDPL and applicable healthcare regulations in the Kingdom of Saudi Arabia.",
        witnessDeclAr:
          payload.witnessDeclAr?.trim() ||
          "ÙŠØ´Ù‡Ø¯ Ø§Ù„Ø´Ø§Ù‡Ø¯ Ø¨Ø£Ù† Ø§Ù„Ù…Ø±ÙŠØ¶/Ø§Ù„ÙˆÙ„ÙŠ Ù‚Ø¯ Ù‚Ø±Ø£ ÙˆÙÙ‡Ù… Ù‡Ø°Ø§ Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ ÙˆØªÙ…Øª Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø¹Ù† Ø¬Ù…ÙŠØ¹ Ø§Ø³ØªÙØ³Ø§Ø±Ø§ØªÙ‡.",
        witnessDeclEn:
          payload.witnessDeclEn?.trim() ||
          "The witness confirms that the patient/guardian read and understood this form and all questions were addressed.",
        physicianCertAr:
          payload.physicianCertAr?.trim() ||
          "Ø£ÙÙ‚Ø± ÙƒØ·Ø¨ÙŠØ¨ Ù…Ø±Ø®Ù‘Øµ Ø£Ù†Ù†ÙŠ Ø´Ø±Ø­Øª Ù„Ù„Ù…Ø±ÙŠØ¶ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ø¨Ø¯Ø§Ø¦Ù„ØŒ ÙˆØ£ØªØ­Ù…Ù„ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ÙŠØ© Ø§Ù„Ù…Ù‡Ù†ÙŠØ© Ø¹Ù† ØµØ­Ø© Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ø§Ù„Ø·Ø¨ÙŠ.",
        physicianCertEn:
          payload.physicianCertEn?.trim() ||
          "As a licensed physician, I certify that I explained the procedure details, risks, and alternatives, and I remain professionally accountable for medical content accuracy.",
        aiWarningAr: payload.aiWarningAr?.trim() || DEFAULT_AI_WARNING_AR,
        aiWarningEn: payload.aiWarningEn?.trim() || DEFAULT_AI_WARNING_EN,
        createdByUserId: auth.sub,
      },
    });

    const sections = ensureArray(payload.sections);
    if (sections.length > 0) {
      await tx.consentTemplateSection.createMany({
        data: sections.map((section, index) => ({
          sectionKind: (section.sectionKind?.trim().toUpperCase() as ConsentSectionKind) || ConsentSectionKind.DYNAMIC_MEDICAL,
          sectionKey: (section.sectionKey || `section_${index + 1}`).trim().toLowerCase(),
          titleAr: (section.titleAr || `Ø§Ù„Ù‚Ø³Ù… ${index + 1}`).trim(),
          titleEn: (section.titleEn || `Section ${index + 1}`).trim(),
          contentAr: (section.contentAr || "").trim(),
          contentEn: (section.contentEn || "").trim(),
          tenantId,
          templateVersionId: version.id,
          isRequired: section.isRequired ?? true,
          isEditableByPhysician: section.isEditableByPhysician ?? true,
          sortOrder: section.sortOrder ?? (index + 1) * 10,
          metadata: {
            governance: resolveSectionGovernance(
              ((section.sectionKind?.trim().toUpperCase() as ConsentSectionKind) || ConsentSectionKind.DYNAMIC_MEDICAL),
              section.isEditableByPhysician ?? true,
            ),
          } as JsonInputValue,
        })),
      });
    }

    await tx.consentTemplate.update({
      where: { id: template.id },
      data: { currentVersionId: version.id },
    });

    return {
      template,
      version,
    };
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_template_created",
    summary: `Consent template ${created.template.templateCode} created`,
    source: "admin",
    templateId: created.template.id,
    templateVersionId: created.version.id,
    metadata: {
      templateCode: created.template.templateCode,
      consentType: created.template.consentType,
      specialty: created.template.specialty,
    },
    request,
  });

  return created;
}

export type CreateTemplateVersionPayload = {
  templateId?: string;
  cloneFromVersionId?: string;
  versionLabel?: string;
  changeReason?: string;
  impactAnalysis?: string;
  effectiveDate?: string;
  retirementDate?: string;
  supersededVersionId?: string;
  legalTextAr?: string;
  legalTextEn?: string;
  pdplTextAr?: string;
  pdplTextEn?: string;
  witnessDeclAr?: string;
  witnessDeclEn?: string;
  physicianCertAr?: string;
  physicianCertEn?: string;
  aiWarningAr?: string;
  aiWarningEn?: string;
};

export async function createTemplateVersion(
  auth: AuthContext,
  payload: CreateTemplateVersionPayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const templateId = payload.templateId?.trim();

  if (!templateId) {
    throw new ApiError(400, "templateId is required");
  }

  const template = await prisma().consentTemplate.findFirst({
    where: { id: templateId, tenantId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!template) {
    throw new ApiError(404, "Template not found");
  }

  const latest = template.versions[0];
  if (!latest) {
    throw new ApiError(400, "Template has no base version");
  }

  const sourceVersionId = payload.cloneFromVersionId?.trim() || latest.id;

  const sourceVersion = await prisma().consentTemplateVersion.findFirst({
    where: { id: sourceVersionId, tenantId, templateId },
  });

  if (!sourceVersion) {
    throw new ApiError(404, "Source version not found");
  }

  const sourceSections = await prisma().consentTemplateSection.findMany({
    where: { tenantId, templateVersionId: sourceVersion.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const newVersionNumber = latest.versionNumber + 1;
  const versionLabel = payload.versionLabel?.trim() || `v${newVersionNumber}.0`;

  const nextRecordForSync = {
    legalTextAr: payload.legalTextAr?.trim() || sourceVersion.legalTextAr,
    legalTextEn: payload.legalTextEn?.trim() || sourceVersion.legalTextEn,
    pdplTextAr: payload.pdplTextAr?.trim() || sourceVersion.pdplTextAr,
    pdplTextEn: payload.pdplTextEn?.trim() || sourceVersion.pdplTextEn,
    witnessDeclAr: payload.witnessDeclAr?.trim() || sourceVersion.witnessDeclAr,
    witnessDeclEn: payload.witnessDeclEn?.trim() || sourceVersion.witnessDeclEn,
    physicianCertAr: payload.physicianCertAr?.trim() || sourceVersion.physicianCertAr,
    physicianCertEn: payload.physicianCertEn?.trim() || sourceVersion.physicianCertEn,
    aiWarningAr: payload.aiWarningAr?.trim() || sourceVersion.aiWarningAr,
    aiWarningEn: payload.aiWarningEn?.trim() || sourceVersion.aiWarningEn,
    versionLabel,
  };

  const syncIssues = validateBilingualSync({
    record: nextRecordForSync,
    expectedVersion: versionLabel,
    status: ConsentTemplateStatus.DRAFT,
    requireApprovedPair: false,
  });

  if (syncIssues.length > 0) {
    throw new ApiError(400, `Bilingual synchronization failed: ${syncIssues.map((item) => item.message).join("; ")}`);
  }

  const created = await prisma().$transaction(async (tx) => {
    const version = await tx.consentTemplateVersion.create({
      data: {
        tenantId,
        templateId,
        versionLabel,
        versionNumber: newVersionNumber,
        status: ConsentTemplateStatus.DRAFT,
        legalTextAr: payload.legalTextAr?.trim() || sourceVersion.legalTextAr,
        legalTextEn: payload.legalTextEn?.trim() || sourceVersion.legalTextEn,
        pdplTextAr: payload.pdplTextAr?.trim() || sourceVersion.pdplTextAr,
        pdplTextEn: payload.pdplTextEn?.trim() || sourceVersion.pdplTextEn,
        witnessDeclAr: payload.witnessDeclAr?.trim() || sourceVersion.witnessDeclAr,
        witnessDeclEn: payload.witnessDeclEn?.trim() || sourceVersion.witnessDeclEn,
        physicianCertAr: payload.physicianCertAr?.trim() || sourceVersion.physicianCertAr,
        physicianCertEn: payload.physicianCertEn?.trim() || sourceVersion.physicianCertEn,
        aiWarningAr: payload.aiWarningAr?.trim() || sourceVersion.aiWarningAr,
        aiWarningEn: payload.aiWarningEn?.trim() || sourceVersion.aiWarningEn,
        createdByUserId: auth.sub,
        metadata: {
          clonedFromVersionId: sourceVersion.id,
          lifecycle: {
            stage: "Draft",
            changeReason: payload.changeReason?.trim() || null,
            impactAnalysis: payload.impactAnalysis?.trim() || null,
            effectiveDate: payload.effectiveDate?.trim() || null,
            retirementDate: payload.retirementDate?.trim() || null,
            supersededVersionId: payload.supersededVersionId?.trim() || sourceVersion.id,
          },
          bilingualSync: {
            required: true,
            validatedAt: new Date().toISOString(),
            issues: [],
          },
        },
      },
    });

    if (sourceSections.length > 0) {
      await tx.consentTemplateSection.createMany({
        data: sourceSections.map((section) => ({
          tenantId,
          templateVersionId: version.id,
          sectionKey: section.sectionKey,
          sectionKind: section.sectionKind,
          titleAr: section.titleAr,
          titleEn: section.titleEn,
          contentAr: section.contentAr,
          contentEn: section.contentEn,
          isRequired: section.isRequired,
          isEditableByPhysician: section.isEditableByPhysician,
          sortOrder: section.sortOrder,
          metadata: {
            ...(asRecord(section.metadata) || {}),
            governance: resolveSectionGovernance(section.sectionKind, section.isEditableByPhysician),
          } as JsonInputValue,
        })),
      });
    }

    return version;
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_template_version_created",
    summary: `New version ${created.versionLabel} created for template ${template.templateCode}`,
    source: "admin",
    templateId,
    templateVersionId: created.id,
    request,
  });

  return created;
}

export async function setTemplateVersionStatus(
  auth: AuthContext,
  payload: {
    templateId?: string;
    templateVersionId?: string;
    status?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const templateId = payload.templateId?.trim();
  const templateVersionId = payload.templateVersionId?.trim();
  const statusRaw = (payload.status || "").trim().toUpperCase();

  if (!templateId || !templateVersionId) {
    throw new ApiError(400, "templateId and templateVersionId are required");
  }

  if (!Object.values(ConsentTemplateStatus).includes(statusRaw as ConsentTemplateStatus)) {
    throw new ApiError(400, "Invalid template status");
  }

  const status = statusRaw as ConsentTemplateStatus;

  const result = await prisma().$transaction(async (tx) => {
    const existingVersion = await tx.consentTemplateVersion.findFirst({
      where: { id: templateVersionId, templateId, tenantId },
    });

    if (!existingVersion) {
      throw new ApiError(404, "Template version not found");
    }

    const syncIssues = validateBilingualSync({
      record: existingVersion as unknown as Record<string, unknown>,
      expectedVersion: existingVersion.versionLabel,
      status,
      requireApprovedPair: status === ConsentTemplateStatus.APPROVED || status === ConsentTemplateStatus.ACTIVE,
    });

    if (syncIssues.length > 0) {
      throw new ApiError(409, `Bilingual sync validation failed: ${syncIssues.map((item) => item.message).join("; ")}`);
    }

    const lifecycleStage =
      status === ConsentTemplateStatus.DRAFT
        ? "Draft"
        : status === ConsentTemplateStatus.UNDER_REVIEW
          ? "Legal Review"
          : status === ConsentTemplateStatus.APPROVED
            ? "Approved"
            : status === ConsentTemplateStatus.ACTIVE
              ? "Active"
              : "Retired";

    await tx.consentTemplateVersion.update({
      where: { id: templateVersionId },
      data: {
        status,
        approvedByUserId: status === ConsentTemplateStatus.APPROVED || status === ConsentTemplateStatus.ACTIVE ? auth.sub : null,
        approvedAt: status === ConsentTemplateStatus.APPROVED || status === ConsentTemplateStatus.ACTIVE ? new Date() : null,
        metadata: {
          ...(asRecord(existingVersion.metadata) || {}),
          lifecycle: {
            ...(asRecord(asRecord(existingVersion.metadata)?.lifecycle) || {}),
            stage: lifecycleStage,
            transitionedAt: new Date().toISOString(),
            transitionedBy: auth.sub,
          },
          bilingualSync: {
            required: true,
            validatedAt: new Date().toISOString(),
            issues: [],
          },
        } as JsonInputValue,
      },
    });

    if (status === ConsentTemplateStatus.ACTIVE) {
      await tx.consentTemplate.updateMany({
        where: { id: templateId, tenantId },
        data: {
          status: ConsentTemplateStatus.ACTIVE,
          currentVersionId: templateVersionId,
        },
      });
    }

    if (status === ConsentTemplateStatus.ARCHIVED) {
      await tx.consentTemplate.updateMany({
        where: { id: templateId, tenantId, currentVersionId: templateVersionId },
        data: {
          status: ConsentTemplateStatus.DRAFT,
          currentVersionId: null,
        },
      });
    }

    return {
      templateId,
      templateVersionId,
      status,
      syncValidated: true,
      retiredPair: status === ConsentTemplateStatus.ARCHIVED,
    };
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_template_version_status_changed",
    summary: `Template version status changed to ${result.status}`,
    source: "admin",
    templateId: result.templateId,
    templateVersionId: result.templateVersionId,
    metadata: {
      status: result.status,
      syncValidated: result.syncValidated,
      retiredPair: result.retiredPair,
    },
    request,
  });

  return result;
}

export async function upsertConsentAIPrompt(
  auth: AuthContext,
  payload: {
    id?: string;
    specialty?: string;
    consentType?: string;
    promptAr?: string;
    promptEn?: string;
    versionLabel?: string;
    isActive?: boolean;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const specialty = (payload.specialty || "").trim();
  const consentType = (payload.consentType || "").trim().toUpperCase();
  const promptAr = (payload.promptAr || "").trim();
  const promptEn = (payload.promptEn || "").trim();

  if (!specialty || !consentType || !promptAr || !promptEn) {
    throw new ApiError(400, "specialty, consentType, promptAr, and promptEn are required");
  }

  const data = {
    specialty,
    consentType,
    promptAr,
    promptEn,
    versionLabel: payload.versionLabel?.trim() || null,
    isActive: payload.isActive ?? true,
  };

  const record = payload.id?.trim()
    ? await prisma().consentAIPrompt.updateMany({
        where: { id: payload.id.trim(), tenantId },
        data,
      }).then(async (result) => {
        if (result.count === 0) {
          throw new ApiError(404, "AI prompt not found");
        }
        return prisma().consentAIPrompt.findFirst({ where: { id: payload.id!.trim(), tenantId } });
      })
    : await prisma().consentAIPrompt.create({
        data: {
          tenantId,
          ...data,
        },
      });

  await writeConsentAudit({
    tenantId,
    auth,
    action: payload.id ? "consent_ai_prompt_updated" : "consent_ai_prompt_created",
    summary: `AI prompt ${payload.id ? "updated" : "created"} for ${consentType}/${specialty}`,
    source: "admin",
    metadata: {
      promptId: record?.id,
      consentType,
      specialty,
    },
    request,
  });

  return record;
}

export async function listConsentDocuments(
  auth: AuthContext,
  args: {
    caseId?: string;
    status?: string;
    limit?: number;
  } = {},
) {
  const tenantId = requireTenantId(auth);
  const take = Math.min(Math.max(args.limit || 50, 1), 200);
  const status = (args.status || "").trim().toUpperCase();

  return prisma().consentDocument.findMany({
    where: {
      tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
      ...(status && Object.values(ConsentDocumentStatus).includes(status as ConsentDocumentStatus)
        ? { status: status as ConsentDocumentStatus }
        : {}),
    },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
      template: {
        select: {
          id: true,
          templateCode: true,
          titleAr: true,
          titleEn: true,
          consentType: true,
          specialty: true,
          department: true,
        },
      },
      signatures: true,
    },
    orderBy: [{ createdAt: "desc" }],
    take,
  });
}

export async function getConsentDocument(auth: AuthContext, id: string) {
  const tenantId = requireTenantId(auth);
  const document = await prisma().consentDocument.findFirst({
    where: { tenantId, id },
    include: {
      case: true,
      template: true,
      templateVersion: true,
      sections: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      signatures: { orderBy: [{ signedAt: "asc" }] },
      auditEvents: { orderBy: [{ createdAt: "desc" }], take: 100 },
    },
  });

  if (!document) {
    throw new ApiError(404, "Consent document not found");
  }

  return document;
}

export type CreateConsentDocumentPayload = {
  caseId?: string;
  templateId?: string;
  templateVersionId?: string;
  language?: "ar" | "en" | "bilingual";
  physicianName?: string;
  physicianLicense?: string;
  physicianSpecialty?: string;
  department?: string;
  diagnosis?: string;
  plannedProcedure?: string;
  admissionDetails?: string;
  procedureDetails?: string;
  physicianNotesAr?: string;
  physicianNotesEn?: string;
  metadata?: Record<string, unknown>;
};

export async function createConsentDocument(
  auth: AuthContext,
  payload: CreateConsentDocumentPayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const caseId = payload.caseId?.trim();
  const templateId = payload.templateId?.trim();

  if (!caseId || !templateId) {
    throw new ApiError(400, "caseId and templateId are required");
  }

  const caseRecord = await prisma().case.findFirst({
    where: { id: caseId, tenantId },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      patientIdNumber: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  const template = await prisma().consentTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new ApiError(404, "Template not found");
  }

  const templateVersionId = payload.templateVersionId?.trim() || template.currentVersionId || undefined;
  if (!templateVersionId) {
    throw new ApiError(400, "Template has no active version");
  }

  const version = await prisma().consentTemplateVersion.findFirst({
    where: {
      id: templateVersionId,
      tenantId,
      templateId,
    },
  });

  if (!version) {
    throw new ApiError(404, "Template version not found");
  }

  const creationSyncIssues = validateBilingualSync({
    record: version as unknown as Record<string, unknown>,
    expectedVersion: version.versionLabel,
    status: version.status,
    requireApprovedPair: true,
  });

  if (creationSyncIssues.length > 0) {
    throw new ApiError(409, `Template bilingual synchronization failed: ${creationSyncIssues.map((item) => item.message).join("; ")}`);
  }

  const versionSections = await prisma().consentTemplateSection.findMany({
    where: {
      tenantId,
      templateVersionId: version.id,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const emrMeta = (caseRecord.metadata || {}) as Record<string, unknown>;

  const created = await prisma().$transaction(async (tx) => {
    const consentDocument = await tx.consentDocument.create({
      data: {
        tenantId,
        caseId,
        templateId,
        templateVersionId: version.id,
        consentReference: generateReference("IC"),
        status: ConsentDocumentStatus.DRAFT,
        language: payload.language || "bilingual",
        patientName: caseRecord.patientName || "Unknown Patient",
        mrn: caseRecord.medicalRecordNo || null,
        dob: typeof emrMeta.dob === "string" ? emrMeta.dob : null,
        gender: typeof emrMeta.gender === "string" ? emrMeta.gender : null,
        physicianName: payload.physicianName?.trim() || auth.email || "Assigned Physician",
        physicianLicense: payload.physicianLicense?.trim() || null,
        physicianSpecialty: payload.physicianSpecialty?.trim() || template.specialty,
        department: payload.department?.trim() || template.department || null,
        diagnosis: payload.diagnosis?.trim() || (typeof emrMeta.diagnosis === "string" ? emrMeta.diagnosis : null),
        plannedProcedure:
          payload.plannedProcedure?.trim() || (typeof emrMeta.plannedProcedure === "string" ? emrMeta.plannedProcedure : null),
        admissionDetails:
          payload.admissionDetails?.trim() || (typeof emrMeta.admissionDetails === "string" ? emrMeta.admissionDetails : null),
        procedureDetails: payload.procedureDetails?.trim() || null,
        physicianNotesAr: payload.physicianNotesAr?.trim() || null,
        physicianNotesEn: payload.physicianNotesEn?.trim() || null,
        legalTextAr: version.legalTextAr,
        legalTextEn: version.legalTextEn,
        pdplTextAr: version.pdplTextAr,
        pdplTextEn: version.pdplTextEn,
        witnessDeclAr: version.witnessDeclAr,
        witnessDeclEn: version.witnessDeclEn,
        physicianCertAr: version.physicianCertAr,
        physicianCertEn: version.physicianCertEn,
        aiWarningAr: version.aiWarningAr,
        aiWarningEn: version.aiWarningEn,
        documentVersion: version.versionLabel,
        metadata: {
          emrAutoPopulation: {
            patientName: caseRecord.patientName || null,
            mrn: caseRecord.medicalRecordNo || null,
            diagnosis: typeof emrMeta.diagnosis === "string" ? emrMeta.diagnosis : null,
            plannedProcedure: typeof emrMeta.plannedProcedure === "string" ? emrMeta.plannedProcedure : null,
          },
          source: "modules.informed-consents",
          governance: {
            fieldPolicy: DYNAMIC_FIELD_GOVERNANCE,
            prohibitedAiFields: Array.from(PROHIBITED_AI_FIELDS),
            aiEditableFields: Array.from(AI_EDITABLE_FIELDS),
            lifecycle: {
              stage: "Draft",
              initializedAt: new Date().toISOString(),
            },
          },
          wordingSnapshot: buildDocumentWordingSnapshot({
            doc: {
              legalTextAr: version.legalTextAr,
              legalTextEn: version.legalTextEn,
              pdplTextAr: version.pdplTextAr,
              pdplTextEn: version.pdplTextEn,
              witnessDeclAr: version.witnessDeclAr,
              witnessDeclEn: version.witnessDeclEn,
              physicianCertAr: version.physicianCertAr,
              physicianCertEn: version.physicianCertEn,
              documentVersion: version.versionLabel,
            },
            templateVersion: {
              id: version.id,
              versionLabel: version.versionLabel,
              versionNumber: version.versionNumber,
              approvedByUserId: version.approvedByUserId,
              approvedAt: version.approvedAt,
              effectiveFrom: version.effectiveFrom,
              effectiveTo: version.effectiveTo,
            },
            status: ConsentDocumentStatus.DRAFT,
          }),
          ...(payload.metadata || {}),
        } as JsonInputValue,
      },
    });

    if (versionSections.length > 0) {
      await tx.consentDocumentSection.createMany({
        data: versionSections.map((section) => ({
          tenantId,
          consentDocumentId: consentDocument.id,
          sourceTemplateSectionId: section.id,
          sectionKey: section.sectionKey,
          sectionKind: section.sectionKind,
          titleAr: section.titleAr,
          titleEn: section.titleEn,
          contentAr: section.contentAr,
          contentEn: section.contentEn,
          isEditableByPhysician: section.isEditableByPhysician,
          sortOrder: section.sortOrder,
          metadata: {
            ...(asRecord(section.metadata) || {}),
            governance: resolveSectionGovernance(section.sectionKind, section.isEditableByPhysician),
          } as JsonInputValue,
        })),
      });
    }

    return consentDocument;
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_document_created",
    summary: `Consent document ${created.consentReference} created`,
    source: "workflow",
    consentDocumentId: created.id,
    templateId,
    templateVersionId: version.id,
    caseId,
    metadata: {
      consentReference: created.consentReference,
      templateCode: template.templateCode,
      status: created.status,
    },
    request,
  });

  return getConsentDocument(auth, created.id);
}

export async function updateConsentDocument(
  auth: AuthContext,
  id: string,
  payload: Partial<CreateConsentDocumentPayload> & {
    risksAr?: string;
    risksEn?: string;
    sideEffectsAr?: string;
    sideEffectsEn?: string;
    alternativesAr?: string;
    alternativesEn?: string;
    refusalRisksAr?: string;
    refusalRisksEn?: string;
    expectedOutcomesAr?: string;
    expectedOutcomesEn?: string;
    physicianNotesAr?: string;
    physicianNotesEn?: string;
    sectionUpdates?: Array<{
      sectionId?: string;
      contentAr?: string;
      contentEn?: string;
    }>;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const existing = await prisma().consentDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    throw new ApiError(404, "Consent document not found");
  }

  if (existing.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Finalized consent cannot be edited");
  }

  const existingFixedChecksum = computeFixedClauseChecksum(existing as unknown as Record<string, unknown>);
  const allowedUpdateFields = new Set([
    "diagnosis",
    "plannedProcedure",
    "admissionDetails",
    "procedureDetails",
    "physicianName",
    "physicianLicense",
    "physicianSpecialty",
    "department",
    "risksAr",
    "risksEn",
    "sideEffectsAr",
    "sideEffectsEn",
    "alternativesAr",
    "alternativesEn",
    "refusalRisksAr",
    "refusalRisksEn",
    "expectedOutcomesAr",
    "expectedOutcomesEn",
    "physicianNotesAr",
    "physicianNotesEn",
    "sectionUpdates",
  ]);

  const unknownFields = Object.keys(payload).filter(
    (key) => (payload as Record<string, unknown>)[key] !== undefined && !allowedUpdateFields.has(key),
  );
  if (unknownFields.length > 0) {
    throw new ApiError(400, `Unsupported edit fields: ${unknownFields.join(", ")}`);
  }

  const updatedRecordCandidate: Record<string, unknown> = {
    ...existing,
    risksAr: payload.risksAr?.trim() ?? existing.risksAr,
    risksEn: payload.risksEn?.trim() ?? existing.risksEn,
    sideEffectsAr: payload.sideEffectsAr?.trim() ?? existing.sideEffectsAr,
    sideEffectsEn: payload.sideEffectsEn?.trim() ?? existing.sideEffectsEn,
    alternativesAr: payload.alternativesAr?.trim() ?? existing.alternativesAr,
    alternativesEn: payload.alternativesEn?.trim() ?? existing.alternativesEn,
    refusalRisksAr: payload.refusalRisksAr?.trim() ?? existing.refusalRisksAr,
    refusalRisksEn: payload.refusalRisksEn?.trim() ?? existing.refusalRisksEn,
    expectedOutcomesAr: payload.expectedOutcomesAr?.trim() ?? existing.expectedOutcomesAr,
    expectedOutcomesEn: payload.expectedOutcomesEn?.trim() ?? existing.expectedOutcomesEn,
    physicianNotesAr: payload.physicianNotesAr?.trim() ?? existing.physicianNotesAr,
    physicianNotesEn: payload.physicianNotesEn?.trim() ?? existing.physicianNotesEn,
  };

  const editSyncIssues = validateBilingualSync({
    record: updatedRecordCandidate,
    expectedVersion: existing.documentVersion,
    status: existing.status,
    requireApprovedPair: false,
  });

  if (editSyncIssues.length > 0) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_synchronization_failure",
      summary: `Bilingual synchronization failed for ${id}`,
      source: "governance",
      consentDocumentId: id,
      caseId: existing.caseId,
      metadata: {
        issues: editSyncIssues,
      },
      request,
    });
    throw new ApiError(409, `Bilingual synchronization failed: ${editSyncIssues.map((item) => item.message).join("; ")}`);
  }

  await prisma().$transaction(async (tx) => {
    await tx.consentDocument.update({
      where: { id },
      data: {
        diagnosis: payload.diagnosis?.trim() ?? existing.diagnosis,
        plannedProcedure: payload.plannedProcedure?.trim() ?? existing.plannedProcedure,
        admissionDetails: payload.admissionDetails?.trim() ?? existing.admissionDetails,
        procedureDetails: payload.procedureDetails?.trim() ?? existing.procedureDetails,
        physicianName: payload.physicianName?.trim() ?? existing.physicianName,
        physicianLicense: payload.physicianLicense?.trim() ?? existing.physicianLicense,
        physicianSpecialty: payload.physicianSpecialty?.trim() ?? existing.physicianSpecialty,
        department: payload.department?.trim() ?? existing.department,
        risksAr: payload.risksAr?.trim() ?? existing.risksAr,
        risksEn: payload.risksEn?.trim() ?? existing.risksEn,
        sideEffectsAr: payload.sideEffectsAr?.trim() ?? existing.sideEffectsAr,
        sideEffectsEn: payload.sideEffectsEn?.trim() ?? existing.sideEffectsEn,
        alternativesAr: payload.alternativesAr?.trim() ?? existing.alternativesAr,
        alternativesEn: payload.alternativesEn?.trim() ?? existing.alternativesEn,
        refusalRisksAr: payload.refusalRisksAr?.trim() ?? existing.refusalRisksAr,
        refusalRisksEn: payload.refusalRisksEn?.trim() ?? existing.refusalRisksEn,
        expectedOutcomesAr: payload.expectedOutcomesAr?.trim() ?? existing.expectedOutcomesAr,
        expectedOutcomesEn: payload.expectedOutcomesEn?.trim() ?? existing.expectedOutcomesEn,
        physicianNotesAr: payload.physicianNotesAr?.trim() ?? existing.physicianNotesAr,
        physicianNotesEn: payload.physicianNotesEn?.trim() ?? existing.physicianNotesEn,
        metadata: {
          ...(asRecord(existing.metadata) || {}),
          governance: {
            ...(asRecord(asRecord(existing.metadata)?.governance) || {}),
            lastEditedAt: new Date().toISOString(),
            lastEditedBy: auth.sub,
            bilingualSyncRequired: true,
            lastSyncIssues: [],
          },
        } as JsonInputValue,
        status:
          existing.status === ConsentDocumentStatus.AI_DRAFT
            ? ConsentDocumentStatus.PHYSICIAN_REVIEW
            : existing.status,
      },
    });

    const sectionUpdates = ensureArray(payload.sectionUpdates);
    for (const sectionUpdate of sectionUpdates) {
      const sectionId = sectionUpdate.sectionId?.trim();
      if (!sectionId) continue;

      await tx.consentDocumentSection.updateMany({
        where: {
          id: sectionId,
          tenantId,
          consentDocumentId: id,
          isEditableByPhysician: true,
        },
        data: {
          ...(sectionUpdate.contentAr !== undefined ? { contentAr: sectionUpdate.contentAr.trim() } : {}),
          ...(sectionUpdate.contentEn !== undefined ? { contentEn: sectionUpdate.contentEn.trim() } : {}),
        },
      });
    }

    const refreshed = await tx.consentDocument.findFirst({
      where: { id, tenantId },
    });
    if (!refreshed) {
      throw new ApiError(404, "Consent document not found after update");
    }

    const refreshedChecksum = computeFixedClauseChecksum(refreshed as unknown as Record<string, unknown>);
    if (refreshedChecksum !== existingFixedChecksum) {
      throw new ApiError(409, "Immutable fixed clauses changed; edit rejected");
    }
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_document_edited",
    summary: `Consent document ${id} edited by physician`,
    source: "physician",
    consentDocumentId: id,
    caseId: existing.caseId,
    metadata: {
      before: {
        diagnosis: existing.diagnosis,
        plannedProcedure: existing.plannedProcedure,
        procedureDetails: existing.procedureDetails,
      },
      after: {
        diagnosis: payload.diagnosis?.trim() ?? existing.diagnosis,
        plannedProcedure: payload.plannedProcedure?.trim() ?? existing.plannedProcedure,
        procedureDetails: payload.procedureDetails?.trim() ?? existing.procedureDetails,
      },
      fixedClauseChecksum: existingFixedChecksum,
    },
    request,
  });

  return getConsentDocument(auth, id);
}

export async function generateAIAssistDraft(
  auth: AuthContext,
  id: string,
  payload: {
    procedureDetails?: string;
    specialty?: string;
    consentType?: string;
    customPrompt?: string;
    procedureCode?: string;
  },
  request?: NextRequest,
) {
  return generateProcedureAwareContent(
    auth,
    id,
    {
      specialty: payload.specialty,
      procedureCode: payload.procedureCode,
      procedureDetails: payload.procedureDetails,
    },
    request,
  );
}

export async function approveConsentDocument(
  auth: AuthContext,
  id: string,
  payload: {
    physicianName?: string;
    physicianLicense?: string;
    physicianNotesAr?: string;
    physicianNotesEn?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  if (doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Finalized consent cannot be approved again");
  }

  const physicianLicense = payload.physicianLicense?.trim() || doc.physicianLicense;
  if (!physicianLicense) {
    throw new ApiError(400, "Physician license is required for final approval");
  }

  const approvalSyncIssues = validateBilingualSync({
    record: doc as unknown as Record<string, unknown>,
    expectedVersion: doc.documentVersion,
    status: "APPROVED",
    requireApprovedPair: true,
  });
  if (approvalSyncIssues.length > 0) {
    throw new ApiError(409, `Approval blocked by bilingual mismatch: ${approvalSyncIssues.map((item) => item.message).join("; ")}`);
  }

  const fixedClauseChecksum = computeFixedClauseChecksum(doc as unknown as Record<string, unknown>);

  const updated = await prisma().consentDocument.update({
    where: { id },
    data: {
      physicianName: payload.physicianName?.trim() || doc.physicianName,
      physicianLicense,
      physicianNotesAr: payload.physicianNotesAr?.trim() || doc.physicianNotesAr,
      physicianNotesEn: payload.physicianNotesEn?.trim() || doc.physicianNotesEn,
      status: ConsentDocumentStatus.APPROVED,
      approvedAt: new Date(),
      approvedByUserId: auth.sub,
      aiValidatedAt: new Date(),
      aiValidatedByUserId: auth.sub,
      metadata: {
        ...(asRecord(doc.metadata) || {}),
        governance: {
          ...(asRecord(asRecord(doc.metadata)?.governance) || {}),
          lifecycle: {
            ...(asRecord(asRecord(asRecord(doc.metadata)?.governance)?.lifecycle) || {}),
            stage: "Approved",
            transitionedAt: new Date().toISOString(),
            transitionedBy: auth.sub,
          },
          fixedClauseChecksum,
        },
      } as JsonInputValue,
    },
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_document_approved",
    summary: `Consent ${updated.consentReference} approved by licensed physician`,
    source: "physician",
    consentDocumentId: id,
    caseId: updated.caseId,
    metadata: {
      physicianLicense,
      fixedClauseChecksum,
    },
    request,
  });

  return getConsentDocument(auth, id);
}

export async function addConsentSignature(
  auth: AuthContext,
  id: string,
  payload: {
    role?: string;
    signerName?: string;
    signerIdNumber?: string;
    signerLicense?: string;
    signatureMethod?: string;
    metadata?: Record<string, unknown>;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id },
    include: { signatures: true },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  if (doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Finalized consent cannot accept signatures");
  }

  const signableStatuses: ConsentDocumentStatus[] = [
    ConsentDocumentStatus.APPROVED,
    ConsentDocumentStatus.READY_FOR_SIGNATURE,
    ConsentDocumentStatus.SIGNED,
  ];

  if (!signableStatuses.includes(doc.status)) {
    throw new ApiError(409, "Consent must be approved before signature collection");
  }

  const role = normalizeSignatureRole(payload.role);
  const signerName = payload.signerName?.trim();

  if (!signerName) {
    throw new ApiError(400, "signerName is required");
  }

  const signature = await prisma().consentDocumentSignature.create({
    data: {
      tenantId,
      consentDocumentId: id,
      role,
      signerName,
      signerIdNumber: payload.signerIdNumber?.trim() || null,
      signerLicense: payload.signerLicense?.trim() || null,
      signatureMethod: normalizeConsentMethod(payload.signatureMethod),
      ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: request?.headers.get("user-agent") || null,
      metadata: {
        capturedBy: auth.sub,
        ...(asRecord(payload.metadata) || {}),
      },
    },
  });

  const signatures = [...doc.signatures, signature];
  const hasPatient = signatures.some((item) => item.role === ConsentSignatureRole.PATIENT || item.role === ConsentSignatureRole.GUARDIAN);
  const hasPhysician = signatures.some((item) => item.role === ConsentSignatureRole.PHYSICIAN);

  const nextStatus = hasPatient && hasPhysician
    ? ConsentDocumentStatus.SIGNED
    : ConsentDocumentStatus.READY_FOR_SIGNATURE;

  await prisma().consentDocument.update({
    where: { id },
    data: {
      status: nextStatus,
    },
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_document_signed",
    summary: `Signature captured (${role}) for consent ${doc.consentReference}`,
    source: "signature",
    consentDocumentId: id,
    caseId: doc.caseId,
    metadata: {
      role,
      signerName,
      signatureMethod: signature.signatureMethod,
      nextStatus,
    },
    request,
  });

  return getConsentDocument(auth, id);
}

export async function finalizeConsentDocument(
  auth: AuthContext,
  id: string,
  payload: {
    immutablePdfUrl?: string;
    immutablePdfHash?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id },
    include: { signatures: true, templateVersion: true, template: true },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  if (doc.status === ConsentDocumentStatus.FINALIZED) {
    return getConsentDocument(auth, id);
  }

  if (doc.status !== ConsentDocumentStatus.SIGNED) {
    throw new ApiError(409, "Consent must be fully signed before finalization");
  }

  const hasPhysician = doc.signatures.some((item) => item.role === ConsentSignatureRole.PHYSICIAN);
  if (!hasPhysician) {
    throw new ApiError(409, "Physician signature is mandatory before finalization");
  }

  const blockers: string[] = [];
  if (!normalizeText(doc.patientName)) {
    blockers.push("Patient identity is missing");
  }
  if (!normalizeText(doc.mrn) && !normalizeText(doc.dob)) {
    blockers.push("MRN or date of birth is required");
  }
  if (!normalizeText(doc.plannedProcedure)) {
    blockers.push("Procedure name is missing");
  }
  if (!normalizeText(doc.physicianName)) {
    blockers.push("Physician information is missing");
  }
  if (!normalizeText(doc.risksAr) || !normalizeText(doc.risksEn)) {
    blockers.push("Risks section is incomplete");
  }
  if (!normalizeText(doc.alternativesAr) || !normalizeText(doc.alternativesEn)) {
    blockers.push("Alternatives section is incomplete");
  }
  if (!normalizeText(doc.refusalRisksAr) || !normalizeText(doc.refusalRisksEn)) {
    blockers.push("Consequences of refusal section is incomplete");
  }

  const hasWitness = doc.signatures.some((item) => item.role === ConsentSignatureRole.WITNESS);
  const hasGuardian = doc.signatures.some((item) => item.role === ConsentSignatureRole.GUARDIAN);
  const hasInterpreter = doc.signatures.some((item) => item.role === ConsentSignatureRole.INTERPRETER);
  const metadata = asRecord(doc.metadata) || {};
  const signatureSecurity = asRecord(metadata.signatureSecurity) || {};
  const orchestration = asRecord(metadata.signatureOrchestration) || {};

  if (doc.template.requiresGuardian && !hasGuardian) {
    blockers.push("Guardian signature is required for this template");
  }

  const highRiskTemplate = ["HIGH", "CRITICAL"].includes(String(doc.template.riskLevel || "").toUpperCase());
  if ((doc.template.requiresWitness || highRiskTemplate) && !hasWitness) {
    blockers.push("Witness signature is required for high-risk or witness-mandatory templates");
  }

  const interpreterRequired = doc.template.requiresInterpreter || signatureSecurity.interpreterRequired === true;
  if (interpreterRequired && !hasInterpreter) {
    blockers.push("Interpreter confirmation is required");
  }

  const otpRequired = signatureSecurity.otpRequired === true || doc.signatures.some((item) => item.signatureMethod === ConsentMethod.OTP);
  const otpVerified = signatureSecurity.otpVerified === true || orchestration.otpVerified === true;
  if (otpRequired && !otpVerified) {
    blockers.push("OTP verification is required before final signature");
  }

  const versionApproved = (
    doc.templateVersion.status === ConsentTemplateStatus.ACTIVE
    || doc.templateVersion.status === ConsentTemplateStatus.APPROVED
  ) && Boolean(doc.templateVersion.approvedAt);
  if (!versionApproved) {
    blockers.push("Template version is not approved");
  }

  const fixedClauseChecksum = computeFixedClauseChecksum(doc as unknown as Record<string, unknown>);
  if (doc.templateVersion.legalHash && doc.templateVersion.legalHash !== fixedClauseChecksum) {
    blockers.push("Legal hash mismatch detected");
  }

  if (blockers.length > 0) {
    throw new ApiError(409, `Final signature validation failed: ${blockers.join("; ")}`);
  }

  const syncIssues = validateBilingualSync({
    record: doc as unknown as Record<string, unknown>,
    expectedVersion: doc.documentVersion,
    status: doc.status,
    requireApprovedPair: true,
  });
  if (syncIssues.length > 0) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_synchronization_failure",
      summary: `Finalization blocked due to bilingual mismatch for ${doc.consentReference}`,
      source: "governance",
      consentDocumentId: id,
      caseId: doc.caseId,
      metadata: { issues: syncIssues },
      request,
    });
    throw new ApiError(409, `Bilingual synchronization failed: ${syncIssues.map((item) => item.message).join("; ")}`);
  }

  const wordingSnapshot = buildDocumentWordingSnapshot({
    doc: {
      legalTextAr: doc.legalTextAr,
      legalTextEn: doc.legalTextEn,
      pdplTextAr: doc.pdplTextAr,
      pdplTextEn: doc.pdplTextEn,
      witnessDeclAr: doc.witnessDeclAr,
      witnessDeclEn: doc.witnessDeclEn,
      physicianCertAr: doc.physicianCertAr,
      physicianCertEn: doc.physicianCertEn,
      documentVersion: doc.documentVersion,
    },
    templateVersion: {
      id: doc.templateVersion.id,
      versionLabel: doc.templateVersion.versionLabel,
      versionNumber: doc.templateVersion.versionNumber,
      approvedByUserId: doc.templateVersion.approvedByUserId,
      approvedAt: doc.templateVersion.approvedAt,
      effectiveFrom: doc.templateVersion.effectiveFrom,
      effectiveTo: doc.templateVersion.effectiveTo,
    },
    status: ConsentDocumentStatus.FINALIZED,
  });

  const immutablePdfHash = payload.immutablePdfHash?.trim() || crypto
    .createHash("sha256")
    .update(JSON.stringify({
      consentReference: doc.consentReference,
      wordingSnapshot,
      fixedClauseChecksum,
      updatedAt: doc.updatedAt.toISOString(),
      signatures: doc.signatures.map((item) => ({
        role: item.role,
        signerName: item.signerName,
        signedAt: item.signedAt.toISOString(),
      })),
    }))
    .digest("hex");

  const qrPayload = [
    `CONSENT:${doc.consentReference}`,
    `DOC:${doc.id}`,
    `CASE:${doc.caseId}`,
    `STATUS:FINALIZED`,
    `TS:${new Date().toISOString()}`,
    `HASH:${immutablePdfHash}`,
  ].join("|");

  const updated = await prisma().consentDocument.update({
    where: { id },
    data: {
      status: ConsentDocumentStatus.FINALIZED,
      finalizedAt: new Date(),
      finalizedByUserId: auth.sub,
      immutablePdfUrl: payload.immutablePdfUrl?.trim() || doc.immutablePdfUrl,
      immutablePdfHash,
      auditChecksum: immutablePdfHash,
      qrPayload,
      generatedByModel: DEFAULT_GENERATOR_MODEL,
      metadata: {
        ...(asRecord(doc.metadata) || {}),
        finalizedWordingSnapshot: wordingSnapshot,
        governance: {
          ...(asRecord(asRecord(doc.metadata)?.governance) || {}),
          lifecycle: {
            ...(asRecord(asRecord(asRecord(doc.metadata)?.governance)?.lifecycle) || {}),
            stage: "Active",
            finalizedAt: new Date().toISOString(),
            finalizedBy: auth.sub,
          },
          bilingualSyncRequired: true,
          fixedClauseChecksum,
        },
      } as JsonInputValue,
    },
  });

  await prisma().consentEvidencePackage.createMany({
    data: [
      {
        tenantId,
        consentDocumentId: id,
        copyType: ConsentEvidenceCopyType.PATIENT_COPY,
        fileName: `CONSENT-${updated.consentReference}-PATIENT.pdf`,
        checksumHash: immutablePdfHash,
        generatedBy: auth.sub,
      },
      {
        tenantId,
        consentDocumentId: id,
        copyType: ConsentEvidenceCopyType.MEDICAL_RECORD_COPY,
        fileName: `CONSENT-${updated.consentReference}-MR.pdf`,
        checksumHash: immutablePdfHash,
        generatedBy: auth.sub,
      },
      {
        tenantId,
        consentDocumentId: id,
        copyType: ConsentEvidenceCopyType.LEGAL_ARCHIVE_COPY,
        fileName: `CONSENT-${updated.consentReference}-LEGAL.pdf`,
        checksumHash: immutablePdfHash,
        generatedBy: auth.sub,
      },
    ],
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_document_finalized",
    summary: `Consent ${updated.consentReference} finalized as immutable record`,
    source: "workflow",
    consentDocumentId: id,
    caseId: updated.caseId,
    metadata: {
      immutablePdfHash,
      fixedClauseChecksum,
      wordingVersion: doc.documentVersion,
      wordingApprovalReference: doc.templateVersion.id,
      wordingApprovalTimestamp: doc.templateVersion.approvedAt ? doc.templateVersion.approvedAt.toISOString() : null,
      evidenceCopies: ["PATIENT_COPY", "MEDICAL_RECORD_COPY", "LEGAL_ARCHIVE_COPY"],
    },
    request,
  });

  return getConsentDocument(auth, id);
}

export async function upsertPromptRegistry(
  auth: AuthContext,
  payload: {
    id?: string;
    specialty?: string;
    consentType?: string;
    procedureKey?: string;
    promptAr?: string;
    promptEn?: string;
    promptVersion?: string;
    generatorModel?: string;
    isActive?: boolean;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const specialty = (payload.specialty || "").trim().toUpperCase();
  const consentType = (payload.consentType || "").trim().toUpperCase();

  if (!specialty || !consentType || !payload.promptAr?.trim() || !payload.promptEn?.trim()) {
    throw new ApiError(400, "specialty, consentType, promptAr and promptEn are required");
  }

  const data = {
    specialty,
    consentType,
    procedureKey: payload.procedureKey?.trim() || null,
    promptAr: payload.promptAr.trim(),
    promptEn: payload.promptEn.trim(),
    promptVersion: payload.promptVersion?.trim() || "1.0",
    generatorModel: payload.generatorModel?.trim() || DEFAULT_GENERATOR_MODEL,
    isActive: payload.isActive ?? true,
  };

  const prompt = payload.id?.trim()
    ? await prisma().consentPromptRegistry.update({ where: { id: payload.id.trim() }, data })
    : await prisma().consentPromptRegistry.create({ data: { tenantId, ...data } });

  await writeConsentAudit({
    tenantId,
    auth,
    action: payload.id ? "consent_prompt_registry_updated" : "consent_prompt_registry_created",
    summary: `Prompt registry entry ${payload.id ? "updated" : "created"} for ${specialty}/${consentType}`,
    source: "admin",
    metadata: { promptRegistryId: prompt.id, specialty, consentType },
    request,
  });

  return prompt;
}

export async function upsertWordingRepository(
  auth: AuthContext,
  payload: {
    id?: string;
    specialty?: string;
    consentType?: string;
    procedureKey?: string;
    wordingType?: string;
    wordingAr?: string;
    wordingEn?: string;
    changeReason?: string;
    impactAnalysis?: string;
    effectiveDate?: string;
    retirementDate?: string;
    supersededVersionId?: string;
    isActive?: boolean;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const specialty = (payload.specialty || "").trim().toUpperCase();
  const consentType = (payload.consentType || "").trim().toUpperCase();
  const wordingType = (payload.wordingType || "").trim().toUpperCase();

  if (!specialty || !consentType || !wordingType || !payload.wordingAr?.trim() || !payload.wordingEn?.trim()) {
    throw new ApiError(400, "specialty, consentType, wordingType, wordingAr and wordingEn are required");
  }

  const syncIssues = validateBilingualSync({
    record: {
      wordingAr: payload.wordingAr,
      wordingEn: payload.wordingEn,
      versionLabel: "repository",
      approvedByUserId: auth.sub,
      approvedAt: new Date().toISOString(),
    },
    status: "APPROVED",
    requireApprovedPair: true,
  });
  if (syncIssues.length > 0) {
    throw new ApiError(400, `Bilingual synchronization failed: ${syncIssues.map((item) => item.message).join("; ")}`);
  }

  const data = {
    specialty,
    consentType,
    procedureKey: payload.procedureKey?.trim() || null,
    wordingType,
    wordingAr: payload.wordingAr.trim(),
    wordingEn: payload.wordingEn.trim(),
    approvedByUserId: auth.sub,
    approvedAt: new Date(),
    isActive: payload.isActive ?? true,
    metadata: {
      lifecycle: {
        stage: payload.isActive === false ? "Retired" : "Approved",
        changeReason: payload.changeReason?.trim() || null,
        impactAnalysis: payload.impactAnalysis?.trim() || null,
        effectiveDate: payload.effectiveDate?.trim() || null,
        retirementDate: payload.retirementDate?.trim() || null,
        supersededVersionId: payload.supersededVersionId?.trim() || null,
        transitionedAt: new Date().toISOString(),
        transitionedBy: auth.sub,
      },
      isolation: {
        globalLegalWording: wordingType === "GLOBAL_LEGAL",
        specialtyWording: wordingType === "SPECIALTY",
        procedureWording: wordingType === "PROCEDURE",
        aiGeneratedMedicalContent: wordingType === "AI_GENERATED",
      },
      bilingualSync: {
        required: true,
        issues: [],
      },
    } as JsonInputValue,
  };

  const wording = payload.id?.trim()
    ? await prisma().consentWordingRepository.update({ where: { id: payload.id.trim() }, data })
    : await prisma().consentWordingRepository.create({ data: { tenantId, ...data } });

  await writeConsentAudit({
    tenantId,
    auth,
    action: payload.id ? "consent_wording_repository_updated" : "consent_wording_repository_created",
    summary: `Wording repository ${payload.id ? "updated" : "created"}: ${wordingType}`,
    source: "legal",
    metadata: {
      wordingId: wording.id,
      specialty,
      consentType,
      wordingType,
      lifecycleStage: payload.isActive === false ? "Retired" : "Approved",
    },
    request,
  });

  return wording;
}

export async function upsertProcedureCatalog(
  auth: AuthContext,
  payload: {
    id?: string;
    specialty?: string;
    procedureCode?: string;
    cptCode?: string;
    nameAr?: string;
    nameEn?: string;
    anesthesiaImplicationsAr?: string;
    anesthesiaImplicationsEn?: string;
    postProcedureAr?: string;
    postProcedureEn?: string;
    risks?: Array<{
      riskKey?: string;
      riskClass?: string;
      severity?: string;
      alertLevel?: string;
      probabilityIndicator?: number;
      isMandatoryDisclosure?: boolean;
      wordingAr?: string;
      wordingEn?: string;
      sortOrder?: number;
    }>;
    alternatives?: Array<{ wordingAr?: string; wordingEn?: string; sortOrder?: number }>;
    refusalConsequences?: Array<{ wordingAr?: string; wordingEn?: string; isLegallyCritical?: boolean; sortOrder?: number }>;
    expectedOutcomes?: Array<{ wordingAr?: string; wordingEn?: string; sortOrder?: number }>;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const specialty = (payload.specialty || "").trim().toUpperCase();
  const procedureCode = (payload.procedureCode || "").trim().toUpperCase();

  if (!specialty || !procedureCode || !payload.nameAr?.trim() || !payload.nameEn?.trim()) {
    throw new ApiError(400, "specialty, procedureCode, nameAr and nameEn are required");
  }

  const record = await prisma().$transaction(async (tx) => {
    const catalog = payload.id?.trim()
      ? await tx.consentProcedureCatalog.update({
          where: { id: payload.id.trim() },
          data: {
            specialty,
            procedureCode,
            cptCode: payload.cptCode?.trim() || null,
            nameAr: payload.nameAr!.trim(),
            nameEn: payload.nameEn!.trim(),
            anesthesiaImplicationsAr: payload.anesthesiaImplicationsAr?.trim() || null,
            anesthesiaImplicationsEn: payload.anesthesiaImplicationsEn?.trim() || null,
            postProcedureAr: payload.postProcedureAr?.trim() || null,
            postProcedureEn: payload.postProcedureEn?.trim() || null,
          },
        })
      : await tx.consentProcedureCatalog.create({
          data: {
            tenantId,
            specialty,
            procedureCode,
            cptCode: payload.cptCode?.trim() || null,
            nameAr: payload.nameAr!.trim(),
            nameEn: payload.nameEn!.trim(),
            anesthesiaImplicationsAr: payload.anesthesiaImplicationsAr?.trim() || null,
            anesthesiaImplicationsEn: payload.anesthesiaImplicationsEn?.trim() || null,
            postProcedureAr: payload.postProcedureAr?.trim() || null,
            postProcedureEn: payload.postProcedureEn?.trim() || null,
          },
        });

    await tx.consentProcedureRiskItem.deleteMany({ where: { tenantId, procedureId: catalog.id } });
    await tx.consentProcedureAlternative.deleteMany({ where: { tenantId, procedureId: catalog.id } });
    await tx.consentProcedureRefusalConsequence.deleteMany({ where: { tenantId, procedureId: catalog.id } });
    await tx.consentProcedureOutcome.deleteMany({ where: { tenantId, procedureId: catalog.id } });

    const risks = ensureArray(payload.risks).filter((item) => item.wordingAr?.trim() && item.wordingEn?.trim());
    if (risks.length > 0) {
      await tx.consentProcedureRiskItem.createMany({
        data: risks.map((item, index) => ({
          tenantId,
          procedureId: catalog.id,
          riskKey: (item.riskKey || `risk_${index + 1}`).trim().toLowerCase(),
          riskClass: normalizeRiskClass(item.riskClass),
          severity: normalizeRiskSeverity(item.severity),
          alertLevel: normalizeAlertLevel(item.alertLevel),
          probabilityIndicator: item.probabilityIndicator ?? null,
          isMandatoryDisclosure: item.isMandatoryDisclosure ?? false,
          sortOrder: item.sortOrder ?? (index + 1) * 10,
          wordingAr: item.wordingAr!.trim(),
          wordingEn: item.wordingEn!.trim(),
        })),
      });
    }

    const alternatives = ensureArray(payload.alternatives).filter((item) => item.wordingAr?.trim() && item.wordingEn?.trim());
    if (alternatives.length > 0) {
      await tx.consentProcedureAlternative.createMany({
        data: alternatives.map((item, index) => ({
          tenantId,
          procedureId: catalog.id,
          sortOrder: item.sortOrder ?? (index + 1) * 10,
          wordingAr: item.wordingAr!.trim(),
          wordingEn: item.wordingEn!.trim(),
        })),
      });
    }

    const refusal = ensureArray(payload.refusalConsequences).filter((item) => item.wordingAr?.trim() && item.wordingEn?.trim());
    if (refusal.length > 0) {
      await tx.consentProcedureRefusalConsequence.createMany({
        data: refusal.map((item, index) => ({
          tenantId,
          procedureId: catalog.id,
          sortOrder: item.sortOrder ?? (index + 1) * 10,
          wordingAr: item.wordingAr!.trim(),
          wordingEn: item.wordingEn!.trim(),
          isLegallyCritical: item.isLegallyCritical ?? false,
        })),
      });
    }

    const outcomes = ensureArray(payload.expectedOutcomes).filter((item) => item.wordingAr?.trim() && item.wordingEn?.trim());
    if (outcomes.length > 0) {
      await tx.consentProcedureOutcome.createMany({
        data: outcomes.map((item, index) => ({
          tenantId,
          procedureId: catalog.id,
          sortOrder: item.sortOrder ?? (index + 1) * 10,
          wordingAr: item.wordingAr!.trim(),
          wordingEn: item.wordingEn!.trim(),
        })),
      });
    }

    return catalog;
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: payload.id ? "consent_procedure_catalog_updated" : "consent_procedure_catalog_created",
    summary: `Procedure catalog ${procedureCode} ${payload.id ? "updated" : "created"}`,
    source: "committee",
    metadata: { procedureId: record.id, specialty, procedureCode },
    request,
  });

  return prisma().consentProcedureCatalog.findFirst({
    where: { id: record.id, tenantId },
    include: {
      riskItems: { orderBy: [{ sortOrder: "asc" }] },
      alternatives: { orderBy: [{ sortOrder: "asc" }] },
      refusalConsequences: { orderBy: [{ sortOrder: "asc" }] },
      expectedOutcomes: { orderBy: [{ sortOrder: "asc" }] },
    },
  });
}

export async function generateProcedureAwareContent(
  auth: AuthContext,
  id: string,
  payload: {
    procedureCode?: string;
    specialty?: string;
    procedureDetails?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const doc = await prisma().consentDocument.findFirst({ where: { tenantId, id }, include: { template: true } });
  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const fixedClauseChecksumBefore = computeFixedClauseChecksum(doc as unknown as Record<string, unknown>);
  const plannedAiUpdates = [
    "procedureDetails",
    "plannedProcedure",
    "physicianSpecialty",
    "risksAr",
    "risksEn",
    "alternativesAr",
    "alternativesEn",
    "refusalRisksAr",
    "refusalRisksEn",
    "expectedOutcomesAr",
    "expectedOutcomesEn",
  ];

  const prohibitedTouched = plannedAiUpdates.filter((field) => PROHIBITED_AI_FIELDS.has(field));
  if (prohibitedTouched.length > 0) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_ai_violation",
      summary: `AI attempted to modify prohibited fields for ${doc.consentReference}`,
      source: "ai-governance",
      consentDocumentId: id,
      caseId: doc.caseId,
      metadata: {
        prohibitedFields: prohibitedTouched,
        policy: "reject_entire_output",
      },
      request,
    });
    throw new ApiError(409, "AI output rejected by governance policy");
  }

  const nonWhitelisted = plannedAiUpdates.filter((field) => !AI_EDITABLE_FIELDS.has(field));
  if (nonWhitelisted.length > 0) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_ai_violation",
      summary: `AI attempted to modify non-whitelisted fields for ${doc.consentReference}`,
      source: "ai-governance",
      consentDocumentId: id,
      caseId: doc.caseId,
      metadata: {
        nonWhitelistedFields: nonWhitelisted,
        policy: "reject_entire_output",
      },
      request,
    });
    throw new ApiError(409, "AI output rejected by whitelist policy");
  }

  const specialty = (payload.specialty || doc.physicianSpecialty || doc.template.specialty || "GENERAL_MEDICINE").trim().toUpperCase();
  const procedureCode = (payload.procedureCode || doc.plannedProcedure || "").trim().toUpperCase();

  const procedure = await prisma().consentProcedureCatalog.findFirst({
    where: {
      tenantId,
      specialty,
      ...(procedureCode ? { procedureCode } : {}),
      isActive: true,
    },
    include: {
      riskItems: { orderBy: [{ sortOrder: "asc" }] },
      alternatives: { orderBy: [{ sortOrder: "asc" }] },
      refusalConsequences: { orderBy: [{ sortOrder: "asc" }] },
      expectedOutcomes: { orderBy: [{ sortOrder: "asc" }] },
    },
  });

  const prompt = await prisma().consentPromptRegistry.findFirst({
    where: { tenantId, specialty, consentType: doc.template.consentType, isActive: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  const refusalAr = procedure?.refusalConsequences.map((item) => `- ${item.wordingAr}`).join("\n")
    || "- ØªØ£Ø®ÙŠØ± Ø§Ù„ØªØ´Ø®ÙŠØµ ÙˆØ§Ù„Ø¹Ù„Ø§Ø¬\n- ØªÙØ§Ù‚Ù… Ø§Ù„Ø£Ø¹Ø±Ø§Ø¶\n- Ø²ÙŠØ§Ø¯Ø© Ø§Ø­ØªÙ…Ø§Ù„ Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø®Ø·Ø±Ø©";
  const refusalEn = procedure?.refusalConsequences.map((item) => `- ${item.wordingEn}`).join("\n")
    || "- Delayed diagnosis and treatment\n- Symptom progression\n- Increased risk of serious complications";

  const expectedAr = procedure?.expectedOutcomes.map((item) => `- ${item.wordingAr}`).join("\n")
    || doc.expectedOutcomesAr
    || "- ØªØ­Ø³Ù† ØªØ¯Ø±ÙŠØ¬ÙŠ Ù…Ø¹ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø³Ø±ÙŠØ±ÙŠØ©.";
  const expectedEn = procedure?.expectedOutcomes.map((item) => `- ${item.wordingEn}`).join("\n")
    || doc.expectedOutcomesEn
    || "- Gradual improvement with clinical follow-up.";

  const sanitizedRiskAr = sanitizeAiText((procedure?.riskItems || [])
    .sort((a, b) => RISK_CLASS_ORDER.indexOf(a.riskClass) - RISK_CLASS_ORDER.indexOf(b.riskClass) || a.sortOrder - b.sortOrder)
    .map((item) => `- [${item.riskClass}] ${item.wordingAr}`)
    .join("\n"));
  const sanitizedRiskEn = sanitizeAiText((procedure?.riskItems || [])
    .sort((a, b) => RISK_CLASS_ORDER.indexOf(a.riskClass) - RISK_CLASS_ORDER.indexOf(b.riskClass) || a.sortOrder - b.sortOrder)
    .map((item) => `- [${item.riskClass}] ${item.wordingEn}`)
    .join("\n"));
  const sanitizedRefusalAr = sanitizeAiText(refusalAr);
  const sanitizedRefusalEn = sanitizeAiText(refusalEn);
  const sanitizedExpectedAr = sanitizeAiText(expectedAr);
  const sanitizedExpectedEn = sanitizeAiText(expectedEn);

  const hallucinationSignals = [
    sanitizedRiskAr,
    sanitizedRiskEn,
    sanitizedRefusalAr,
    sanitizedRefusalEn,
    sanitizedExpectedAr,
    sanitizedExpectedEn,
  ].some((value) => hasHallucinationSignal(value));

  if (hallucinationSignals) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_ai_violation",
      summary: `AI hallucination signal detected for ${doc.consentReference}`,
      source: "ai-governance",
      consentDocumentId: id,
      caseId: doc.caseId,
      metadata: {
        policy: "reject_entire_output",
        reason: "hallucination_signal",
      },
      request,
    });
    throw new ApiError(409, "AI output rejected due to hallucination signal");
  }

  await prisma().$transaction(async (tx) => {
    await tx.consentDocumentRisk.deleteMany({ where: { tenantId, consentDocumentId: id } });

    if ((procedure?.riskItems.length || 0) > 0) {
      await tx.consentDocumentRisk.createMany({
        data: (procedure?.riskItems || []).map((item) => ({
          tenantId,
          consentDocumentId: id,
          sourceProcedureRiskId: item.id,
          riskClass: item.riskClass,
          severity: item.severity,
          alertLevel: item.alertLevel,
          probabilityIndicator: item.probabilityIndicator,
          isMandatoryDisclosure: item.isMandatoryDisclosure,
          sortOrder: item.sortOrder,
          wordingAr: item.wordingAr,
          wordingEn: item.wordingEn,
        })),
      });
    }

    const risksAr = sanitizedRiskAr;
    const risksEn = sanitizedRiskEn;

    await tx.consentDocument.update({
      where: { id },
      data: {
        procedureDetails: sanitizeAiText(payload.procedureDetails) || doc.procedureDetails,
        plannedProcedure: procedure?.nameEn || doc.plannedProcedure,
        physicianSpecialty: specialty,
        risksAr: risksAr || doc.risksAr,
        risksEn: risksEn || doc.risksEn,
        alternativesAr: sanitizeAiText(procedure?.alternatives.map((item) => `- ${item.wordingAr}`).join("\n")) || doc.alternativesAr,
        alternativesEn: sanitizeAiText(procedure?.alternatives.map((item) => `- ${item.wordingEn}`).join("\n")) || doc.alternativesEn,
        refusalRisksAr: sanitizedRefusalAr,
        refusalRisksEn: sanitizedRefusalEn,
        expectedOutcomesAr: sanitizedExpectedAr,
        expectedOutcomesEn: sanitizedExpectedEn,
        status: ConsentDocumentStatus.AI_DRAFT,
        aiGeneratedAt: new Date(),
        aiGeneratedByUserId: auth.sub,
        generatedByModel: prompt?.generatorModel || DEFAULT_GENERATOR_MODEL,
      },
    });

    await tx.consentGeneratedParagraph.createMany({
      data: [
        {
          tenantId,
          consentDocumentId: id,
          sectionKey: "risks",
          source: procedure ? "procedure_risk_repository" : "fallback_generation",
          specialty,
          promptVersion: prompt?.promptVersion || "1.0",
          generatorModel: prompt?.generatorModel || DEFAULT_GENERATOR_MODEL,
          physicianApprovalStatus: "PENDING",
          contentAr: risksAr,
          contentEn: risksEn,
          metadata: {
            promptId: prompt?.id || null,
            procedureId: procedure?.id || null,
            procedureCode,
          },
        },
        {
          tenantId,
          consentDocumentId: id,
          sectionKey: "refusal_risks",
          source: procedure ? "procedure_refusal_repository" : "fallback_generation",
          specialty,
          promptVersion: prompt?.promptVersion || "1.0",
          generatorModel: prompt?.generatorModel || DEFAULT_GENERATOR_MODEL,
          physicianApprovalStatus: "PENDING",
          contentAr: refusalAr,
          contentEn: refusalEn,
          metadata: {
            promptId: prompt?.id || null,
            procedureId: procedure?.id || null,
            procedureCode,
          },
        },
      ],
    });

    const refreshed = await tx.consentDocument.findFirst({ where: { id, tenantId } });
    if (!refreshed) {
      throw new ApiError(404, "Consent document not found after AI update");
    }
    const fixedClauseChecksumAfter = computeFixedClauseChecksum(refreshed as unknown as Record<string, unknown>);
    if (fixedClauseChecksumAfter !== fixedClauseChecksumBefore) {
      throw new ApiError(409, "AI attempted to overwrite protected legal wording");
    }
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_specialty_intelligence_generated",
    summary: `Specialty-aware consent intelligence generated for ${doc.consentReference}`,
    source: "ai-governance",
    consentDocumentId: id,
    caseId: doc.caseId,
    metadata: {
      specialty,
      procedureCode,
      promptVersion: prompt?.promptVersion || "1.0",
      generatorModel: prompt?.generatorModel || DEFAULT_GENERATOR_MODEL,
      fixedClauseChecksum: fixedClauseChecksumBefore,
      hallucinationHooksPassed: true,
    },
    request,
  });

  return getConsentDocument(auth, id);
}

export async function listConsentTimeline(auth: AuthContext, id: string) {
  const tenantId = requireTenantId(auth);
  const doc = await prisma().consentDocument.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  return prisma().consentTimelineEvent.findMany({
    where: { tenantId, consentDocumentId: id },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function submitCommitteeReview(
  auth: AuthContext,
  payload: {
    consentDocumentId?: string;
    templateId?: string;
    templateVersionId?: string;
    committeeType?: string;
    decision?: string;
    commentsAr?: string;
    commentsEn?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const committeeType = (payload.committeeType || "LEGAL").trim().toUpperCase() as ConsentCommitteeType;
  const decision = (payload.decision || "PENDING").trim().toUpperCase() as ConsentReviewDecision;

  if (!Object.values(ConsentCommitteeType).includes(committeeType)) {
    throw new ApiError(400, "Invalid committeeType");
  }
  if (!Object.values(ConsentReviewDecision).includes(decision)) {
    throw new ApiError(400, "Invalid review decision");
  }

  const review = await prisma().consentCommitteeReview.create({
    data: {
      tenantId,
      consentDocumentId: payload.consentDocumentId?.trim() || null,
      templateId: payload.templateId?.trim() || null,
      templateVersionId: payload.templateVersionId?.trim() || null,
      committeeType,
      decision,
      reviewerUserId: auth.sub,
      commentsAr: payload.commentsAr?.trim() || null,
      commentsEn: payload.commentsEn?.trim() || null,
      reviewedAt: decision === ConsentReviewDecision.PENDING ? null : new Date(),
    },
  });

  if (payload.templateVersionId?.trim()) {
    const versionId = payload.templateVersionId.trim();
    const target = await prisma().consentTemplateVersion.findFirst({ where: { id: versionId, tenantId } });
    if (!target) {
      throw new ApiError(404, "Template version not found");
    }

    const currentLifecycle = asRecord(asRecord(target.metadata)?.lifecycle) || {};
    const stageByCommittee: Record<ConsentCommitteeType, string> = {
      LEGAL: "Legal Review",
      MEDICAL: "Medical Review",
      QUALITY: "Medical Review",
      COMPLIANCE: "Compliance Review",
    };

    const status =
      decision === ConsentReviewDecision.APPROVED && committeeType === ConsentCommitteeType.COMPLIANCE
        ? ConsentTemplateStatus.APPROVED
        : ConsentTemplateStatus.UNDER_REVIEW;

    await prisma().consentTemplateVersion.update({
      where: { id: versionId },
      data: {
        status,
        metadata: {
          ...(asRecord(target.metadata) || {}),
          lifecycle: {
            ...currentLifecycle,
            stage: decision === ConsentReviewDecision.REJECTED ? "Draft" : stageByCommittee[committeeType],
            lastCommittee: committeeType,
            lastDecision: decision,
            transitionedAt: new Date().toISOString(),
            transitionedBy: auth.sub,
          },
        } as JsonInputValue,
      },
    });
  }

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_committee_review_submitted",
    summary: `${committeeType} review submitted (${decision})`,
    source: "committee",
    consentDocumentId: payload.consentDocumentId?.trim() || undefined,
    templateId: payload.templateId?.trim() || undefined,
    templateVersionId: payload.templateVersionId?.trim() || undefined,
    metadata: {
      committeeType,
      decision,
      reviewId: review.id,
      commentsAr: payload.commentsAr?.trim() || null,
      commentsEn: payload.commentsEn?.trim() || null,
    },
    request,
  });

  return review;
}

export async function listCommitteeReviews(
  auth: AuthContext,
  args: {
    consentDocumentId?: string;
    templateVersionId?: string;
    committeeType?: string;
  } = {},
) {
  const tenantId = requireTenantId(auth);

  return prisma().consentCommitteeReview.findMany({
    where: {
      tenantId,
      ...(args.consentDocumentId ? { consentDocumentId: args.consentDocumentId } : {}),
      ...(args.templateVersionId ? { templateVersionId: args.templateVersionId } : {}),
      ...(args.committeeType ? { committeeType: args.committeeType as ConsentCommitteeType } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
}

export async function upsertConsentEmrMapping(
  auth: AuthContext,
  consentDocumentId: string,
  payload: {
    adapterKey?: string;
    diagnosisCode?: string;
    procedureCode?: string;
    physicianIdentifier?: string;
    encounterIdentifier?: string;
    allergiesSnapshot?: unknown;
    medicationsSnapshot?: unknown;
    consentHistoryRef?: string;
    sourceSystem?: string;
    sourceTransactionId?: string;
    sourceSnapshot?: unknown;
    isManualOverride?: boolean;
    overrideReason?: string;
  },
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const doc = await prisma().consentDocument.findFirst({ where: { tenantId, id: consentDocumentId } });
  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const adapterKey = (payload.adapterKey || "trakcare").trim();
  const isManualOverride = payload.isManualOverride === true;
  const overrideReason = payload.overrideReason?.trim() || null;
  const sourceSystem = payload.sourceSystem?.trim() || "TRAKCARE";
  const sourceTransactionId = payload.sourceTransactionId?.trim() || null;

  if (isManualOverride) {
    if (!overrideReason) {
      throw new ApiError(400, "Manual override reason is required");
    }

    if (!hasInformedConsentPermission(auth, "consent:approve")) {
      throw new ApiError(403, "Manual override requires consent approval permission");
    }
  }

  const allergiesSnapshot =
    payload.allergiesSnapshot === undefined
      ? undefined
      : payload.allergiesSnapshot === null
        ? Prisma.JsonNull
        : (payload.allergiesSnapshot as JsonInputValue);
  const medicationsSnapshot =
    payload.medicationsSnapshot === undefined
      ? undefined
      : payload.medicationsSnapshot === null
        ? Prisma.JsonNull
        : (payload.medicationsSnapshot as JsonInputValue);

  const mapping = await prisma().consentEmrMapping.upsert({
    where: {
      id: `${tenantId}:${consentDocumentId}:${adapterKey}`,
    },
    update: {
      diagnosisCode: payload.diagnosisCode?.trim() || null,
      procedureCode: payload.procedureCode?.trim() || null,
      physicianIdentifier: payload.physicianIdentifier?.trim() || null,
      encounterIdentifier: payload.encounterIdentifier?.trim() || null,
      allergiesSnapshot,
      medicationsSnapshot,
      consentHistoryRef: payload.consentHistoryRef?.trim() || null,
      metadata: {
        sourceSystem,
        sourceTransactionId,
        isManualOverride,
        overrideReason,
      } as JsonInputValue,
      externalPayload:
        payload.sourceSnapshot === undefined
          ? undefined
          : payload.sourceSnapshot === null
            ? Prisma.JsonNull
            : (payload.sourceSnapshot as JsonInputValue),
    },
    create: {
      id: `${tenantId}:${consentDocumentId}:${adapterKey}`,
      tenantId,
      consentDocumentId,
      adapterKey,
      diagnosisCode: payload.diagnosisCode?.trim() || null,
      procedureCode: payload.procedureCode?.trim() || null,
      physicianIdentifier: payload.physicianIdentifier?.trim() || null,
      encounterIdentifier: payload.encounterIdentifier?.trim() || null,
      allergiesSnapshot,
      medicationsSnapshot,
      consentHistoryRef: payload.consentHistoryRef?.trim() || null,
      metadata: {
        sourceSystem,
        sourceTransactionId,
        isManualOverride,
        overrideReason,
      } as JsonInputValue,
      externalPayload:
        payload.sourceSnapshot === undefined
          ? undefined
          : payload.sourceSnapshot === null
            ? Prisma.JsonNull
            : (payload.sourceSnapshot as JsonInputValue),
    },
  });

  if (payload.sourceSnapshot !== undefined) {
    await prisma().consentSourceSnapshot.create({
      data: {
        tenantId,
        consentDocumentId,
        sourceSystem,
        sourceType: isManualOverride ? "MANUAL_OVERRIDE" : "TRAKCARE_LIVE",
        sourceTransactionId,
        capturedByUserId: auth.sub,
        isManualOverride,
        overrideReason,
        snapshot:
          payload.sourceSnapshot === null
            ? ({ value: null } as JsonInputValue)
            : ((payload.sourceSnapshot as JsonInputValue) || ({ value: null } as JsonInputValue)),
        metadata: {
          adapterKey,
        } as JsonInputValue,
      },
    });
  }

  await prisma().consentDocument.update({
    where: { id: consentDocumentId },
    data: {
      metadata: {
        ...(asRecord(doc.metadata) || {}),
        sourceOfTruth: {
          system: sourceSystem,
          sourceTransactionId,
          isManualOverride,
          overrideReason,
          capturedAt: new Date().toISOString(),
          capturedByUserId: auth.sub,
        },
      } as JsonInputValue,
    },
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_emr_mapping_upserted",
    summary: `EMR adapter mapping upserted (${adapterKey})`,
    source: "integration",
    consentDocumentId,
    caseId: doc.caseId,
    metadata: {
      adapterKey,
      mappingId: mapping.id,
      sourceSystem,
      sourceTransactionId,
      isManualOverride,
      overrideReason,
    },
    request,
  });

  return mapping;
}
