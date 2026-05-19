import type { DynamicConsentSection } from "@/modules/consent-engine/engine/types";

export interface MandatoryDisclosureValidation {
  isValid: boolean;
  missing: string[];
}

export const MANDATORY_DISCLOSURE_SECTIONS = [
  {
    key: "patient_acknowledgment",
    titleAr: "إقرار المريض",
    titleEn: "Patient Acknowledgment",
    description: "Patient must acknowledge understanding of diagnosis, procedure, benefits, risks, and alternatives",
  },
  {
    key: "physician_declaration",
    titleAr: "إقرار الطبيب",
    titleEn: "Physician Declaration",
    description: "Physician must declare that information was provided in clear language",
  },
  {
    key: "risks_disclosure",
    titleAr: "تحذير من المخاطر",
    titleEn: "Risks Disclosure",
    description: "Specific risks and their severity must be disclosed",
  },
  {
    key: "alternatives_disclosure",
    titleAr: "البدائل المتاحة",
    titleEn: "Available Alternatives",
    description: "Alternative treatment options and their risks must be disclosed",
  },
  {
    key: "refusal_consequences",
    titleAr: "مخاطر الرفض",
    titleEn: "Consequences of Refusal",
    description: "Consequences of refusing the recommended procedure must be disclosed",
  },
];

export function validateMandatoryDisclosures(sections: DynamicConsentSection[]): MandatoryDisclosureValidation {
  const missing: string[] = [];
  const sectionKeys = new Set(sections.map((s) => s.key));

  for (const required of MANDATORY_DISCLOSURE_SECTIONS) {
    if (!sectionKeys.has(required.key)) {
      missing.push(`${required.titleEn} (${required.description})`);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

export function validateMandatoryRiskClasses(riskSeverities: Set<string>): {
  hasHighRisk: boolean;
  hasCriticalRisk: boolean;
  isValid: boolean;
} {
  const hasHighRisk = riskSeverities.has("high");
  const hasCriticalRisk = riskSeverities.has("critical");

  return {
    hasHighRisk,
    hasCriticalRisk,
    isValid: true, // Risk disclosure is validated separately
  };
}
