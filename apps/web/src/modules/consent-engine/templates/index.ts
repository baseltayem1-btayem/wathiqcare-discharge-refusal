import type { DynamicConsentTemplateDefinition } from "@/modules/consent-engine/engine/types";
import { CARDIOLOGY_DYNAMIC_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/cardiology-consent";
import { GENERAL_DYNAMIC_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/general-consent";

export * from "@/modules/consent-engine/templates/surgery-medical-procedure-consent";

const TEMPLATE_REGISTRY: DynamicConsentTemplateDefinition[] = [
  CARDIOLOGY_DYNAMIC_CONSENT_TEMPLATE,
  GENERAL_DYNAMIC_CONSENT_TEMPLATE,
];

export function listDynamicConsentTemplates(): DynamicConsentTemplateDefinition[] {
  return TEMPLATE_REGISTRY.slice();
}

export function resolveDynamicConsentTemplate(input: {
  specialty?: string | null;
  consentType?: string | null;
}): DynamicConsentTemplateDefinition {
  const specialty = input.specialty?.trim().toUpperCase();
  const consentType = input.consentType?.trim().toUpperCase();

  return (
    TEMPLATE_REGISTRY.find((item) => item.specialty === specialty && item.consentType === consentType)
    || TEMPLATE_REGISTRY.find((item) => item.specialty === specialty)
    || GENERAL_DYNAMIC_CONSENT_TEMPLATE
  );
}