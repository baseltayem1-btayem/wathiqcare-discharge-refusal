import { enforceServerOnly } from "@/lib/server/enforce-server-only";

import { createClinicalAiProvider } from "@/lib/clinical-ai/providers/clinical-ai-provider";
import { buildAiGenerationAuditRecord } from "@/lib/clinical-ai/audit/ai-generation-audit";
import { protectImmutableLegalBlocks } from "@/lib/clinical-ai/safety/immutable-legal-protection";
import { assertPromptIsSafe, validateAiDraftSafety as validateGuardrailedAiDraftSafety } from "@/lib/clinical-ai/safety/ai-guardrails";
import { markAiDraftPendingReview } from "@/lib/clinical-ai/safety/physician-approval";
import { summarizeMinimizedConsentInput } from "@/lib/clinical-ai/safety/phi-minimization";
import type {
  ClinicalAiGenerationRequest,
  ClinicalAiStructuredDraft,
  PreparedConsentAiFields,
} from "@/lib/clinical-ai/types/clinical-ai-types";
import { CLINICAL_AI_DISCLAIMER } from "@/lib/clinical-ai/types/clinical-ai-types";
import { ENABLE_CLINICAL_AI_ASSISTANT } from "@/lib/config/feature-flags";
import { ApiError } from "@/lib/server/http";

enforceServerOnly();

export function isClinicalAiAssistantEnabled(): boolean {
  return ENABLE_CLINICAL_AI_ASSISTANT;
}

function joinBulletSections(title: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }
  return `${title}: ${values.join(" ")}`;
}

export function prepareAiDraftForConsentFields(draft: ClinicalAiStructuredDraft): PreparedConsentAiFields {
  const riskSections = [
    joinBulletSections("Major risks", draft.majorRisks),
    joinBulletSections("Minor risks", draft.minorRisks),
    joinBulletSections("Complications", draft.complications),
    joinBulletSections("Side effects", draft.sideEffects),
  ].filter(Boolean);

  return {
    aiDraftStatus: "pending-physician-review",
    alternativesExplained: draft.alternatives.join(" "),
    materialRisks: riskSections.join("\n\n"),
    patientEducationSummary: draft.patientEducationSummary,
    postProcedureInstructions: draft.postProcedureInstructions.join(" "),
    procedureDescription: draft.procedureExplanation,
    refusalConsequences: draft.risksOfRefusal.join(" "),
  };
}

export function validateAiDraftSafetyOrThrow(draft: ClinicalAiStructuredDraft) {
  const immutableCheck = protectImmutableLegalBlocks({});
  if (!immutableCheck.allowed) {
    throw new ApiError(422, `AI draft attempted immutable legal mutation: ${immutableCheck.blockedFields.join(", ")}`);
  }
  const safety = validateGuardrailedAiDraftSafety(draft);
  if (!safety.safe) {
    throw new ApiError(422, safety.issues.join("; "));
  }
  return safety;
}

export async function buildConsentAiDraft(request: ClinicalAiGenerationRequest) {
  if (!isClinicalAiAssistantEnabled()) {
    throw new ApiError(404, "Clinical AI assistant is disabled.");
  }

  assertPromptIsSafe({
    clinicalContext: request.context.clinicalContext,
    diagnosisLabel: request.context.diagnosisLabel,
    procedure: request.context.procedure,
  });

  const provider = createClinicalAiProvider();
  const response = await provider.generateStructuredDraft(request);
  const safety = validateAiDraftSafetyOrThrow(response.draft);
  const approval = markAiDraftPendingReview();
  const preparedFields = prepareAiDraftForConsentFields(response.draft);
  const auditRecord = buildAiGenerationAuditRecord({
    accepted: null,
    request,
    response,
  });

  return {
    approval,
    auditRecord,
    draft: response.draft,
    preparedFields,
    provider: {
      inputSummary: summarizeMinimizedConsentInput(request),
      model: response.model,
      mode: response.providerMode,
      name: response.provider,
    },
    safety,
  };
}

export const buildClinicalAiDraftDisclaimer = () => CLINICAL_AI_DISCLAIMER;
export const validateAiDraftSafety = validateAiDraftSafetyOrThrow;