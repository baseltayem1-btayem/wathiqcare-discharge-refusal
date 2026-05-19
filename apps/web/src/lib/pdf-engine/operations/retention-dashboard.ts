import { calculateRetentionExpiry, determineRetentionClass, resolveLegalHoldStatus } from "@/lib/pdf-engine/persistence/retention-policy";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface RetentionDashboardItem {
  daysRemaining: number | null;
  evidenceId: string;
  expiryDate: string | null;
  legalHoldStatus: string;
  requiredAction: string;
  retentionClass: string;
}

function resolveDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) {
    return null;
  }

  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function buildRetentionDashboard(records: ArchivedEvidenceRecord[]): RetentionDashboardItem[] {
  return records
    .map((record) => {
      const retentionClass = determineRetentionClass({ moduleKey: record.legalEvidencePackage.metadata.sourceModule });
      const legalHold = resolveLegalHoldStatus({ retentionClass });
      const expiryDate = calculateRetentionExpiry(retentionClass, record.legalEvidencePackage.metadata.generatedAt, legalHold);
      const daysRemaining = resolveDaysRemaining(expiryDate);

      return {
        daysRemaining,
        evidenceId: record.evidenceId,
        expiryDate,
        legalHoldStatus: legalHold.isOnLegalHold ? "legal-hold" : "standard-retention",
        requiredAction:
          legalHold.isOnLegalHold
            ? "Preserve under legal hold placeholder."
            : daysRemaining != null && daysRemaining <= 90
              ? "Review retention and prepare archive renewal."
              : "No action required.",
        retentionClass,
      };
    })
    .sort((left, right) => (left.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (right.daysRemaining ?? Number.MAX_SAFE_INTEGER));
}