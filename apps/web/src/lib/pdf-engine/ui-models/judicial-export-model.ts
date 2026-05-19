import type { JudicialEvidenceExport } from "@/lib/pdf-engine/persistence/judicial-export";

export interface JudicialExportModel {
  auditSummary: string;
  coverSheetMetadata: string;
  evidenceSummary: string;
  otpSummary: string;
  retentionSummary: string;
  verificationSummary: string;
}

export function buildJudicialExportModel(judicialExport: JudicialEvidenceExport): JudicialExportModel {
  return {
    auditSummary: `Audit reference ${judicialExport.auditChain.currentChainHash} for ${judicialExport.documentType}.`,
    coverSheetMetadata: `${judicialExport.documentType} / ${judicialExport.evidenceId} / ${judicialExport.metadata.generatedAt}`,
    evidenceSummary: `Immutable seal ${judicialExport.immutableSeal.fingerprint} with verification payload ${judicialExport.verificationPayload}.`,
    otpSummary: `OTP status ${judicialExport.otpEvidence.verificationStatus} via ${judicialExport.otpEvidence.verificationMethod || "placeholder"}.`,
    retentionSummary: `${judicialExport.retention.retentionClass} / expiry ${judicialExport.retention.expiryAt || "legal-hold"}.`,
    verificationSummary: `Judicial export reference ${judicialExport.judicialExportReference}.`,
  };
}