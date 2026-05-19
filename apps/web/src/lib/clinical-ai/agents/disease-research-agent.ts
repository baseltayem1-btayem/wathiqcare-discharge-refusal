import { assertPromptIsSafe } from "@/lib/clinical-ai/safety/ai-guardrails";

export function buildDiseaseResearchContext(input: {
  clinicalContext?: string[];
  diagnosisLabel?: string | null;
  procedure: string;
}): string[] {
  assertPromptIsSafe(input);
  return [input.diagnosisLabel?.trim(), ...(input.clinicalContext || []).map((item) => item.trim())].filter(Boolean) as string[];
}