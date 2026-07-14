import { ApiError } from "@/lib/server/http";

/**
 * Patient declarations and clinician attestation records.
 *
 * Patient declarations and the clinician attestation are intentionally
 * separate records: the patient declares their own understanding and
 * voluntariness, while the clinician separately attests that the required
 * explanation was provided and questions were answered. Both records are
 * versioned and bound to the exact finalized document hash; stale evidence
 * is rejected when the document content changes after verification.
 */

export const PATIENT_DECLARATION_VERSION = "1.0.0";
export const CLINICIAN_ATTESTATION_VERSION = "1.0.0";

export const PATIENT_DECLARATION_KEYS = [
  "IDENTITY_AND_CAPACITY",
  "INFORMATION_REVIEWED",
  "PROCEDURE_RISKS_ALTERNATIVES_UNDERSTOOD",
  "QUESTIONS_OPPORTUNITY",
  "ANSWERS_RECEIVED",
  "VOLUNTARY_NO_COERCION",
  "ELECTRONIC_SIGNATURE_ACCEPTED",
] as const;

export type PatientDeclarationKey = (typeof PATIENT_DECLARATION_KEYS)[number];

export type PatientDeclarationRecord = {
  version: string;
  actorId: string | null;
  actorRole: "PATIENT" | "GUARDIAN";
  documentHash: string;
  acceptedKeys: PatientDeclarationKey[];
  acceptedAt: string;
  locale: "ar" | "en" | "bilingual";
};

export type ClinicianAttestationRecord = {
  version: string;
  clinicianUserId: string;
  documentHash: string;
  attestedAt: string;
  explainedProcedureRisksAlternatives: boolean;
  answeredQuestions: boolean;
};

function isDeclarationKey(value: unknown): value is PatientDeclarationKey {
  return (
    typeof value === "string" &&
    (PATIENT_DECLARATION_KEYS as readonly string[]).includes(value)
  );
}

export function buildPatientDeclarationRecord(input: {
  actorId?: string | null;
  actorRole?: "PATIENT" | "GUARDIAN";
  documentHash: string;
  acceptedKeys: unknown;
  acceptedAt?: string;
  locale?: "ar" | "en" | "bilingual";
}): PatientDeclarationRecord {
  if (!input.documentHash || typeof input.documentHash !== "string") {
    throw new ApiError(400, "documentHash is required for patient declarations", {
      code: "PATIENT_DECLARATIONS_INVALID",
    });
  }
  if (!Array.isArray(input.acceptedKeys) || !input.acceptedKeys.every(isDeclarationKey)) {
    throw new ApiError(400, "Invalid patient declaration keys", {
      code: "PATIENT_DECLARATIONS_INVALID",
    });
  }
  const uniqueKeys = Array.from(new Set(input.acceptedKeys));
  return {
    version: PATIENT_DECLARATION_VERSION,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole === "GUARDIAN" ? "GUARDIAN" : "PATIENT",
    documentHash: input.documentHash,
    acceptedKeys: uniqueKeys,
    acceptedAt: input.acceptedAt ?? new Date().toISOString(),
    locale: input.locale ?? "bilingual",
  };
}

export type PatientDeclarationValidation = {
  complete: boolean;
  missing: PatientDeclarationKey[];
  stale: boolean;
};

export function validatePatientDeclarations(
  record: PatientDeclarationRecord | null | undefined,
  expectedDocumentHash: string,
): PatientDeclarationValidation {
  if (!record) {
    return {
      complete: false,
      missing: [...PATIENT_DECLARATION_KEYS],
      stale: false,
    };
  }
  const missing = PATIENT_DECLARATION_KEYS.filter(
    (key) => !record.acceptedKeys.includes(key),
  );
  const stale = record.documentHash !== expectedDocumentHash;
  return {
    complete: missing.length === 0 && !stale,
    missing,
    stale,
  };
}

export function assertPatientDeclarationsComplete(
  record: PatientDeclarationRecord | null | undefined,
  expectedDocumentHash: string,
): void {
  const result = validatePatientDeclarations(record, expectedDocumentHash);
  if (result.stale) {
    throw new ApiError(
      409,
      "Patient declarations were captured for an outdated document version; the declarations must be repeated for the current document.",
      { code: "EVIDENCE_STALE_DOCUMENT_HASH" },
    );
  }
  if (!result.complete) {
    throw new ApiError(
      409,
      `Patient declarations are incomplete: missing ${result.missing.join(", ")}`,
      { code: "PATIENT_DECLARATIONS_INCOMPLETE" },
    );
  }
}

export function buildClinicianAttestationRecord(input: {
  clinicianUserId: string;
  documentHash: string;
  attestedAt?: string;
  explainedProcedureRisksAlternatives: unknown;
  answeredQuestions: unknown;
}): ClinicianAttestationRecord {
  if (!input.clinicianUserId) {
    throw new ApiError(400, "clinicianUserId is required for clinician attestation", {
      code: "CLINICIAN_ATTESTATION_INVALID",
    });
  }
  if (!input.documentHash || typeof input.documentHash !== "string") {
    throw new ApiError(400, "documentHash is required for clinician attestation", {
      code: "CLINICIAN_ATTESTATION_INVALID",
    });
  }
  return {
    version: CLINICIAN_ATTESTATION_VERSION,
    clinicianUserId: input.clinicianUserId,
    documentHash: input.documentHash,
    attestedAt: input.attestedAt ?? new Date().toISOString(),
    explainedProcedureRisksAlternatives: input.explainedProcedureRisksAlternatives === true,
    answeredQuestions: input.answeredQuestions === true,
  };
}

export type ClinicianAttestationValidation = {
  complete: boolean;
  stale: boolean;
};

export function validateClinicianAttestation(
  record: ClinicianAttestationRecord | null | undefined,
  expectedDocumentHash: string,
): ClinicianAttestationValidation {
  if (!record) {
    return { complete: false, stale: false };
  }
  const stale = record.documentHash !== expectedDocumentHash;
  const complete =
    record.explainedProcedureRisksAlternatives === true &&
    record.answeredQuestions === true &&
    !stale;
  return { complete, stale };
}

export function assertClinicianAttestationComplete(
  record: ClinicianAttestationRecord | null | undefined,
  expectedDocumentHash: string,
): void {
  const result = validateClinicianAttestation(record, expectedDocumentHash);
  if (result.stale) {
    throw new ApiError(
      409,
      "Clinician attestation was captured for an outdated document version; the attestation must be repeated for the current document.",
      { code: "EVIDENCE_STALE_DOCUMENT_HASH" },
    );
  }
  if (!result.complete) {
    throw new ApiError(
      409,
      "Clinician attestation is missing or incomplete: the clinician must attest that the procedure, material risks, complications and alternatives were explained and questions answered.",
      { code: "CLINICIAN_ATTESTATION_MISSING" },
    );
  }
}
