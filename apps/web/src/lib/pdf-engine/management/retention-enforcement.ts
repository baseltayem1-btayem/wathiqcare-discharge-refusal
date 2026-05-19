import { buildRetentionDashboard, type RetentionDashboardItem } from "@/lib/pdf-engine/operations/retention-dashboard";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface RetentionViolation {
  evidenceId: string;
  reason: string;
  severity: "high" | "medium";
}

export interface RetentionComplianceSummary {
  compliant: boolean;
  evaluatedCount: number;
  expiringEvidence: RetentionDashboardItem[];
  violations: RetentionViolation[];
}

export function identifyExpiringEvidence(
  records: ArchivedEvidenceRecord[],
  thresholdDays = 90,
): RetentionDashboardItem[] {
  return buildRetentionDashboard(records).filter((item) =>
    item.daysRemaining != null && item.daysRemaining >= 0 && item.daysRemaining <= thresholdDays,
  );
}

export function identifyRetentionViolations(records: ArchivedEvidenceRecord[]): RetentionViolation[] {
  return buildRetentionDashboard(records)
    .reduce<RetentionViolation[]>((violations, item) => {
      if (item.daysRemaining != null && item.daysRemaining < 0) {
        violations.push({ evidenceId: item.evidenceId, reason: "Retention period expired.", severity: "high" });
        return violations;
      }
      if (item.legalHoldStatus === "legal-hold" && item.expiryDate) {
        violations.push({ evidenceId: item.evidenceId, reason: "Legal hold evidence should not have an expiry date.", severity: "medium" });
        return violations;
      }
      return violations;
    }, [])
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
}

export function evaluateRetentionCompliance(records: ArchivedEvidenceRecord[]): RetentionComplianceSummary {
  const expiringEvidence = identifyExpiringEvidence(records);
  const violations = identifyRetentionViolations(records);

  return {
    compliant: violations.length === 0,
    evaluatedCount: records.length,
    expiringEvidence,
    violations,
  };
}