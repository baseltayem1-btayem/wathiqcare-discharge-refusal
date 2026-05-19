import type { EvidenceConsoleSummary } from "@/lib/pdf-engine/operations/evidence-console";

export interface OperationsConsoleModel {
  highlights: Array<{ label: string; value: number }>;
  status: "attention-required" | "healthy";
  typeDistribution: EvidenceConsoleSummary["documentTypeDistribution"];
}

export function buildOperationsConsoleModel(summary: EvidenceConsoleSummary): OperationsConsoleModel {
  return {
    highlights: [
      { label: "Total evidence", value: summary.totalEvidenceRecords },
      { label: "Verified", value: summary.verifiedRecords },
      { label: "Failed verification", value: summary.failedVerificationRecords },
      { label: "Legal hold", value: summary.legalHoldRecords },
      { label: "Retention expiring", value: summary.retentionExpiringRecords },
    ],
    status: summary.failedVerificationRecords > 0 || summary.retentionExpiringRecords > 0 ? "attention-required" : "healthy",
    typeDistribution: summary.documentTypeDistribution,
  };
}