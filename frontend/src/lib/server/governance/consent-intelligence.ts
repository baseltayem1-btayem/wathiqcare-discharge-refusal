export type ConsentRecommendationInput = {
  procedureCode?: string | null;
  highRisk?: boolean;
  requiresAnesthesia?: boolean;
  requiresBloodProducts?: boolean;
  serviceModel?: string | null;
  releaseRequestSubmitted?: boolean;
  patientCapacityStatus?: string | null;
  existingSignedConsentCodes?: string[];
  existingExpiredConsentCodes?: string[];
};

export type ConsentRecommendationOutput = {
  requiredConsents: string[];
  recommendedConsents: string[];
  missingConsents: string[];
  expiredConsents: string[];
};

export function deriveConsentRecommendations(
  input: ConsentRecommendationInput,
): ConsentRecommendationOutput {
  const required = new Set<string>(["GENERAL_TREATMENT"]);
  const recommended = new Set<string>();

  if (input.highRisk) {
    required.add("SURGERY_INVASIVE");
  }
  if (input.requiresAnesthesia) {
    required.add("SEDATION_ANESTHESIA");
  }
  if (input.requiresBloodProducts) {
    required.add("BLOOD_TRANSFUSION");
  }

  const serviceModel = (input.serviceModel ?? "").toLowerCase();
  if (serviceModel.includes("home")) {
    required.add("HOME_HEALTHCARE");
  }
  if (serviceModel.includes("extended") || serviceModel.includes("transfer")) {
    required.add("SPECIAL_PROCEDURE");
  }

  const capacity = (input.patientCapacityStatus ?? "").toUpperCase();
  if (capacity === "MINOR" || capacity === "LACKS_CAPACITY") {
    required.add("GUARDIAN_AUTHORIZATION");
  }

  if (input.releaseRequestSubmitted) {
    required.add("ROI_AUTH");
  }

  recommended.add("ADMISSION");
  if (input.procedureCode) {
    recommended.add("SPECIAL_PROCEDURE");
  }

  const signed = new Set(input.existingSignedConsentCodes ?? []);
  const missing = [...required].filter((code) => !signed.has(code));

  return {
    requiredConsents: [...required],
    recommendedConsents: [...recommended],
    missingConsents: missing,
    expiredConsents: input.existingExpiredConsentCodes ?? [],
  };
}
