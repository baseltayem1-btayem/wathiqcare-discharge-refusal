import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface ForensicInspectionModel {
  archiveIntegrity: string;
  auditChainValidation: string;
  hashComparison: string;
  immutableSealValidation: string;
  qrTokenValidation: string;
  riskFlags: string[];
}

export function buildForensicInspectionModel(input: {
  forensicVerificationReport: ForensicVerificationReport;
  legalEvidencePackage: LegalEvidencePackage;
}): ForensicInspectionModel {
  const riskFlags: string[] = [];

  if (!input.forensicVerificationReport.archiveIntegrityValid) riskFlags.push("archive-integrity-failed");
  if (!input.forensicVerificationReport.auditChainIntegrityValid) riskFlags.push("audit-chain-failed");
  if (!input.forensicVerificationReport.immutableSealValid) riskFlags.push("immutable-seal-failed");
  if (!input.forensicVerificationReport.qrVerificationValid) riskFlags.push("qr-validation-failed");
  if (input.legalEvidencePackage.evidenceHash !== input.legalEvidencePackage.snapshot.evidenceHash) riskFlags.push("hash-mismatch");

  return {
    archiveIntegrity: input.forensicVerificationReport.archiveIntegrityValid ? "valid" : "invalid",
    auditChainValidation: input.forensicVerificationReport.auditChainIntegrityValid ? "valid" : "invalid",
    hashComparison:
      input.legalEvidencePackage.evidenceHash === input.legalEvidencePackage.snapshot.evidenceHash ? "match" : "mismatch",
    immutableSealValidation: input.forensicVerificationReport.immutableSealValid ? "valid" : "invalid",
    qrTokenValidation:
      input.forensicVerificationReport.qrVerificationValid && input.forensicVerificationReport.tokenValid ? "valid" : "invalid",
    riskFlags,
  };
}