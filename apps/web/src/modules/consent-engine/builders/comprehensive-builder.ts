import type {
  DynamicConsentAlternativeItem,
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentRiskItem,
  DynamicConsentSection,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";
import { buildDynamicConsentDocument } from "@/modules/consent-engine/builders/dynamic-consent-builder";
import { performComprehensiveValidation } from "@/modules/consent-engine/validators/comprehensive-validator";

export interface ConsentBuildResultWithValidation {
  buildResult: DynamicConsentBuildResult;
  validation: ReturnType<typeof performComprehensiveValidation>;
  isProductionReady: boolean;
}

export function buildAndValidateConsent(
  template: DynamicConsentTemplateDefinition,
  payload: DynamicConsentPayload,
): ConsentBuildResultWithValidation {
  const buildResult = buildDynamicConsentDocument({
    template,
    payload,
  });

  const validation = performComprehensiveValidation(payload);

  return {
    buildResult,
    validation,
    isProductionReady: validation.isValid && buildResult.warnings.length === 0,
  };
}

export interface SerializedConsentData {
  templateId: string;
  templateVersion: string;
  language: string;
  generatedAt: string;
  contentHash: string;
  payloadFingerprint: string;
}

export function serializeConsentBuildResult(result: DynamicConsentBuildResult): SerializedConsentData {
  return {
    templateId: result.template.id,
    templateVersion: result.template.version,
    language: result.template.language,
    generatedAt: result.generatedAt,
    contentHash: result.audit.hash,
    payloadFingerprint: result.audit.payloadFingerprint,
  };
}
