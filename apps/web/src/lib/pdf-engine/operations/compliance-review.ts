import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
import type { RetentionDashboardItem } from "@/lib/pdf-engine/operations/retention-dashboard";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface ComplianceReviewResult {
  issues: string[];
  recommendedAction: string;
  status: "attention-required" | "compliant";
}

export function buildComplianceReview(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  forensicVerificationReport: ForensicVerificationReport;
  legalEvidencePackage: LegalEvidencePackage;
  retentionItem?: RetentionDashboardItem | null;
}): ComplianceReviewResult {
  const issues: string[] = [];

  if (!input.legalEvidencePackage.otpEvidence) {
    issues.push("missing-otp-evidence");
  }
  if (!input.legalEvidencePackage.evidenceHash) {
    issues.push("missing-hash");
  }
  if (!input.forensicVerificationReport.valid) {
    issues.push("failed-integrity");
  }
  if (!input.legalEvidencePackage.signerDetails.signerName && !input.legalEvidencePackage.signerDetails.signerReference) {
    issues.push("missing-signer");
  }
  if (input.retentionItem?.daysRemaining != null && input.retentionItem.daysRemaining < 0) {
    issues.push("expired-retention");
  }
  if (input.retentionItem?.legalHoldStatus === "legal-hold" && input.retentionItem.daysRemaining != null) {
    issues.push("legal-hold-conflict");
  }

  return {
    issues,
    recommendedAction: issues.length ? "Escalate to legal operations review." : "No compliance action required.",
    status: issues.length ? "attention-required" : "compliant",
  };
}