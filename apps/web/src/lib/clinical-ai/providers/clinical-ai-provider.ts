import { buildConsentDraftingInstruction } from "@/lib/clinical-ai/agents/consent-drafting-agent";
import { validateStructuredAiOutput } from "@/lib/clinical-ai/safety/ai-guardrails";
import { AzureOpenAiClinicalProvider } from "@/lib/clinical-ai/providers/azure-openai-provider";
import type { ClinicalAiGenerationRequest, ClinicalAiProviderResponse } from "@/lib/clinical-ai/types/clinical-ai-types";

export interface ClinicalAiProvider {
  generateStructuredDraft(request: ClinicalAiGenerationRequest): Promise<ClinicalAiProviderResponse>;
}

class DefaultClinicalAiProvider implements ClinicalAiProvider {
  private readonly provider = new AzureOpenAiClinicalProvider();

  async generateStructuredDraft(request: ClinicalAiGenerationRequest): Promise<ClinicalAiProviderResponse> {
    const instruction = buildConsentDraftingInstruction(request);
    const response = await this.provider.generateStructuredDraft({
      clinicalContext: instruction.minimizedInput.clinicalContext,
      diagnosisLabel: instruction.minimizedInput.diagnosisLabel,
      procedure: instruction.minimizedInput.procedure,
      specialty: instruction.minimizedInput.specialty,
    });

    return {
      ...response,
      draft: validateStructuredAiOutput(response.draft),
    };
  }
}

export function createClinicalAiProvider(): ClinicalAiProvider {
  return new DefaultClinicalAiProvider();
}