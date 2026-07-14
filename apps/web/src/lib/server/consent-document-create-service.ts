import crypto from "node:crypto";
import { Prisma, PrismaClient, type ConsentDocument } from "@prisma/client";
import { $Enums, ConsentDocumentStatus, ConsentSectionKind } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeConsentAudit, writeConsentAuditInTx } from "@/lib/server/consent-audit-service";
import {
  computePayloadFingerprint,
  validateIdempotencyKey,
} from "@/lib/server/idempotency-core";
import { evaluateWitnessPolicy } from "@/lib/server/witness-policy-service";
import { resolveTemplateWitnessPolicy } from "@/lib/server/witness-policy-profiles";

const prisma = () => getPrisma();

export class IdempotencyConflictError extends ApiError {
  public readonly existingDocumentId: string;

  constructor(existingDocumentId: string) {
    super(409, `Idempotency conflict: existing document ${existingDocumentId}`, {
      code: "IDEMPOTENCY_CONFLICT",
    });
    this.existingDocumentId = existingDocumentId;
  }
}

type GovernanceEditableBy = "PHYSICIAN" | "AI_ASSIST" | "SYSTEM" | "GOVERNANCE";

type FieldGovernanceRule = {
  editableBy: GovernanceEditableBy;
  aiAllowed: boolean;
  requiresApproval: boolean;
  auditRequired: boolean;
  bilingualSyncRequired: boolean;
};

type BilingualSyncIssue = {
  code: "missing_language" | "mismatch" | "inconsistent_approval" | "orphan_wording";
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
  if (sectionKind === $Enums.ConsentSectionKind.FIXED_LEGAL) {
    return {
      editableBy: "GOVERNANCE",
      aiAllowed: false,
      requiresApproval: true,
      auditRequired: true,
      bilingualSyncRequired: true,
    };
  }

  if (sectionKind === $Enums.ConsentSectionKind.DYNAMIC_MEDICAL) {
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

function nowIsoStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function generateReference(prefix: string): string {
  const tail = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${nowIsoStamp()}-${tail}`;
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
  idempotencyKey?: string;
  idempotencyFingerprint?: string;
  metadata?: Record<string, unknown>;
  /** Runtime witness-policy trigger facts captured at creation time. */
  witnessTriggerFacts?: {
    substituteDecisionMaker?: boolean;
    lacksCapacity?: boolean;
    cannotReadOrUseJourney?: boolean;
    communicationBarrier?: boolean;
    disputedOrObjected?: boolean;
    refusalOrAma?: boolean;
  };
};

export function buildConsentDocumentFingerprint(
  payload: CreateConsentDocumentPayload,
  templateVersionId: string,
): string {
  const medicalPayload = {
    caseId: payload.caseId?.trim(),
    templateId: payload.templateId?.trim(),
    templateVersionId: templateVersionId.trim(),
    language: payload.language || "bilingual",
    physicianName: payload.physicianName?.trim() || null,
    physicianLicense: payload.physicianLicense?.trim() || null,
    physicianSpecialty: payload.physicianSpecialty?.trim() || null,
    department: payload.department?.trim() || null,
    diagnosis: payload.diagnosis?.trim() || null,
    plannedProcedure: payload.plannedProcedure?.trim() || null,
    admissionDetails: payload.admissionDetails?.trim() || null,
    procedureDetails: payload.procedureDetails?.trim() || null,
    physicianNotesAr: payload.physicianNotesAr?.trim() || null,
    physicianNotesEn: payload.physicianNotesEn?.trim() || null,
  };
  return computePayloadFingerprint(medicalPayload);
}

async function findExistingConsentDocumentByKey(
  client: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  idempotencyKey: string,
): Promise<{ id: string; idempotencyFingerprint: string | null } | null> {
  const doc = await client.consentDocument.findFirst({
    where: { tenantId, idempotencyKey },
    select: { id: true, idempotencyFingerprint: true },
  });
  return doc
    ? { id: doc.id, idempotencyFingerprint: doc.idempotencyFingerprint }
    : null;
}

async function getConsentDocument(
  auth: AuthContext,
  id: string,
  client?: PrismaClient | Prisma.TransactionClient,
) {
  const tenantId = requireTenantId(auth);
  const db = client ?? prisma();
  const document = await db.consentDocument.findFirst({
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

export async function createConsentDocument(
  auth: AuthContext,
  payload: CreateConsentDocumentPayload,
  request?: NextRequest,
  client?: PrismaClient,
) {
  const db = client ?? prisma();
  const tenantId = requireTenantId(auth);
  const caseId = payload.caseId?.trim();
  const templateId = payload.templateId?.trim();

  if (!caseId || !templateId) {
    throw new ApiError(400, "caseId and templateId are required");
  }

  const caseRecord = await db.case.findFirst({
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

  const template = await db.consentTemplate.findFirst({
    where: { id: templateId, tenantId },
  });

  if (!template) {
    throw new ApiError(404, "Template not found");
  }

  // Interpreter signing workflows remain outside the current scope.
  // Witness requirements are no longer a creation blocker: the typed,
  // versioned witness policy is evaluated at runtime and enforced at the
  // send/signature/finalization transitions instead.
  if (template.requiresInterpreter) {
    throw new ApiError(
      422,
      "This consent template requires an interpreter, which is not yet supported in the pilot scope.",
    );
  }

  const templateVersionId = payload.templateVersionId?.trim() || template.currentVersionId || undefined;
  if (!templateVersionId) {
    throw new ApiError(400, "Template has no active version");
  }

  const version = await db.consentTemplateVersion.findFirst({
    where: {
      id: templateVersionId,
      tenantId,
      templateId,
    },
  });

  if (!version) {
    throw new ApiError(404, "Template version not found");
  }

  // Resolve the effective witness policy: explicit template metadata policy
  // wins; otherwise a governed code-controlled registry profile may apply
  // (exact templateCode + version gate, fail closed on mismatch).
  const resolvedWitnessPolicy = resolveTemplateWitnessPolicy({
    metadata: template.metadata,
    templateCode: template.templateCode,
    templateVersionLabel: version.versionLabel,
  });
  const witnessPolicyDecision = evaluateWitnessPolicy({
    templateRequiresWitness: template.requiresWitness,
    templateRiskLevel: template.riskLevel,
    templatePolicy: resolvedWitnessPolicy.policy,
    templatePolicySource: resolvedWitnessPolicy.policySource ?? undefined,
    triggers: payload.witnessTriggerFacts,
  });

  let idempotencyKey: string | undefined;
  let idempotencyFingerprint: string | undefined;

  if (payload.idempotencyKey) {
    validateIdempotencyKey(payload.idempotencyKey);
    idempotencyKey = payload.idempotencyKey;
    idempotencyFingerprint = buildConsentDocumentFingerprint(payload, version.id);

    if (
      payload.idempotencyFingerprint &&
      payload.idempotencyFingerprint !== idempotencyFingerprint
    ) {
      const existing = await findExistingConsentDocumentByKey(db, tenantId, idempotencyKey);
      throw new IdempotencyConflictError(existing?.id ?? "unknown");
    }

    const existing = await findExistingConsentDocumentByKey(db, tenantId, idempotencyKey);
    if (existing) {
      if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
        throw new IdempotencyConflictError(existing.id);
      }
      return getConsentDocument(auth, existing.id, db);
    }
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

  const versionSections = await db.consentTemplateSection.findMany({
    where: {
      tenantId,
      templateVersionId: version.id,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const emrMeta = (caseRecord.metadata || {}) as Record<string, unknown>;

  try {
    const created = await db.$transaction(async (tx) => {
      const consentDocument = await tx.consentDocument.create({
        data: {
          tenantId,
          caseId,
          templateId,
          templateVersionId: version.id,
          consentReference: generateReference("IC"),
          status: ConsentDocumentStatus.DRAFT,
          language: payload.language || "bilingual",
          idempotencyKey: idempotencyKey ?? null,
          idempotencyFingerprint: idempotencyFingerprint ?? null,
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
            witnessPolicyDecision: witnessPolicyDecision as unknown as Prisma.InputJsonValue,
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
          } as Prisma.InputJsonValue,
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
            } as Prisma.InputJsonValue,
          })),
        });
      }

      await writeConsentAuditInTx(tx, {
        tenantId,
        actorUserId: auth.sub,
        actorRole: auth.role || null,
        action: "WITNESS_POLICY_EVALUATED",
        summary: `Witness policy evaluated for ${consentDocument.consentReference}: ${witnessPolicyDecision.witnessMode} (required witnesses: ${witnessPolicyDecision.requiredWitnessCount})`,
        source: "policy",
        consentDocumentId: consentDocument.id,
        templateId,
        templateVersionId: version.id,
        caseId,
        metadata: {
          decision: witnessPolicyDecision as unknown as Prisma.InputJsonValue,
        },
      });

      await writeConsentAuditInTx(tx, {
        tenantId,
        actorUserId: auth.sub,
        actorRole: auth.role || null,
        action: "consent_document_created",
        summary: `Consent document ${consentDocument.consentReference} created`,
        source: "workflow",
        consentDocumentId: consentDocument.id,
        templateId,
        templateVersionId: version.id,
        caseId,
        metadata: {
          consentReference: consentDocument.consentReference,
          templateCode: template.templateCode,
          status: consentDocument.status,
          idempotencyKey: idempotencyKey ?? null,
          idempotencyFingerprint: idempotencyFingerprint ?? null,
        },
      });

      return consentDocument;
    });

    return getConsentDocument(auth, created.id, db);
  } catch (error) {
    const isUniqueViolation =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (isUniqueViolation && idempotencyKey) {
      const existing = await findExistingConsentDocumentByKey(db, tenantId, idempotencyKey);
      if (existing) {
        if (existing.idempotencyFingerprint !== idempotencyFingerprint) {
          throw new IdempotencyConflictError(existing.id);
        }
        return getConsentDocument(auth, existing.id, db);
      }
    }
    throw error;
  }
}
