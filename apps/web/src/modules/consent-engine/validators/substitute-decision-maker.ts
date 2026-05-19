import type { DynamicConsentPayload, DynamicConsentPerson } from "@/modules/consent-engine/engine/types";

export interface SubstituteDecisionMakerValidation {
  isRequired: boolean;
  isValid: boolean;
  errors: string[];
}

export const SUBSTITUTE_DECISION_MAKER_RULES = {
  minorPatient: {
    ageThreshold: 18,
    requiresSDM: true,
    validRelationships: ["parent", "legal_guardian", "appointed_guardian"],
  },
  incapacitatedPatient: {
    requiresSDM: true,
    validRelationships: ["legal_guardian", "appointed_guardian", "power_of_attorney", "court_appointed"],
  },
  adultPatient: {
    requiresSDM: false,
    allowsOptional: true,
    validRelationships: ["spouse", "adult_child", "sibling", "trusted_delegate"],
  },
};

export function isSubstituteDecisionMakerRequired(
  patientAge?: number,
  patientCapacity?: "full" | "limited" | "incapacitated",
): boolean {
  if (patientCapacity === "incapacitated" || patientCapacity === "limited") {
    return true;
  }

  if (patientAge && patientAge < SUBSTITUTE_DECISION_MAKER_RULES.minorPatient.ageThreshold) {
    return true;
  }

  return false;
}

export function validateSubstituteDecisionMaker(
  sdm: DynamicConsentPerson | undefined,
  patientAge?: number,
  patientCapacity?: "full" | "limited" | "incapacitated",
): SubstituteDecisionMakerValidation {
  const errors: string[] = [];
  const isRequired = isSubstituteDecisionMakerRequired(patientAge, patientCapacity);

  if (isRequired && !sdm) {
    errors.push("Substitute Decision Maker (guardian/representative) is required for this patient");
    return {
      isRequired: true,
      isValid: false,
      errors,
    };
  }

  if (sdm) {
    if (!sdm.name) {
      errors.push("Substitute Decision Maker name is required");
    }

    if (!sdm.role) {
      errors.push("Substitute Decision Maker relationship/role is required");
    }

    if (sdm.role && !SUBSTITUTE_DECISION_MAKER_RULES.adultPatient.validRelationships.includes(sdm.role.toLowerCase())) {
      errors.push(`Invalid relationship: ${sdm.role}. Valid relationships: ${SUBSTITUTE_DECISION_MAKER_RULES.adultPatient.validRelationships.join(", ")}`);
    }
  }

  return {
    isRequired,
    isValid: errors.length === 0,
    errors,
  };
}
