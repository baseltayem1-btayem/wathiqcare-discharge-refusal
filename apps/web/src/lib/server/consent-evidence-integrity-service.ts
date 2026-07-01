import crypto from "node:crypto";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

const prisma = () => getPrisma();

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export type EvidenceIntegrityCheck = {
  name: string;
  ok: boolean;
  expected?: string | null;
  actual?: string | null;
  message: string;
};

export type EvidenceIntegrityReport = {
  documentId: string;
  consentReference: string | null;
  ok: boolean;
  checks: EvidenceIntegrityCheck[];
  recomputedPackageHash: string | null;
  storedPackageHash: string | null;
  signedVersionLinkage: Record<string, unknown> | null;
};

/**
 * Builds a deterministic, reconstructible snapshot of the evidence for a
 * finalized consent document.  The snapshot is the canonical input to the
 * evidence-package checksum so that any independent verifier can recompute the
 * same SHA-256 digest from persisted records.
 */
export function buildEvidenceIntegritySnapshot(args: {
  doc: {
    id: string;
    consentReference: string;
    status: string;
    immutablePdfUrl: string | null;
    immutablePdfHash: string | null;
    finalizedAt: Date | null;
    finalizedByUserId: string | null;
    patientName: string;
    mrn: string | null;
    dob: string | null;
    gender: string | null;
    caseId: string;
    diagnosis: string | null;
    plannedProcedure: string | null;
    department: string | null;
    physicianName: string;
    physicianLicense: string | null;
    physicianSpecialty: string;
    metadata: unknown;
    template: { id: string; templateCode: string };
    templateVersion: { id: string; versionLabel: string; status: string };
    signatures: Array<{
      id: string;
      role: string;
      signerName: string;
      signedAt: Date;
      signatureMethod: string;
      signatureHash: string | null;
      metadata: unknown;
    }>;
    auditEvents: Array<{ id: string; action: string; createdAt: Date; metadata: unknown }>;
    timelineEvents: Array<{ id: string; action: string; createdAt: Date; metadata: unknown }>;
  };
  evidencePackageV2Id?: string | null;
  educationSummary?: string | null;
  consentSummary?: string | null;
  timelineSummary?: string | null;
  otpEventIds?: string[];
}): Record<string, unknown> {
  const doc = args.doc;
  const metadata = asRecord(doc.metadata);
  const wordingSnapshot = asRecord(metadata.finalizedWordingSnapshot);
  const signedVersionLinkage = asRecord(metadata.signedVersionLinkage);

  const templateSnapshot = {
    templateId: doc.template.id,
    templateCode: doc.template.templateCode,
    versionId: doc.templateVersion.id,
    versionLabel: doc.templateVersion.versionLabel,
    status: doc.templateVersion.status,
  };

  const patientContext = {
    patientName: doc.patientName,
    mrn: doc.mrn,
    dob: doc.dob,
    gender: doc.gender,
  };

  const encounterContext = {
    caseId: doc.caseId,
    diagnosis: doc.diagnosis,
    procedure: doc.plannedProcedure,
    department: doc.department,
    physicianName: doc.physicianName,
    physicianLicense: doc.physicianLicense,
  };

  const signatureEvidence = doc.signatures.map((item) => ({
    id: item.id,
    role: item.role,
    signerName: item.signerName,
    signedAt: item.signedAt.toISOString(),
    method: item.signatureMethod,
    signatureHash: item.signatureHash,
    metadata: item.metadata,
  }));

  const auditTimeline = doc.timelineEvents.map((item) => ({
    id: item.id,
    action: item.action,
    createdAt: item.createdAt.toISOString(),
    metadata: item.metadata,
  }));

  return {
    finalPdfUrl: doc.immutablePdfUrl,
    finalPdfHash: doc.immutablePdfHash,
    wordingSnapshot,
    templateSnapshot,
    signedVersionLinkage,
    patientContext,
    encounterContext,
    physicianSnapshot: {
      name: doc.physicianName,
      license: doc.physicianLicense,
      specialty: doc.physicianSpecialty,
    },
    signatures: signatureEvidence,
    auditEventIds: doc.auditEvents.map((item) => item.id),
    timelineEventIds: doc.timelineEvents.map((item) => item.id),
    auditTimeline,
    otpEventIds: args.otpEventIds ?? [],
    qrVerification: {
      qrPayload: metadata.qrPayload || null,
      immutablePdfHash: doc.immutablePdfHash,
      finalizedAt: doc.finalizedAt?.toISOString() || null,
      consentReference: doc.consentReference,
    },
    educationSummary: args.educationSummary || null,
    consentSummary: args.consentSummary || null,
    timelineSummary: args.timelineSummary || null,
    evidencePackageV2Id: args.evidencePackageV2Id || null,
    finalizedBy: doc.finalizedByUserId,
    finalizedAt: doc.finalizedAt?.toISOString() || null,
  };
}

export function computeEvidencePackageChecksum(snapshot: Record<string, unknown>): string {
  return sha256(snapshot);
}

function requireTenantId(auth: AuthContext): string {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }
  return tenantId;
}

async function readOtpEventIds(documentId: string): Promise<string[]> {
  type OtpRow = { id: string };
  const rows = await prisma().$queryRawUnsafe<OtpRow[]>(
    `SELECT id
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type IN ('OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_VERIFY_FAILED')
       AND raw_payload ->> 'documentId' = $2
     ORDER BY created_at ASC`,
    "public_signing_otp",
    documentId,
  );
  return rows.map((row) => row.id);
}

/**
 * Verifies that a finalized consent's evidence package can be reconstructed
 * and that the stored checksums match the recomputed values.  This is the
 * runtime enforcement of the evidence reconstruction contract required by
 * RC1 Gate 1.3B.
 */
export async function verifyConsentEvidenceIntegrity(
  auth: AuthContext,
  documentId: string,
): Promise<EvidenceIntegrityReport> {
  const tenantId = requireTenantId(auth);

  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id: documentId },
    include: {
      case: true,
      template: true,
      templateVersion: true,
      signatures: { orderBy: { signedAt: "asc" } },
      auditEvents: { orderBy: { createdAt: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      evidenceV2Packages: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const metadata = asRecord(doc.metadata);
  const evidenceVault = asRecord(metadata.evidenceVault);
  const signedVersionLinkage = asRecord(metadata.signedVersionLinkage);
  const storedPackageHash = String(evidenceVault.checksumSha256 || "");
  const evidenceV2 = doc.evidenceV2Packages[0] || null;
  const otpEventIds = await readOtpEventIds(doc.id);

  const snapshot = buildEvidenceIntegritySnapshot({
    doc: doc as unknown as Parameters<typeof buildEvidenceIntegritySnapshot>[0]["doc"],
    evidencePackageV2Id: evidenceV2?.id || null,
    educationSummary: evidenceV2?.educationSummary || null,
    consentSummary: evidenceV2?.consentSummary || null,
    timelineSummary: evidenceV2?.timelineSummary || null,
    otpEventIds,
  });

  const recomputedPackageHash = computeEvidencePackageChecksum(snapshot);

  const checks: EvidenceIntegrityCheck[] = [];

  checks.push({
    name: "document_finalized",
    ok: doc.status === "FINALIZED",
    actual: doc.status,
    expected: "FINALIZED",
    message: doc.status === "FINALIZED"
      ? "Document is finalized"
      : "Document is not finalized; evidence integrity cannot be verified",
  });

  checks.push({
    name: "pdf_hash_present",
    ok: Boolean(doc.immutablePdfHash),
    actual: doc.immutablePdfHash,
    message: doc.immutablePdfHash
      ? "PDF integrity hash is present"
      : "PDF integrity hash is missing",
  });

  checks.push({
    name: "version_linkage_present",
    ok: Boolean(signedVersionLinkage?.templateVersion),
    message: signedVersionLinkage?.templateVersion
      ? "Signed version linkage snapshot is present"
      : "Signed version linkage snapshot is missing",
  });

  const signaturesMissingHash = doc.signatures.filter((item) => !item.signatureHash);
  checks.push({
    name: "signature_hashes_present",
    ok: signaturesMissingHash.length === 0,
    actual: String(signaturesMissingHash.length),
    expected: "0",
    message: signaturesMissingHash.length === 0
      ? "All signatures have an evidence hash"
      : `${signaturesMissingHash.length} signature(s) are missing an evidence hash`,
  });

  checks.push({
    name: "evidence_package_hash_match",
    ok: storedPackageHash === recomputedPackageHash,
    actual: recomputedPackageHash,
    expected: storedPackageHash,
    message: storedPackageHash === recomputedPackageHash
      ? "Recomputed evidence package hash matches stored hash"
      : "Recomputed evidence package hash does not match stored hash",
  });

  checks.push({
    name: "otp_events_linkable",
    ok: otpEventIds.length > 0,
    actual: String(otpEventIds.length),
    message: otpEventIds.length > 0
      ? "OTP events are linked to the evidence chain"
      : "No OTP events found for the evidence chain",
  });

  const ok = checks.every((check) => check.ok);

  return {
    documentId: doc.id,
    consentReference: doc.consentReference,
    ok,
    checks,
    recomputedPackageHash,
    storedPackageHash: storedPackageHash || null,
    signedVersionLinkage: signedVersionLinkage || null,
  };
}
