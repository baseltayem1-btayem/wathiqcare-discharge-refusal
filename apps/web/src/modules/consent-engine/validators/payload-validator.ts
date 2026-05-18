import type { DynamicConsentPayload } from "@/modules/consent-engine/engine/types";

function normalizeText(value: string | null | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

export function validateDynamicConsentPayload(payload: DynamicConsentPayload): string[] {
  const issues: string[] = [];

  if (!normalizeText(payload.patient.name)) {
    issues.push("Patient name is required.");
  }

  if (!normalizeText(payload.physician.name)) {
    issues.push("Physician name is required.");
  }

  if (!normalizeText(payload.diagnosis)) {
    issues.push("Diagnosis is required.");
  }

  if (!normalizeText(payload.procedure)) {
    issues.push("Procedure is required.");
  }

  if (!normalizeText(payload.specialty)) {
    issues.push("Specialty is required.");
  }

  return issues;
}

export function normalizeDynamicConsentPayload(payload: DynamicConsentPayload): DynamicConsentPayload {
  return {
    ...payload,
    patient: {
      ...payload.patient,
      name: normalizeText(payload.patient.name, "Unknown Patient"),
    },
    physician: {
      ...payload.physician,
      name: normalizeText(payload.physician.name, "Unknown Physician"),
    },
    diagnosis: normalizeText(payload.diagnosis, "Clinical diagnosis pending final review"),
    procedure: normalizeText(payload.procedure, "Planned clinical intervention"),
    specialty: normalizeText(payload.specialty, "GENERAL_MEDICINE").toUpperCase(),
    encounter: {
      ...payload.encounter,
      specialty: normalizeText(payload.encounter.specialty, payload.specialty).toUpperCase(),
      diagnosis: normalizeText(payload.encounter.diagnosis, payload.diagnosis),
      plannedProcedure: normalizeText(payload.encounter.plannedProcedure, payload.procedure),
    },
  };
}