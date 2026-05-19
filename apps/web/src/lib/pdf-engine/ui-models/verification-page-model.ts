import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
import type { RetentionDashboardItem } from "@/lib/pdf-engine/operations/retention-dashboard";

export interface VerificationPageModel {
  auditChainStatus: string;
  documentType: string;
  evidenceId: string;
  generatedTimestamp: string;
  immutableSealStatus: string;
  integrityStatus: string;
  qrStatus: string;
  retentionStatus: string;
  signer: string;
  verificationStatus: string;
}

export function buildVerificationPageModel(input: {
  forensicVerificationReport: ForensicVerificationReport;
  legalEvidencePackage: LegalEvidencePackage;
  retentionItem?: RetentionDashboardItem | null;
}): VerificationPageModel {
  return {
    auditChainStatus: input.forensicVerificationReport.auditChainIntegrityValid ? "valid" : "invalid",
    documentType: input.legalEvidencePackage.metadata.sourceModule,
    evidenceId: input.legalEvidencePackage.evidenceId,
    generatedTimestamp: input.legalEvidencePackage.metadata.generatedAt,
    immutableSealStatus: input.forensicVerificationReport.immutableSealValid ? "valid" : "invalid",
    integrityStatus: input.forensicVerificationReport.valid ? "verified" : "failed",
    qrStatus: input.forensicVerificationReport.qrVerificationValid ? "valid" : "invalid",
    retentionStatus: input.retentionItem?.legalHoldStatus || "standard-retention",
    signer:
      input.legalEvidencePackage.signerDetails.signerName || input.legalEvidencePackage.signerDetails.signerReference,
    verificationStatus: input.forensicVerificationReport.valid ? "verified" : "not-verified",
  };
}