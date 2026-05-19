import type { DynamicConsentPayload } from "@/modules/consent-engine/engine/types";

export interface SignatureValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SignatureRequirements {
  patientRequired: boolean;
  physicianRequired: boolean;
  interpreterRequired?: boolean;
  witnessRequired?: boolean;
  witnessCount?: number;
}

export function validateSignatureRequirements(
  payload: DynamicConsentPayload,
  requirements: SignatureRequirements,
): SignatureValidationResult {
  const errors: string[] = [];

  if (requirements.patientRequired && !payload.patient?.id) {
    errors.push("Patient signature is required but patient ID is missing");
  }

  if (requirements.physicianRequired && !payload.physician?.id) {
    errors.push("Physician signature is required but physician ID is missing");
  }

  if (requirements.witnessRequired && requirements.witnessCount) {
    if (!payload.signatures?.witnessRequired) {
      errors.push(`Witness signatures required (${requirements.witnessCount} witness/witnesses)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePhysicianDeclaration(payload: DynamicConsentPayload): SignatureValidationResult {
  const errors: string[] = [];

  if (!payload.physician?.name) {
    errors.push("Physician name is required for declaration");
  }

  if (!payload.physician?.identifier) {
    errors.push("Physician license/identifier is required for declaration");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateWitnessRequirements(
  payload: DynamicConsentPayload,
  requiredWitnesses: number = 1,
): SignatureValidationResult {
  const errors: string[] = [];

  if (payload.signatures?.witnessRequired && !payload.signatures?.patientRequired) {
    errors.push("Witness signature cannot be required without patient signature");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
