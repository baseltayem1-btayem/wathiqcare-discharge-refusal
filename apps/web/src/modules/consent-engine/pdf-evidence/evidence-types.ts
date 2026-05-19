/**
 * Legal Evidence PDF Pipeline — Types
 *
 * Internal preview only. Does not affect the production PDF renderer
 * or any persisted consent workflow.
 */

export interface EvidencePackage {
  /** Stable opaque evidence identifier. */
  evidenceId: string;
  /** Source template identifier. */
  templateId: string;
  /** Source template version. */
  templateVersion: string;
  /** Patient medical record number. */
  patientMrn: string;
  /** Encounter number. */
  encounterNo: string;
  /** Case number. */
  caseNumber: string;
  /** ISO-8601 generation timestamp. */
  generatedAt: string;
  /** Identifier of the user / service that generated the preview. */
  generatedBy: string;
  /** Document-level audit hash (from the consent engine). */
  auditHash: string;
  /** Hash of the template definition. */
  templateHash: string;
  /** Hash of the normalized payload. */
  payloadHash: string;
  /** Public verification URL (no production page exists yet). */
  verificationUrl: string;
  /** Inline QR placeholder payload (no real QR code is generated). */
  qrPlaceholder: EvidenceQrPlaceholder;
  /** Bilingual legal footer string. */
  legalFooter: string;
}

export interface EvidenceQrPlaceholder {
  /** The text payload a real QR generator would encode. */
  payload: string;
  /** A short human-readable label for the dashed QR box in the preview. */
  label: string;
  /** Whether a real QR code has been rendered (always false at this stage). */
  isReal: false;
}

export interface LegalEvidencePdfPreviewInput {
  /** Legal-grade HTML produced by `legal-grade-renderer`. */
  html: string;
  /** Source template identifier and version. */
  templateId: string;
  templateVersion: string;
  /** Source consent engine audit hash. */
  auditHash: string;
  /** Optional pre-computed payload fingerprint (used for evidence ID). */
  payloadFingerprint?: string | null;
  /** Patient + encounter + case identifiers (already extracted). */
  patientMrn: string;
  encounterNo: string;
  caseNumber: string;
  /** ISO-8601 timestamp from the consent build result. */
  generatedAt: string;
  /** Identifier of the actor that triggered the preview (e.g. auth subject). */
  generatedBy: string;
  /** Optional, pre-existing evidence ID (used in subsequent recomputes). */
  evidenceId?: string | null;
  /** Hash of the template definition. */
  templateHash: string;
  /** Hash of the normalized payload. */
  payloadHash: string;
}

export interface LegalEvidencePdfPreviewOutput {
  /** The legal-grade HTML, unchanged. */
  html: string;
  /** The constructed evidence package. */
  evidencePackage: EvidencePackage;
  /** Suggested filename for "Print / Save as PDF". */
  suggestedFilename: string;
  /** Preview content type marker — NOT a real PDF. */
  contentType: "text/html-preview";
}
