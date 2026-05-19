import type { RetentionComplianceSummary } from "@/lib/pdf-engine/management/retention-enforcement";

export interface ComplianceDashboardModel {
  compliant: boolean;
  expiringCount: number;
  violationCount: number;
}

export function buildComplianceDashboard(summary: RetentionComplianceSummary): ComplianceDashboardModel {
  return {
    compliant: summary.compliant,
    expiringCount: summary.expiringEvidence.length,
    violationCount: summary.violations.length,
  };
}