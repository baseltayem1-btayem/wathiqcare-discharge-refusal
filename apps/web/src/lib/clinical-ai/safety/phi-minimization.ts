import type { ClinicalAiGenerationRequest, ClinicalAiPromptContext } from "@/lib/clinical-ai/types/clinical-ai-types";

export interface MinimizedClinicalAiInput {
  clinicalContext: string[];
  consentType: string | null;
  diagnosisLabel: string | null;
  language: "ar" | "en" | "bilingual";
  procedure: string;
  specialty: string | null;
}

function sanitizeContextValues(values: string[] | undefined): string[] {
  return (values || []).map((value) => value.trim()).filter(Boolean).slice(0, 8);
}

export function minimizeConsentPhi(context: ClinicalAiPromptContext): MinimizedClinicalAiInput {
  return {
    clinicalContext: sanitizeContextValues(context.clinicalContext),
    consentType: context.consentType?.trim() || null,
    diagnosisLabel: context.diagnosisLabel?.trim() || null,
    language: context.language || "en",
    procedure: context.procedure.trim(),
    specialty: context.specialty?.trim() || null,
  };
}

export function summarizeMinimizedConsentInput(request: ClinicalAiGenerationRequest): string {
  const minimized = minimizeConsentPhi(request.context);
  return [
    `procedure=${minimized.procedure}`,
    `specialty=${minimized.specialty || "n/a"}`,
    `diagnosisLabel=${minimized.diagnosisLabel || "n/a"}`,
    `consentType=${minimized.consentType || "n/a"}`,
    `clinicalContext=${minimized.clinicalContext.join(",") || "n/a"}`,
    `language=${minimized.language}`,
  ].join(" | ");
}