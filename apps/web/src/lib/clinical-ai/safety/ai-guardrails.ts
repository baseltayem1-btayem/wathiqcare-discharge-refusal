import { ApiError } from "@/lib/server/http";
import { CLINICAL_AI_DISCLAIMER, type ClinicalAiSafetyValidation, type ClinicalAiStructuredDraft } from "@/lib/clinical-ai/types/clinical-ai-types";

const BLOCKED_PATTERNS = [
  /\bdiagnos(e|is|ing)\b/i,
  /\btreatment decision\b/i,
  /\bstart immediately\b/i,
  /\bemergency\b/i,
  /\bguarantee(d)?\b/i,
  /\bcertain(ly)?\b/i,
  /\bdefinitive(ly)?\b/i,
];

function validateStringArray(name: string, value: unknown, issues: string[]): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    issues.push(`invalid-${name}`);
    return [];
  }
  return value.map((item) => item.trim());
}

function scanText(value: string, label: string, issues: string[]): void {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(value)) {
      issues.push(`${label}-blocked-content`);
      break;
    }
  }
}

export function assertPromptIsSafe(input: { clinicalContext?: string[]; diagnosisLabel?: string | null; procedure: string }): void {
  const joined = [input.procedure, input.diagnosisLabel || "", ...(input.clinicalContext || [])].join(" ");
  if (/\bdiagnose me\b|\bwhat treatment should\b|\bemergency advice\b/i.test(joined)) {
    throw new ApiError(400, "Clinical AI request failed safety guardrails.");
  }
}

export function validateStructuredAiOutput(value: unknown): ClinicalAiStructuredDraft {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(502, "Clinical AI provider returned invalid structured output.");
  }
  const record = value as Record<string, unknown>;
  const draft: ClinicalAiStructuredDraft = {
    procedureExplanation: typeof record.procedureExplanation === "string" ? record.procedureExplanation.trim() : "",
    majorRisks: validateStringArray("major-risks", record.majorRisks, issues),
    minorRisks: validateStringArray("minor-risks", record.minorRisks, issues),
    complications: validateStringArray("complications", record.complications, issues),
    sideEffects: validateStringArray("side-effects", record.sideEffects, issues),
    alternatives: validateStringArray("alternatives", record.alternatives, issues),
    risksOfRefusal: validateStringArray("risks-of-refusal", record.risksOfRefusal, issues),
    postProcedureInstructions: validateStringArray("post-procedure-instructions", record.postProcedureInstructions, issues),
    patientEducationSummary: typeof record.patientEducationSummary === "string" ? record.patientEducationSummary.trim() : "",
    medicalDisclaimer: typeof record.medicalDisclaimer === "string" ? record.medicalDisclaimer.trim() : "",
  };

  if (!draft.procedureExplanation) issues.push("missing-procedure-explanation");
  if (!draft.patientEducationSummary) issues.push("missing-patient-education-summary");
  if (draft.medicalDisclaimer !== CLINICAL_AI_DISCLAIMER) issues.push("invalid-disclaimer");

  scanText(draft.procedureExplanation, "procedure-explanation", issues);
  scanText(draft.patientEducationSummary, "patient-education-summary", issues);
  for (const section of [
    ...draft.majorRisks,
    ...draft.minorRisks,
    ...draft.complications,
    ...draft.sideEffects,
    ...draft.alternatives,
    ...draft.risksOfRefusal,
    ...draft.postProcedureInstructions,
  ]) {
    scanText(section, "structured-section", issues);
  }

  if (issues.length > 0) {
    throw new ApiError(422, `Clinical AI draft rejected by safety guardrails: ${issues.join(", ")}`);
  }
  return draft;
}

export function validateAiDraftSafety(draft: ClinicalAiStructuredDraft): ClinicalAiSafetyValidation {
  const issues: string[] = [];
  try {
    validateStructuredAiOutput(draft);
  } catch (error) {
    if (error instanceof ApiError) {
      issues.push(error.message);
    } else {
      issues.push("unknown-ai-safety-error");
    }
  }

  return {
    issues,
    safe: issues.length === 0,
  };
}