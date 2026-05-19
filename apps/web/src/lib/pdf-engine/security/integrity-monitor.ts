import { performForensicVerification, type ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface EvidenceIntegrityMonitorResult {
  anomalies: string[];
  evidenceId: string;
  report: ForensicVerificationReport;
}

export interface IntegrityHealthReport {
  anomalyCount: number;
  healthy: boolean;
  monitoredCount: number;
}

export function monitorEvidenceIntegrity(records: ArchivedEvidenceRecord[]): EvidenceIntegrityMonitorResult[] {
  return records.map((record) => {
    const report = performForensicVerification({
      archivedEvidence: record,
      legalEvidencePackage: record.legalEvidencePackage,
    });
    return {
      anomalies: detectIntegrityAnomalies([record])[0]?.anomalies || [],
      evidenceId: record.evidenceId,
      report,
    };
  });
}

export function detectIntegrityAnomalies(records: ArchivedEvidenceRecord[]): EvidenceIntegrityMonitorResult[] {
  return records.map((record) => {
    const report = performForensicVerification({
      archivedEvidence: record,
      legalEvidencePackage: record.legalEvidencePackage,
    });
    const anomalies: string[] = [];
    if (!report.archiveIntegrityValid) anomalies.push("archive-integrity-failed");
    if (!report.auditChainIntegrityValid) anomalies.push("audit-chain-failed");
    if (!report.immutableSealValid) anomalies.push("immutable-seal-failed");
    if (!report.snapshotValid) anomalies.push("snapshot-failed");
    if (!report.qrVerificationValid || !report.tokenValid) anomalies.push("verification-token-failed");

    return {
      anomalies,
      evidenceId: record.evidenceId,
      report,
    };
  });
}

export function buildIntegrityHealthReport(results: EvidenceIntegrityMonitorResult[]): IntegrityHealthReport {
  const anomalyCount = results.reduce((total, result) => total + result.anomalies.length, 0);
  return {
    anomalyCount,
    healthy: anomalyCount === 0,
    monitoredCount: results.length,
  };
}