import type { DynamicConsentTemplateDefinition } from "@/modules/consent-engine/engine/types";
import { CARDIOLOGY_DYNAMIC_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/cardiology-consent";
import { GENERAL_DYNAMIC_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/general-consent";
import { IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT } from "@/modules/consent-engine/templates/imc-radiology-interventional-imaging-consent";
import type { DynamicConsentTemplate } from "@/modules/consent-engine/templates/types";

export * from "@/modules/consent-engine/templates/surgery-medical-procedure-consent";
export type { DynamicConsentTemplate } from "@/modules/consent-engine/templates/types";
export { IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT } from "@/modules/consent-engine/templates/imc-radiology-interventional-imaging-consent";

const TEMPLATE_REGISTRY: DynamicConsentTemplateDefinition[] = [
  CARDIOLOGY_DYNAMIC_CONSENT_TEMPLATE,
  GENERAL_DYNAMIC_CONSENT_TEMPLATE,
];

/**
 * Preview-only content-rich template registry.
 *
 * Keyed by stable `templateId`. Loaded ONLY by the internal dynamic
 * preview surface (`/internal/dynamic-consent-preview` and related
 * preview-only APIs). Does NOT participate in the production
 * informed-consent workflow or in `resolveDynamicConsentTemplate`.
 */
export const DYNAMIC_PREVIEW_TEMPLATE_REGISTRY: Record<string, DynamicConsentTemplate> = {
  "IMC-RAD-IMG-CONSENT-001": IMC_RADIOLOGY_INTERVENTIONAL_IMAGING_CONSENT,
};

export function listDynamicPreviewTemplates(): DynamicConsentTemplate[] {
  return Object.values(DYNAMIC_PREVIEW_TEMPLATE_REGISTRY);
}

export function resolveDynamicPreviewTemplate(
  templateId: string,
): DynamicConsentTemplate | null {
  return DYNAMIC_PREVIEW_TEMPLATE_REGISTRY[templateId] ?? null;
}

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