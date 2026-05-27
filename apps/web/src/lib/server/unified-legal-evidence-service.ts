import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

const OTP_PROVIDER_KEY = "public_signing_otp";
const UNIFIED_EVIDENCE_VERSION = "phase7c.v1";

type JsonObject = Record<string, unknown>;

type OtpEventRow = {
  id: string;
  event_type: string;
  raw_payload: unknown;
  received_at: Date | string;
};

type TimelineEntry = {
  source: string;
  eventType: string;
  timestamp: string | null;
  summary: string | null;
  metadata: JsonObject;
};

type StoredUnifiedEvidenceRecord = {
  version: string;
  generatedAt: string;
  hash: {
    algorithm: "sha256";
    value: string;
  };
  certificate: UnifiedEvidenceCertificate;
  snapshot: UnifiedEvidenceSnapshot;
};

export type UnifiedEvidenceSnapshot = {
  patientIdentity: {
    patientName: string;
    mrn: string | null;
    patientIdNumber: string | null;
  };
  education: {
    packageId: string | null;
    versionId: string | null;
    hash: string | null;
  };
  consent: {
    templateId: string;
    versionId: string;
    hash: string;
  };
  decision: {
    status: "ACCEPTED" | "REFUSED" | "UNDECIDED";
  };
  otp: {
    challengeId: string | null;
    verifiedTimestamp: string | null;
  };
  signature: {
    signatureId: string | null;
    certificateId: string | null;
  };
  technical: {
    ipAddress: string | null;
    userAgent: string | null;
  };
  audit: {
    timeline: TimelineEntry[];
  };
};

export type UnifiedEvidenceCertificate = {
  id: string;
  documentId: string;
  unifiedEvidenceHash: string;
  createdAt: string;
  evidenceVersion: string;
};

export type UnifiedEvidenceResult = {
  documentId: string;
  existingEvidencePackageIds: string[];
  unifiedHash: string;
  certificate: UnifiedEvidenceCertificate;
  snapshot: UnifiedEvidenceSnapshot;
  reused: boolean;
};

function prisma() {
  return getPrisma();
}

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown): string | null {
  const normalized = getString(value);
  return normalized || null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (value && typeof value === "object") {
    return Object.keys(value as JsonObject)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = stableValue((value as JsonObject)[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function stableSerialize(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableSerialize(value), "utf8").digest("hex");
}

function parseOtpPayload(raw: unknown): JsonObject {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return asRecord(raw);
}

function normalizeDecisionStatus(value: unknown): UnifiedEvidenceSnapshot["decision"]["status"] {
  const normalized = getString(value).toUpperCase();
  if (normalized === "CONSENT_ACCEPTED" || normalized === "ACCEPTED") return "ACCEPTED";
  if (normalized === "CONSENT_REFUSED" || normalized === "REFUSED") return "REFUSED";
  return "UNDECIDED";
}

function buildConsentHash(doc: {
  id: string;
  consentReference: string;
  templateId: string;
  templateVersionId: string;
  diagnosis: string | null;
  plannedProcedure: string | null;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
  aiWarningAr: string;
  aiWarningEn: string;
  sections: Array<{
    sectionKey: string;
    sectionKind: string;
    titleAr: string;
    titleEn: string;
    contentAr: string;
    contentEn: string;
    sortOrder: number;
  }>;
}): string {
  return sha256({
    documentId: doc.id,
    consentReference: doc.consentReference,
    templateId: doc.templateId,
    templateVersionId: doc.templateVersionId,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    legalTextAr: doc.legalTextAr,
    legalTextEn: doc.legalTextEn,
    pdplTextAr: doc.pdplTextAr,
    pdplTextEn: doc.pdplTextEn,
    witnessDeclAr: doc.witnessDeclAr,
    witnessDeclEn: doc.witnessDeclEn,
    physicianCertAr: doc.physicianCertAr,
    physicianCertEn: doc.physicianCertEn,
    aiWarningAr: doc.aiWarningAr,
    aiWarningEn: doc.aiWarningEn,
    sections: doc.sections.map((section) => ({
      sectionKey: section.sectionKey,
      sectionKind: section.sectionKind,
      titleAr: section.titleAr,
      titleEn: section.titleEn,
      contentAr: section.contentAr,
      contentEn: section.contentEn,
      sortOrder: section.sortOrder,
    })),
  });
}

async function readOtpEvents(documentId: string): Promise<OtpEventRow[]> {
  return prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, event_type, raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type IN ('OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_VERIFY_FAILED')
       AND raw_payload ->> 'documentId' = $2
     ORDER BY received_at ASC`,
    OTP_PROVIDER_KEY,
    documentId,
  );
}

function buildTimeline(args: {
  auditEvents: Array<{
    action: string;
    source: string | null;
    summary: string;
    createdAt: Date;
    metadata: unknown;
  }>;
  otpEvents: OtpEventRow[];
  signatures: Array<{
    id: string;
    role: string;
    signerName: string;
    signedAt: Date;
    signatureMethod: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: unknown;
  }>;
  refusalSignature: JsonObject;
}): TimelineEntry[] {
  const auditTimeline = args.auditEvents.map((event) => ({
    source: event.source || "consent_audit_event",
    eventType: event.action,
    timestamp: event.createdAt.toISOString(),
    summary: event.summary,
    metadata: asRecord(event.metadata),
  }));

  const otpTimeline = args.otpEvents.map((event) => ({
    source: "webhook_events",
    eventType: event.event_type,
    timestamp: toIsoString(event.received_at),
    summary: event.event_type,
    metadata: parseOtpPayload(event.raw_payload),
  }));

  const signatureTimeline = args.signatures.map((signature) => ({
    source: "consent_document_signature",
    eventType: `${signature.role}_SIGNATURE_RECORDED`,
    timestamp: signature.signedAt.toISOString(),
    summary: `${signature.role} signature recorded`,
    metadata: {
      signerName: signature.signerName,
      signatureMethod: signature.signatureMethod,
      ipAddress: signature.ipAddress,
      userAgent: signature.userAgent,
      ...asRecord(signature.metadata),
    },
  }));

  const refusalCapturedAt = getNullableString(args.refusalSignature.capturedAt);
  const refusalSignatureId = getNullableString(args.refusalSignature.signatureId);
  const refusalTimeline = refusalCapturedAt && refusalSignatureId
    ? [{
      source: "refusal_signature_metadata",
      eventType: "REFUSAL_SIGNATURE_RECORDED",
      timestamp: refusalCapturedAt,
      summary: "Refusal signature recorded",
      metadata: args.refusalSignature,
    } satisfies TimelineEntry]
    : [];

  return [...auditTimeline, ...otpTimeline, ...signatureTimeline, ...refusalTimeline]
    .sort((left, right) => {
      const leftTime = Date.parse(left.timestamp || "") || 0;
      const rightTime = Date.parse(right.timestamp || "") || 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return `${left.source}:${left.eventType}`.localeCompare(`${right.source}:${right.eventType}`);
    });
}

function getExistingUnifiedEvidence(metadata: unknown): StoredUnifiedEvidenceRecord | null {
  const candidate = asRecord(asRecord(metadata).unifiedEvidence);
  const hash = asRecord(candidate.hash);
  const certificate = asRecord(candidate.certificate);
  const snapshot = asRecord(candidate.snapshot);

  if (!getString(candidate.version) || !getString(hash.value) || !getString(certificate.id) || Object.keys(snapshot).length === 0) {
    return null;
  }

  return {
    version: getString(candidate.version),
    generatedAt: getString(candidate.generatedAt),
    hash: {
      algorithm: "sha256",
      value: getString(hash.value),
    },
    certificate: {
      id: getString(certificate.id),
      documentId: getString(certificate.documentId),
      unifiedEvidenceHash: getString(certificate.unifiedEvidenceHash),
      createdAt: getString(certificate.createdAt),
      evidenceVersion: getString(certificate.evidenceVersion),
    },
    snapshot: snapshot as unknown as UnifiedEvidenceSnapshot,
  };
}

export async function buildUnifiedEvidenceSnapshot(tenantId: string, documentId: string): Promise<{
  snapshot: UnifiedEvidenceSnapshot;
  evidencePackageIds: string[];
}> {
  const normalizedTenantId = (tenantId || "").trim();
  const normalizedDocumentId = (documentId || "").trim();
  if (!normalizedTenantId) throw new ApiError(400, "Missing tenant context");
  if (!normalizedDocumentId) throw new ApiError(400, "Document ID is required");

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId: normalizedTenantId, id: normalizedDocumentId },
    include: {
      case: {
        select: {
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
      sections: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          sectionKey: true,
          sectionKind: true,
          titleAr: true,
          titleEn: true,
          contentAr: true,
          contentEn: true,
          sortOrder: true,
        },
      },
      signatures: {
        orderBy: { signedAt: "asc" },
        select: {
          id: true,
          role: true,
          signerName: true,
          signatureMethod: true,
          signedAt: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
        },
      },
      auditEvents: {
        orderBy: { createdAt: "asc" },
        select: {
          action: true,
          source: true,
          summary: true,
          metadata: true,
          createdAt: true,
        },
      },
      evidencePackages: {
        orderBy: { generatedAt: "asc" },
        select: { id: true },
      },
    },
  });

  if (!doc) throw new ApiError(404, "Consent document not found");

  const metadata = asRecord(doc.metadata);
  const executionContext = asRecord(metadata.executionContext);
  const decisionContext = asRecord(executionContext.decision);
  const refusalSignature = asRecord(decisionContext.refusalSignature);
  const educationEvent = [...doc.auditEvents]
    .reverse()
    .find((event) => event.action.startsWith("EDUCATION_") || (event.source || "").toLowerCase() === "patient-education") || null;
  const educationMetadata = asRecord(educationEvent?.metadata);
  const otpEvents = await readOtpEvents(doc.id);
  const otpVerified = [...otpEvents].reverse().find((event) => event.event_type === "OTP_VERIFIED") || null;
  const otpVerifiedPayload = parseOtpPayload(otpVerified?.raw_payload);
  const decisionEvent = [...doc.auditEvents]
    .reverse()
    .find((event) => event.action === "CONSENT_ACCEPTED" || event.action === "CONSENT_REFUSED") || null;
  const decisionStatus = decisionEvent
    ? normalizeDecisionStatus(decisionEvent.action)
    : normalizeDecisionStatus(decisionContext.decisionStatus);

  const acceptedSignature = doc.signatures[doc.signatures.length - 1] || null;
  const acceptedSignatureMetadata = asRecord(acceptedSignature?.metadata);
  const technicalAuditMetadata = [...doc.auditEvents]
    .reverse()
    .map((event) => asRecord(event.metadata))
    .find((eventMetadata) => getNullableString(eventMetadata.ipAddress) || getNullableString(eventMetadata.userAgent)) || {};

  const signatureId = decisionStatus === "REFUSED"
    ? getNullableString(refusalSignature.signatureId)
    : acceptedSignature?.id || null;
  const certificateId = decisionStatus === "REFUSED"
    ? getNullableString(refusalSignature.certificateId)
    : getNullableString(acceptedSignatureMetadata.certificateId);

  const ipAddress = decisionStatus === "REFUSED"
    ? getNullableString(refusalSignature.ipAddress) || getNullableString(technicalAuditMetadata.ipAddress)
    : acceptedSignature?.ipAddress || getNullableString(technicalAuditMetadata.ipAddress);
  const userAgent = decisionStatus === "REFUSED"
    ? getNullableString(refusalSignature.userAgent) || getNullableString(technicalAuditMetadata.userAgent)
    : acceptedSignature?.userAgent || getNullableString(technicalAuditMetadata.userAgent);

  const snapshot: UnifiedEvidenceSnapshot = {
    patientIdentity: {
      patientName: doc.patientName,
      mrn: getNullableString(doc.mrn) || getNullableString(doc.case?.medicalRecordNo),
      patientIdNumber: getNullableString(doc.case?.patientIdNumber),
    },
    education: {
      packageId: getNullableString(educationMetadata.packageId),
      versionId: getNullableString(educationMetadata.educationVersionId),
      hash: getNullableString(educationMetadata.contentHash),
    },
    consent: {
      templateId: doc.templateId,
      versionId: doc.templateVersionId,
      hash: buildConsentHash({
        id: doc.id,
        consentReference: doc.consentReference,
        templateId: doc.templateId,
        templateVersionId: doc.templateVersionId,
        diagnosis: doc.diagnosis,
        plannedProcedure: doc.plannedProcedure,
        legalTextAr: doc.legalTextAr,
        legalTextEn: doc.legalTextEn,
        pdplTextAr: doc.pdplTextAr,
        pdplTextEn: doc.pdplTextEn,
        witnessDeclAr: doc.witnessDeclAr,
        witnessDeclEn: doc.witnessDeclEn,
        physicianCertAr: doc.physicianCertAr,
        physicianCertEn: doc.physicianCertEn,
        aiWarningAr: doc.aiWarningAr,
        aiWarningEn: doc.aiWarningEn,
        sections: doc.sections,
      }),
    },
    decision: {
      status: decisionStatus,
    },
    otp: {
      challengeId: getNullableString(otpVerifiedPayload.challengeId),
      verifiedTimestamp: toIsoString(otpVerified?.received_at),
    },
    signature: {
      signatureId,
      certificateId,
    },
    technical: {
      ipAddress,
      userAgent,
    },
    audit: {
      timeline: buildTimeline({
        auditEvents: doc.auditEvents,
        otpEvents,
        signatures: doc.signatures,
        refusalSignature,
      }),
    },
  };

  return {
    snapshot,
    evidencePackageIds: doc.evidencePackages.map((item) => item.id),
  };
}

export async function generateUnifiedEvidenceRecord(input: {
  tenantId: string;
  documentId: string;
}): Promise<UnifiedEvidenceResult> {
  const normalizedTenantId = (input.tenantId || "").trim();
  const normalizedDocumentId = (input.documentId || "").trim();
  const { snapshot, evidencePackageIds } = await buildUnifiedEvidenceSnapshot(normalizedTenantId, normalizedDocumentId);
  const unifiedHash = sha256(snapshot);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId: normalizedTenantId, id: normalizedDocumentId },
    select: {
      id: true,
      metadata: true,
    },
  });

  if (!doc) throw new ApiError(404, "Consent document not found");

  const existing = getExistingUnifiedEvidence(doc.metadata);
  if (existing && existing.version === UNIFIED_EVIDENCE_VERSION && existing.hash.value === unifiedHash) {
    return {
      documentId: doc.id,
      existingEvidencePackageIds: evidencePackageIds,
      unifiedHash,
      certificate: existing.certificate,
      snapshot: existing.snapshot,
      reused: true,
    };
  }

  const createdAt = new Date().toISOString();
  const certificate: UnifiedEvidenceCertificate = {
    id: crypto.randomUUID(),
    documentId: doc.id,
    unifiedEvidenceHash: unifiedHash,
    createdAt,
    evidenceVersion: UNIFIED_EVIDENCE_VERSION,
  };

  const unifiedEvidence: StoredUnifiedEvidenceRecord = {
    version: UNIFIED_EVIDENCE_VERSION,
    generatedAt: createdAt,
    hash: {
      algorithm: "sha256",
      value: unifiedHash,
    },
    certificate,
    snapshot,
  };

  await prisma().consentDocument.update({
    where: { id: doc.id },
    data: {
      metadata: {
        ...asRecord(doc.metadata),
        unifiedEvidence,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    documentId: doc.id,
    existingEvidencePackageIds: evidencePackageIds,
    unifiedHash,
    certificate,
    snapshot,
    reused: false,
  };
}

export async function getStoredUnifiedEvidenceRecord(input: {
  tenantId: string;
  documentId: string;
}): Promise<UnifiedEvidenceResult | null> {
  const normalizedTenantId = (input.tenantId || "").trim();
  const normalizedDocumentId = (input.documentId || "").trim();
  if (!normalizedTenantId) throw new ApiError(400, "Missing tenant context");
  if (!normalizedDocumentId) throw new ApiError(400, "Document ID is required");

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId: normalizedTenantId, id: normalizedDocumentId },
    select: {
      id: true,
      metadata: true,
      evidencePackages: {
        orderBy: { generatedAt: "asc" },
        select: { id: true },
      },
    },
  });

  if (!doc) throw new ApiError(404, "Consent document not found");

  const existing = getExistingUnifiedEvidence(doc.metadata);
  if (!existing) return null;

  return {
    documentId: doc.id,
    existingEvidencePackageIds: doc.evidencePackages.map((item) => item.id),
    unifiedHash: existing.hash.value,
    certificate: existing.certificate,
    snapshot: existing.snapshot,
    reused: true,
  };
}