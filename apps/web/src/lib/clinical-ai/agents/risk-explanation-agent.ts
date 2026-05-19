import { CONSENT_RISK_PROMPT, CONSENT_RISK_PROMPT_VERSION } from "@/lib/clinical-ai/prompts/consent-risk.prompt";

export function buildRiskExplanationInstruction(input: { procedure: string; specialty?: string | null }): { prompt: string; version: string } {
  return {
    prompt: `${CONSENT_RISK_PROMPT} Procedure: ${input.procedure}. Specialty: ${input.specialty || "General"}.`,
    version: CONSENT_RISK_PROMPT_VERSION,
  };
}