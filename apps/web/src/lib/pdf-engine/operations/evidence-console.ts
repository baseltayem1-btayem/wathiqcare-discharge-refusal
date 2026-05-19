import { determineRetentionClass, calculateRetentionExpiry, resolveLegalHoldStatus } from "@/lib/pdf-engine/persistence/retention-policy";
import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface EvidenceConsoleSummary {
  documentTypeDistribution: Array<{ count: number; documentType: string }>;
  failedVerificationRecords: number;
  legalHoldRecords: number;
  retentionExpiringRecords: number;
  totalEvidenceRecords: number;
  verifiedRecords: number;
}

function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) {
    return null;
  }

  const now = Date.now();
  const target = new Date(dateIso).getTime();
  return Math.ceil((target - now) / (24 * 60 * 60 * 1000));
}

export function buildEvidenceConsole(records: ArchivedEvidenceRecord[]): EvidenceConsoleSummary {
  const verifiedRecords = records.filter((record) =>
    performForensicVerification({ archivedEvidence: record, legalEvidencePackage: record.legalEvidencePackage }).valid,
  ).length;
  const failedVerificationRecords = records.length - verifiedRecords;
  const legalHoldRecords = records.filter((record) =>
    resolveLegalHoldStatus({ retentionClass: determineRetentionClass({ moduleKey: record.legalEvidencePackage.metadata.sourceModule }) }).isOnLegalHold,
  ).length;
  const retentionExpiringRecords = records.filter((record) => {
    const retentionClass = determineRetentionClass({ moduleKey: record.legalEvidencePackage.metadata.sourceModule });
    const expiry = calculateRetentionExpiry(retentionClass, record.legalEvidencePackage.metadata.generatedAt);
    const remaining = daysUntil(expiry);
    return remaining != null && remaining <= 90;
  }).length;
  const documentTypeCounts = new Map<string, number>();

  for (const record of records) {
    const current = documentTypeCounts.get(record.legalEvidencePackage.metadata.sourceModule) || 0;
    documentTypeCounts.set(record.legalEvidencePackage.metadata.sourceModule, current + 1);
  }

  return {
    documentTypeDistribution: Array.from(documentTypeCounts.entries())
      .map(([documentType, count]) => ({ count, documentType }))
      .sort((left, right) => right.count - left.count || left.documentType.localeCompare(right.documentType)),
    failedVerificationRecords,
    legalHoldRecords,
    retentionExpiringRecords,
    totalEvidenceRecords: records.length,
    verifiedRecords,
  };
}