/**
 * Form Auto-Calibration Engine — Phase 1 public API.
 *
 * This module is intentionally deterministic-first. AI-assisted paths are
 * gated behind feature flags and credentials.
 */

export {
  CONSENT_FIELD_ONTOLOGY,
  getOntologyField,
  getAllOntologyKeys,
  getOntologyFieldsByRole,
  getOntologyFieldsByFamilyPresence,
  type ConsentOntologyField,
  type ConsentFieldDataType,
  type ConsentFieldLanguage,
  type ConsentFieldRole,
  type ConsentFieldSensitivity,
  type ConsentFieldRequiredness,
  type ConsentWidgetType,
  type ConsentPrintBehaviour,
} from "./ontology/consent-field-ontology";

export {
  findOntologyMatches,
  findExactAliasMatches,
  findPartialAliasMatches,
  getCandidateOntologyKeysForFamily,
  type OntologyAliasMatch,
} from "./ontology/ontology-aliases";

export {
  inspectBlankPdf,
  type PdfInspectionResult,
  type PdfInspectionError,
} from "./intake/inspect-pdf";

export {
  computeLayoutFingerprint,
  fingerprintSimilarity,
  type LayoutFingerprint,
  type LayoutFingerprintSummary,
} from "./fingerprint/layout-fingerprint";

export {
  classifyLayoutFamily,
  type LayoutFamily,
  type LayoutFamilyClassification,
} from "./fingerprint/layout-family-classifier";

export { extractTextBlocksFromPdf } from "./extraction/extract-text-blocks";

export {
  type ExtractedDocumentLayout,
  type ExtractedPageLayout,
  type TextBlock,
  type WritingLine,
  type CheckboxRegion,
  type SignatureRegion,
  type ColumnStructure,
} from "./extraction/document-layout-types";
