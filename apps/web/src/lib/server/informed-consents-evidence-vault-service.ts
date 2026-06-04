import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildEvidencePackageV2 } from "@/lib/server/evidence-package-2-service";

const prisma = () => getPrisma();

type SignatureStatus = "NOT_SENT" | "SENT" | "OPENED" | "PARTIALLY_SIGNED" | "SIGNED" | "FAILED" | "EXPIRED" | "REVOKED";

function requireTenantId(auth: AuthContext): string {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }
  return tenantId;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evidencePath(tenantId: string, documentId: string): string {
  return `/${tenantId}/informed-consents/${documentId}/evidence-package/`;
}

function getSignatureRequests(metadata: unknown): Array<Record<string, unknown>> {
  const orchestration = asRecord(asRecord(metadata).signatureOrchestration);
  const requests = asArray(orchestration.requests);
  return requests.map((item) => asRecord(item));
}

export async function ensureSignatureOrchestrationComplete(auth: AuthContext, documentId: string): Promise<void> {
  const tenantId = requireTenantId(auth);
  const doc = await prisma().consentDocument.findFirst({
    where: { tenantId, id: documentId },
    include: { signatures: true },
  });

  if (!doc) throw new ApiError(404, "Consent document not found");

  const metadata = asRecord(doc.metadata);
  const signatureOrchestration = asRecord(metadata.signatureOrchestration);
  const signatureSecurity = asRecord(metadata.signatureSecurity);
  const anesthesiaMetadata = asRecord(metadata.anesthesiaMetadata);

  const requiredRoles = (asArray(signatureOrchestration.requiredRoles).map((item) => String(item))).filter(Boolean);
  const defaultRoles = ["PATIENT", "PHYSICIAN"];
  const expectedRoles = requiredRoles.length > 0 ? requiredRoles : defaultRoles;

  const signedByRole = new Set(doc.signatures.map((item) => String(item.role)));

  for (const role of expectedRoles) {
    if (!signedByRole.has(role)) {
      throw new ApiError(409, `Cannot finalize before signature completion for role ${role}`);
    }
  }

  const isTruthy = (value: unknown): boolean => {
    if (value === true) return true;
    if (typeof value === "number") return value === 1;
    if (typeof value !== "string") return false;
    return ["true", "yes", "y", "1", "applies", "required"].includes(value.trim().toLowerCase());
  };

  const anesthesiaApplies =
    isTruthy(anesthesiaMetadata.applies)
    || isTruthy(signatureSecurity.anesthesiaRequired)
    || isTruthy(signatureOrchestration.anesthesiaRequired);

  const signatureClinicalRole = (signature: { metadata?: unknown; role?: unknown }): string => {
    const itemMetadata = asRecord(signature.metadata);
    return String(
      itemMetadata.clinicalRole
      || itemMetadata.certificationRole
      || itemMetadata.signerClinicalRole
      || signature.role
      || "",
    ).trim().toUpperCase();
  };

  const hasTreatingPhysicianSignature = doc.signatures.some((signature) => {
    const role = String(signature.role || "").toUpperCase();
    const clinicalRole = signatureClinicalRole(signature);
    return role === "PHYSICIAN" && clinicalRole !== "ANESTHESIOLOGIST";
  });

  if (!hasTreatingPhysicianSignature) {
    throw new ApiError(409, "Physician signature is mandatory before finalization");
  }

  const hasAnesthesiologistSignature = doc.signatures.some((signature) => {
    const role = String(signature.role || "").toUpperCase();
    const clinicalRole = signatureClinicalRole(signature);
    return role === "ANESTHESIOLOGIST" || clinicalRole === "ANESTHESIOLOGIST";
  });

  if (anesthesiaApplies && !hasAnesthesiologistSignature) {
    throw new ApiError(409, "Anesthesiologist signature is mandatory before finalization");
  }

  const requests = getSignatureRequests(doc.metadata);
  const notCompleted = requests.filter((item) => {
    const required = item.required !== false;
    const status = String(item.status || "NOT_SENT").toUpperCase() as SignatureStatus;
    return required && status !== "SIGNED";
  });

  if (notCompleted.length > 0) {
    throw new ApiError(409, "Cannot finalize before all required signature requests are marked SIGNED");
  }
}

export async function buildImmutableEvidencePackage(
  auth: AuthContext,
  documentId: string,
  request?: NextRequest,
): Promise<{
  documentId: string;
  storagePath: string;
  verificationToken: string;
  checksumSha256: string;
  finalizedAt: string;
  files: string[];
}> {
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
    },
  });

  if (!doc) throw new ApiError(404, "Consent document not found");
  if (doc.status !== "FINALIZED") {
    throw new ApiError(409, "Evidence package can be generated only for finalized consent");
  }

  const storagePath = evidencePath(tenantId, documentId);

  const wordingSnapshot = asRecord(asRecord(doc.metadata).finalizedWordingSnapshot);
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
    role: item.role,
    signerName: item.signerName,
    signedAt: item.signedAt.toISOString(),
    method: item.signatureMethod,
    metadata: item.metadata,
  }));

  const auditTimeline = doc.timelineEvents.map((item) => ({
    action: item.action,
    actorUserId: item.actorUserId,
    actorRole: item.actorRole,
    deviceInfo: item.deviceInfo,
    ipAddress: item.ipAddress,
    userAgent: item.userAgent,
    createdAt: item.createdAt.toISOString(),
    metadata: item.metadata,
  }));

  const aiMetadata = asRecord(asRecord(doc.metadata).aiAssist);
  const qrVerification = {
    qrPayload: doc.qrPayload,
    immutablePdfHash: doc.immutablePdfHash,
    finalizedAt: doc.finalizedAt?.toISOString() || null,
    consentReference: doc.consentReference,
  };

  const evidenceV2 = await buildEvidencePackageV2(auth, doc.id);

  const packagePayload = {
    finalPdfUrl: doc.immutablePdfUrl,
    draftPdfSnapshot: doc.immutablePdfUrl,
    wordingSnapshot,
    templateSnapshot,
    patientContext,
    encounterContext,
    physicianSnapshot: {
      name: doc.physicianName,
      license: doc.physicianLicense,
      specialty: doc.physicianSpecialty,
    },
    aiMetadataSnapshot: aiMetadata,
    signatures: signatureEvidence,
    auditTimeline,
    qrVerification,
    educationSummary: evidenceV2.educationSummary,
    consentSummary: evidenceV2.consentSummary,
    timelineSummary: evidenceV2.timelineSummary,
    evidencePackageV2Id: evidenceV2.packageId,
    finalizedBy: doc.finalizedByUserId,
    finalizedAt: doc.finalizedAt?.toISOString() || null,
  };

  const checksumSha256 = sha256(packagePayload);
  const verificationToken = crypto
    .createHash("sha256")
    .update(`${doc.id}:${checksumSha256}:${doc.finalizedAt?.toISOString() || ""}`)
    .digest("hex")
    .slice(0, 48);

  await prisma().consentDocument.update({
    where: { id: doc.id },
    data: {
      metadata: {
        ...(asRecord(doc.metadata) || {}),
        evidenceVault: {
          immutable: true,
          storagePath,
          verificationToken,
          checksumSha256,
          evidencePackageV2Id: evidenceV2.packageId,
          educationSummary: evidenceV2.educationSummary,
          consentSummary: evidenceV2.consentSummary,
          timelineSummary: evidenceV2.timelineSummary,
          files: [
            "final.pdf",
            "draft.pdf",
            "wording.json",
            "template.json",
            "patient-context.json",
            "encounter-context.json",
            "audit-timeline.json",
            "signatures.json",
            "metadata.json",
          ],
          generatedAt: new Date().toISOString(),
          generatedBy: auth.sub,
        },
        frozenContext: {
          patient: patientContext,
          encounter: encounterContext,
          template: templateSnapshot,
        },
      },
    },
  });

  await prisma().consentEvidencePackage.updateMany({
    where: { tenantId, consentDocumentId: doc.id },
    data: {
      storagePath,
      checksumHash: checksumSha256,
      generatedBy: auth.sub,
      metadata: {
        verificationToken,
        checksumSha256,
        immutable: true,
      },
    },
  });

  await writeAuditLog({
    tenantId,
    userId: auth.sub,
    entityType: "consent_evidence_package",
    entityId: doc.id,
    action: "evidence_package_generated",
    details: `Immutable evidence package generated for ${doc.consentReference}`,
    caseId: doc.caseId,
    documentId: doc.id,
    moduleKey: "informed-consents",
    metadataJson: {
      storagePath,
      checksumSha256,
      verificationToken,
      finalizedAt: doc.finalizedAt?.toISOString() || null,
    },
    request,
  });

  return {
    documentId: doc.id,
    storagePath,
    verificationToken,
    checksumSha256,
    finalizedAt: doc.finalizedAt?.toISOString() || new Date().toISOString(),
    files: [
      "final.pdf",
      "draft.pdf",
      "wording.json",
      "template.json",
      "patient-context.json",
      "encounter-context.json",
      "audit-timeline.json",
      "signatures.json",
      "metadata.json",
    ],
  };
}

export async function verifyEvidenceToken(token: string): Promise<{
  valid: boolean;
  documentId?: string;
  consentReference?: string;
  finalizedAt?: string | null;
  checksumSha256?: string;
  signerCompletion?: boolean;
}> {
  const normalized = (token || "").trim();
  if (!normalized) throw new ApiError(400, "Verification token is required");

  const docs = await prisma().consentDocument.findMany({
    where: { status: "FINALIZED" },
    include: { signatures: true },
    take: 500,
    orderBy: { finalizedAt: "desc" },
  });

  const found = docs.find((doc) => {
    const metadata = asRecord(doc.metadata);
    const vault = asRecord(metadata.evidenceVault);
    return String(vault.verificationToken || "") === normalized;
  });

  if (!found) {
    return { valid: false };
  }

  const metadata = asRecord(found.metadata);
  const vault = asRecord(metadata.evidenceVault);

  return {
    valid: true,
    documentId: found.id,
    consentReference: found.consentReference,
    finalizedAt: found.finalizedAt?.toISOString() || null,
    checksumSha256: String(vault.checksumSha256 || ""),
    signerCompletion: found.signatures.length > 0,
  };
}
