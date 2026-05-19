import type { DynamicConsentPerson } from "@/modules/consent-engine/engine/types";

export interface TranslatorValidation {
  isRequired: boolean;
  isValid: boolean;
  errors: string[];
  recommendedLanguages?: string[];
}

export const TRANSLATOR_RULES = {
  requiredWhenPatientLanguage: ["ar", "ur", "fa", "tr", "en-gb"],
  billingLanguages: ["ar", "en"],
  certificationRequired: true,
  minCertificationLevel: 2, // 1=Basic, 2=Professional, 3=Certified Medical Translator
};

export function isTranslatorRequired(
  patientLanguage?: string,
  documentLanguage: "ar" | "en" | "bilingual" = "bilingual",
): boolean {
  if (documentLanguage === "bilingual") {
    return true;
  }

  const normalized = patientLanguage?.toLowerCase() || "";

  if (documentLanguage === "ar") {
    return normalized !== "ar" && normalized !== "";
  }

  if (documentLanguage === "en") {
    return normalized !== "en" && normalized !== "";
  }

  return false;
}

export function validateTranslator(
  translator: DynamicConsentPerson | undefined,
  patientLanguage?: string,
  documentLanguage: "ar" | "en" | "bilingual" = "bilingual",
): TranslatorValidation {
  const errors: string[] = [];
  const isRequired = isTranslatorRequired(patientLanguage, documentLanguage);

  if (isRequired && !translator) {
    const recommendedLanguages = TRANSLATOR_RULES.billingLanguages;
    errors.push(`Translator is required for patient language: ${patientLanguage}, document language: ${documentLanguage}`);

    return {
      isRequired: true,
      isValid: false,
      errors,
      recommendedLanguages,
    };
  }

  if (translator) {
    if (!translator.name) {
      errors.push("Translator name is required");
    }

    if (!translator.identifier) {
      errors.push("Translator license/certification number is required");
    }

    if (!translator.role) {
      errors.push("Translator certification level/qualification is required");
    }
  }

  return {
    isRequired,
    isValid: errors.length === 0,
    errors,
  };
}
