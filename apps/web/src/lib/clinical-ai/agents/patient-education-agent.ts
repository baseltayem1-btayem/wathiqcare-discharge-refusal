import { PATIENT_EDUCATION_PROMPT, PATIENT_EDUCATION_PROMPT_VERSION } from "@/lib/clinical-ai/prompts/patient-education.prompt";

export function buildPatientEducationInstruction(input: { procedure: string; specialty?: string | null }): { prompt: string; version: string } {
  return {
    prompt: `${PATIENT_EDUCATION_PROMPT} Procedure: ${input.procedure}. Specialty: ${input.specialty || "General"}.`,
    version: PATIENT_EDUCATION_PROMPT_VERSION,
  };
}