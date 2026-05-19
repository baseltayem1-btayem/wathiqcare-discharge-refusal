export const CLINICAL_AI_DISCLAIMER = "AI-assisted draft. Requires physician review and approval.";

export type ClinicalAiDraftStatus = "approved" | "pending-physician-review" | "rejected";

export interface ClinicalAiStructuredDraft {
  procedureExplanation: string;
  majorRisks: string[];
  minorRisks: string[];
  complications: string[];
  sideEffects: string[];
  alternatives: string[];
  risksOfRefusal: string[];
  postProcedureInstructions: string[];
  patientEducationSummary: string;
  medicalDisclaimer: string;
}

export interface ClinicalAiPromptContext {
  clinicalContext?: string[];
  consentType?: string;
  diagnosisLabel?: string | null;
  language?: "ar" | "en" | "bilingual";
  procedure: string;
  specialty?: string | null;
}

export interface ClinicalAiGenerationRequest {
  actorId: string;
  physicianUserId: string;
  promptVersion: string;
  tenantId?: string | null;
  context: ClinicalAiPromptContext;
}

export interface ClinicalAiProviderResponse {
  draft: ClinicalAiStructuredDraft;
  model: string;
  provider: string;
  providerMode: "azure-fallback" | "mock-local";
}

export interface PreparedConsentAiFields {
  aiDraftStatus: ClinicalAiDraftStatus;
  materialRisks: string;
  patientEducationSummary: string;
  postProcedureInstructions: string;
  procedureDescription: string;
  refusalConsequences: string;
  alternativesExplained: string;
}

export interface ClinicalAiSafetyValidation {
  issues: string[];
  safe: boolean;
}

export interface ClinicalAiAuditRecord {
  accepted: boolean | null;
  generationId: string;
  inputSummary: string;
  model: string;
  outputHash: string;
  physicianEditsPlaceholder: string;
  physicianUserId: string;
  promptVersion: string;
  provider: string;
  status: "accepted" | "pending-review" | "rejected";
  timestamp: string;
}

export interface ClinicalAiApprovalState {
  approvedAt: string | null;
  approvedBy: string | null;
  comparedEdits: Array<{ field: string; nextValue: string; previousValue: string }>;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  status: ClinicalAiDraftStatus;
}