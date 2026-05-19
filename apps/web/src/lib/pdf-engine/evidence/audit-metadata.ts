import type { PdfModuleKey } from "@/lib/pdf-engine/core/pdf-types";

export interface EvidenceAuditMetadata {
  evidenceId: string;
  auditId: string | null;
  generatedAt: string;
  generatedBy: string;
  ipAddress: string | null;
  otpStatus: string | null;
  formVersion: string | null;
  documentHash: string;
  sourceModule: PdfModuleKey;
  deviceFingerprint: string | null;
}

export interface BuildEvidenceAuditMetadataInput {
  evidenceId: string;
  auditId?: string | null;
  generatedAt?: string | Date;
  generatedBy: string;
  ipAddress?: string | null;
  otpStatus?: string | null;
  formVersion?: string | null;
  documentHash: string;
  sourceModule: PdfModuleKey;
  deviceFingerprint?: string | null;
}

export function buildEvidenceAuditMetadata(
  input: BuildEvidenceAuditMetadataInput,
): EvidenceAuditMetadata {
  return {
    evidenceId: input.evidenceId,
    auditId: input.auditId ?? null,
    generatedAt:
      input.generatedAt instanceof Date
        ? input.generatedAt.toISOString()
        : input.generatedAt || new Date().toISOString(),
    generatedBy: input.generatedBy,
    ipAddress: input.ipAddress ?? null,
    otpStatus: input.otpStatus ?? null,
    formVersion: input.formVersion ?? null,
    documentHash: input.documentHash,
    sourceModule: input.sourceModule,
    deviceFingerprint: input.deviceFingerprint ?? "device-fingerprint-placeholder",
  };
}