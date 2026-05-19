import { buildDiseaseResearchContext } from "@/lib/clinical-ai/agents/disease-research-agent";
import { buildPatientEducationInstruction } from "@/lib/clinical-ai/agents/patient-education-agent";
import { buildRiskExplanationInstruction } from "@/lib/clinical-ai/agents/risk-explanation-agent";
import { PROCEDURE_EXPLANATION_PROMPT, PROCEDURE_EXPLANATION_PROMPT_VERSION } from "@/lib/clinical-ai/prompts/procedure-explanation.prompt";
import { minimizeConsentPhi } from "@/lib/clinical-ai/safety/phi-minimization";
import type { ClinicalAiGenerationRequest } from "@/lib/clinical-ai/types/clinical-ai-types";

export function buildConsentDraftingInstruction(request: ClinicalAiGenerationRequest): {
  minimizedInput: ReturnType<typeof minimizeConsentPhi>;
  promptBundle: { patientEducation: string; procedure: string; researchContext: string[]; risks: string };
  promptVersion: string;
} {
  const minimizedInput = minimizeConsentPhi(request.context);
  const researchContext = buildDiseaseResearchContext({
    clinicalContext: minimizedInput.clinicalContext,
    diagnosisLabel: minimizedInput.diagnosisLabel,
    procedure: minimizedInput.procedure,
  });
  const riskInstruction = buildRiskExplanationInstruction({
    procedure: minimizedInput.procedure,
    specialty: minimizedInput.specialty,
  });
  const educationInstruction = buildPatientEducationInstruction({
    procedure: minimizedInput.procedure,
    specialty: minimizedInput.specialty,
  });

  return {
    minimizedInput,
    promptBundle: {
      patientEducation: educationInstruction.prompt,
      procedure: `${PROCEDURE_EXPLANATION_PROMPT} Procedure: ${minimizedInput.procedure}. Diagnosis label: ${minimizedInput.diagnosisLabel || "n/a"}.`,
      researchContext,
      risks: riskInstruction.prompt,
    },
    promptVersion: [riskInstruction.version, educationInstruction.version, PROCEDURE_EXPLANATION_PROMPT_VERSION].join("+"),
  };
}