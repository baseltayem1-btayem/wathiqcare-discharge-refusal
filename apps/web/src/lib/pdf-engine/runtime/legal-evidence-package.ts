import type { EvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
import {
  buildEvidenceSnapshot,
  type EvidenceSnapshot,
  type EvidenceSnapshotSignerData,
  type RuntimeValue,
} from "@/lib/pdf-engine/runtime/evidence-snapshot";
import {
  buildForensicAuditEvent,
  type ForensicAuditEvent,
} from "@/lib/pdf-engine/runtime/forensic-audit-chain";
import {
  generateImmutableEvidenceSeal,
  type ImmutableEvidenceSeal,
} from "@/lib/pdf-engine/runtime/immutable-evidence";
import type { OtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import {
  registerEvidenceVerification,
  resolveEvidenceVerificationUrl,
  type EvidenceVerificationRegistryRecord,
} from "@/lib/pdf-engine/runtime/verification-registry";

export interface BuildLegalEvidencePackageInput {
  auditMetadata: EvidenceAuditMetadata;
  documentContent: RuntimeValue;
  evidenceHash: string;
  evidenceId: string;
  html: string;
  languageDirection: "ltr" | "rtl";
  otpEvidence: OtpEvidenceRecord;
  signerDetails: EvidenceSnapshotSignerData;
  sourceModule: string;
  templateVersion: string;
  metadata?: RuntimeValue;
  previousChainHash?: string | null;
  generatedAt?: string | Date;
  ipAddress?: string | null;
}

export interface LegalEvidencePackage {
  auditChain: ForensicAuditEvent;
  auditChainReference: string;
  evidenceHash: string;
  evidenceId: string;
  html: string;
  immutableSeal: ImmutableEvidenceSeal;
  languageDirection: "ltr" | "rtl";
  metadata: EvidenceAuditMetadata;
  otpEvidence: OtpEvidenceRecord;
  qrVerificationPayload: string;
  signerDetails: EvidenceSnapshotSignerData;
  snapshot: EvidenceSnapshot;
  templateVersion: string;
  verificationRecord: EvidenceVerificationRegistryRecord;
}

export function buildLegalEvidencePackage(
  input: BuildLegalEvidencePackageInput,
): LegalEvidencePackage {
  const snapshot = buildEvidenceSnapshot({
    evidenceId: input.evidenceId,
    documentContent: input.documentContent,
    metadata: (input.metadata || {}) as RuntimeValue,
    evidenceHash: input.evidenceHash,
    signerData: input.signerDetails,
    otpState: {
      deliveryReference: input.otpEvidence.deliveryReference,
      maskedMobileNumber: input.otpEvidence.maskedMobileNumber,
      verificationMethod: input.otpEvidence.verificationMethod,
      verified: input.otpEvidence.verificationStatus === "verified",
    },
    generatedAt: input.generatedAt,
    templateVersion: input.templateVersion,
  });
  const immutableSeal = generateImmutableEvidenceSeal({
    sha256Hash: input.evidenceHash,
    timestamp: snapshot.generatedAt,
    evidenceId: input.evidenceId,
    signerReference: input.signerDetails.signerReference,
  });
  const auditChain = buildForensicAuditEvent({
    eventType: "legal_evidence_package_built",
    actor: input.auditMetadata.generatedBy,
    timestamp: snapshot.generatedAt,
    ipAddress: input.ipAddress ?? input.auditMetadata.ipAddress,
    sourceModule: input.sourceModule,
    evidenceId: input.evidenceId,
    previousChainHash: input.previousChainHash,
    details: {
      documentHash: input.evidenceHash,
      immutableSeal: immutableSeal.fingerprint,
      otpStatus: input.otpEvidence.verificationStatus,
      snapshotHash: snapshot.snapshotHash,
      templateVersion: input.templateVersion,
    },
  });
  const verificationRecord = registerEvidenceVerification({
    evidenceHash: input.evidenceHash,
    evidenceId: input.evidenceId,
    immutableSeal: immutableSeal.fingerprint,
  });

  return {
    auditChain,
    auditChainReference: auditChain.currentChainHash,
    evidenceHash: input.evidenceHash,
    evidenceId: input.evidenceId,
    html: input.html,
    immutableSeal,
    languageDirection: input.languageDirection,
    metadata: input.auditMetadata,
    otpEvidence: input.otpEvidence,
    qrVerificationPayload: resolveEvidenceVerificationUrl(input.evidenceId),
    signerDetails: input.signerDetails,
    snapshot,
    templateVersion: input.templateVersion,
    verificationRecord,
  };
}