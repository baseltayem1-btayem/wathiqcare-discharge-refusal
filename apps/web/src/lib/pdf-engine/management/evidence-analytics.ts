import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { determineRetentionClass } from "@/lib/pdf-engine/persistence/retention-policy";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { ForensicAlert } from "@/lib/pdf-engine/security/forensic-alerts";

export interface EvidenceAnalyticsSummary {
  documentTypeAnalytics: Array<{ count: number; documentType: string }>;
  evidenceGrowthMetrics: { total: number };
  forensicAlertMetrics: { totalAlerts: number };
  integrityFailureMetrics: { failures: number };
  retentionExposureMetrics: { litigationHold: number; standardRetention: number };
  verificationSuccessMetrics: { failed: number; successful: number };
}

export function buildEvidenceAnalytics(
  records: ArchivedEvidenceRecord[],
  forensicAlerts: ForensicAlert[] = [],
): EvidenceAnalyticsSummary {
  const documentTypeCounts = new Map<string, number>();
  let verificationSuccessful = 0;
  let integrityFailures = 0;
  let litigationHold = 0;

  for (const record of records) {
    const documentType = record.legalEvidencePackage.metadata.sourceModule;
    documentTypeCounts.set(documentType, (documentTypeCounts.get(documentType) || 0) + 1);

    const verification = performForensicVerification({
      archivedEvidence: record,
      legalEvidencePackage: record.legalEvidencePackage,
    });
    if (verification.valid) {
      verificationSuccessful += 1;
    } else {
      integrityFailures += 1;
    }

    if (determineRetentionClass({ moduleKey: documentType }) === "litigation-hold") {
      litigationHold += 1;
    }
  }

  return {
    documentTypeAnalytics: Array.from(documentTypeCounts.entries())
      .map(([documentType, count]) => ({ count, documentType }))
      .sort((left, right) => right.count - left.count || left.documentType.localeCompare(right.documentType)),
    evidenceGrowthMetrics: { total: records.length },
    forensicAlertMetrics: { totalAlerts: forensicAlerts.length },
    integrityFailureMetrics: { failures: integrityFailures },
    retentionExposureMetrics: { litigationHold, standardRetention: records.length - litigationHold },
    verificationSuccessMetrics: {
      failed: records.length - verificationSuccessful,
      successful: verificationSuccessful,
    },
  };
}