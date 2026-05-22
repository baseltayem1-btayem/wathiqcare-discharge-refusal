import type { DynamicConsentPayload } from "@/modules/consent-engine/engine/types";
import { validateDynamicConsentPayload } from "@/modules/consent-engine/validators/payload-validator";
import { validateSignatureRequirements, validatePhysicianDeclaration } from "@/modules/consent-engine/validators/signature-validator";
import { validateSubstituteDecisionMaker } from "@/modules/consent-engine/validators/substitute-decision-maker";
import { validateTranslator } from "@/modules/consent-engine/validators/translator-validator";

export interface ComprehensiveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validationDetails: Record<string, unknown>;
}

export function performComprehensiveValidation(
  payload: DynamicConsentPayload,
  options?: {
    validateSignatures?: boolean;
    validateSDM?: boolean;
    validateTranslator?: boolean;
    validateDisclosures?: boolean;
  },
): ComprehensiveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const validationDetails: Record<string, unknown> = {};

  // Core payload validation
  const payloadIssues = validateDynamicConsentPayload(payload);
  if (payloadIssues.length > 0) {
    errors.push(...payloadIssues);
  }
  validationDetails.payloadValidation = payloadIssues;

  // Signature validation
  if (options?.validateSignatures !== false) {
    const signatureResult = validateSignatureRequirements(payload, {
      patientRequired: true,
      physicianRequired: true,
      witnessRequired: false,
    });
    if (!signatureResult.isValid) {
      errors.push(...signatureResult.errors);
    }
    validationDetails.signatureValidation = signatureResult;

    const physicianDeclResult = validatePhysicianDeclaration(payload);
    if (!physicianDeclResult.isValid) {
      errors.push(...physicianDeclResult.errors);
    }
    validationDetails.physicianDeclaration = physicianDeclResult;
  }

  // SDM validation
  if (options?.validateSDM !== false) {
    const sdmResult = validateSubstituteDecisionMaker(payload.patient, 0, "full");
    if (!sdmResult.isValid) {
      if (sdmResult.isRequired) {
        errors.push(...sdmResult.errors);
      } else {
        warnings.push(...sdmResult.errors);
      }
    }
    validationDetails.substituteDMValidation = sdmResult;
  }

  // Translator validation
  if (options?.validateTranslator !== false) {
    const translatorResult = validateTranslator(undefined, payload.language === "ar" ? "en" : "ar", payload.language);
    if (translatorResult.isRequired && !translatorResult.isValid) {
      errors.push(...translatorResult.errors);
    }
    validationDetails.translatorValidation = translatorResult;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    validationDetails,
  };
}
