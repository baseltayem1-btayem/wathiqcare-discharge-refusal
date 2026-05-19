import { CLINICAL_AI_DISCLAIMER, type ClinicalAiProviderResponse, type ClinicalAiStructuredDraft } from "@/lib/clinical-ai/types/clinical-ai-types";

function buildMockDraft(input: {
  clinicalContext: string[];
  diagnosisLabel?: string | null;
  procedure: string;
  specialty?: string | null;
}): ClinicalAiStructuredDraft {
  const specialty = input.specialty || "general medicine";
  const diagnosisLabel = input.diagnosisLabel || "physician-provided indication";
  const contextLine = input.clinicalContext.length > 0 ? ` Context: ${input.clinicalContext.join(", ")}.` : "";

  return {
    procedureExplanation: `${input.procedure} is being discussed with the patient as a ${specialty} intervention for ${diagnosisLabel}.${contextLine}`,
    majorRisks: [
      `Serious complications related to ${input.procedure} may include bleeding, infection, or the need for additional intervention depending on physician-assessed clinical factors.`,
    ],
    minorRisks: [
      `Temporary discomfort, swelling, or delayed recovery may occur after ${input.procedure}.`,
    ],
    complications: [
      `Unexpected procedural complications may require reassessment or escalation by the treating physician.`,
    ],
    sideEffects: [
      `Short-term side effects may include pain, nausea, or fatigue depending on the procedure and recovery course.`,
    ],
    alternatives: [
      `Reasonable alternatives may include conservative management, delay, or another physician-approved option if clinically suitable.`,
    ],
    risksOfRefusal: [
      `Refusing ${input.procedure} may increase the likelihood of persistent symptoms, deterioration, or the need for urgent reassessment.`,
    ],
    postProcedureInstructions: [
      `Follow the physician's written instructions, attend follow-up appointments, and report concerning symptoms to the care team.`,
    ],
    patientEducationSummary: `The patient should understand the purpose of ${input.procedure}, the main risks, the alternatives discussed, and the importance of follow-up after physician review.`,
    medicalDisclaimer: CLINICAL_AI_DISCLAIMER,
  };
}

export class AzureOpenAiClinicalProvider {
  private readonly apiKey = process.env.AZURE_OPENAI_API_KEY?.trim() || "";
  private readonly deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || "";
  private readonly endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim() || "";

  async generateStructuredDraft(input: {
    clinicalContext: string[];
    diagnosisLabel?: string | null;
    procedure: string;
    specialty?: string | null;
  }): Promise<ClinicalAiProviderResponse> {
    const providerMode = this.apiKey && this.deployment && this.endpoint ? "azure-fallback" : "mock-local";
    return {
      draft: buildMockDraft(input),
      model: providerMode === "mock-local" ? "mock-clinical-ai-v1" : "azure-configured-local-fallback-v1",
      provider: "azure-openai-provider",
      providerMode,
    };
  }
}