import type {
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";
import { buildRawSurgeryMedicalProcedureConsentPreview } from "@/modules/consent-engine/adapters/raw-template-adapter";
import { buildDynamicConsentDocument } from "@/modules/consent-engine/builders/dynamic-consent-builder";
import { createDefaultLegalStatements, DEFAULT_DYNAMIC_ALTERNATIVES } from "@/modules/consent-engine/i18n/copy";
import { resolveDynamicConsentTemplate } from "@/modules/consent-engine/templates";

export function buildExperimentalDynamicConsent(
  payload: DynamicConsentPayload,
  template?: DynamicConsentTemplateDefinition,
): DynamicConsentBuildResult {
  const resolvedTemplate = template || resolveDynamicConsentTemplate({
    specialty: payload.specialty,
  });

  return buildDynamicConsentDocument({
    template: resolvedTemplate,
    payload: {
      ...payload,
      alternatives: payload.alternatives.length > 0 ? payload.alternatives : DEFAULT_DYNAMIC_ALTERNATIVES,
      legalStatements: payload.legalStatements.length > 0 ? payload.legalStatements : createDefaultLegalStatements(),
    },
  });
}

export function buildExperimentalDynamicConsentPreview(): DynamicConsentBuildResult {
  return buildRawSurgeryMedicalProcedureConsentPreview();
}