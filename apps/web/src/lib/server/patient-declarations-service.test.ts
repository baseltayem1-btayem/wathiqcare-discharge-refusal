import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";

import {
  CLINICIAN_ATTESTATION_VERSION,
  PATIENT_DECLARATION_KEYS,
  PATIENT_DECLARATION_VERSION,
  assertClinicianAttestationComplete,
  assertPatientDeclarationsComplete,
  buildClinicianAttestationRecord,
  buildPatientDeclarationRecord,
  validateClinicianAttestation,
  validatePatientDeclarations,
} from "@/lib/server/patient-declarations-service";

const DOCUMENT_HASH = "sha256:consent-content-abc123";

test("patient declaration record is versioned, actor-bound and hash-bound", () => {
  const record = buildPatientDeclarationRecord({
    actorId: "challenge-1",
    documentHash: DOCUMENT_HASH,
    acceptedKeys: [...PATIENT_DECLARATION_KEYS],
    acceptedAt: "2026-07-14T07:00:00.000Z",
  });
  assert.equal(record.version, PATIENT_DECLARATION_VERSION);
  assert.equal(record.actorRole, "PATIENT");
  assert.equal(record.documentHash, DOCUMENT_HASH);
  assert.equal(record.acceptedKeys.length, PATIENT_DECLARATION_KEYS.length);
  assert.equal(record.acceptedKeys.length, 7);
});

test("declaration keys cover the seven required declarations", () => {
  assert.deepEqual([...PATIENT_DECLARATION_KEYS], [
    "IDENTITY_AND_CAPACITY",
    "INFORMATION_REVIEWED",
    "PROCEDURE_RISKS_ALTERNATIVES_UNDERSTOOD",
    "QUESTIONS_OPPORTUNITY",
    "ANSWERS_RECEIVED",
    "VOLUNTARY_NO_COERCION",
    "ELECTRONIC_SIGNATURE_ACCEPTED",
  ]);
});

test("incomplete declarations report the missing keys", () => {
  const record = buildPatientDeclarationRecord({
    documentHash: DOCUMENT_HASH,
    acceptedKeys: ["IDENTITY_AND_CAPACITY"],
  });
  const result = validatePatientDeclarations(record, DOCUMENT_HASH);
  assert.equal(result.complete, false);
  assert.equal(result.missing.length, PATIENT_DECLARATION_KEYS.length - 1);
  assert.throws(
    () => assertPatientDeclarationsComplete(record, DOCUMENT_HASH),
    (error: unknown) => (error as { code?: string }).code === "PATIENT_DECLARATIONS_INCOMPLETE",
  );
});

// --- Spec test 13: stale document hash invalidates patient evidence ---------
test("declarations bound to an outdated document hash are rejected as stale", () => {
  const record = buildPatientDeclarationRecord({
    documentHash: "sha256:old-content",
    acceptedKeys: [...PATIENT_DECLARATION_KEYS],
  });
  const result = validatePatientDeclarations(record, DOCUMENT_HASH);
  assert.equal(result.stale, true);
  assert.equal(result.complete, false);
  assert.throws(
    () => assertPatientDeclarationsComplete(record, DOCUMENT_HASH),
    (error: unknown) => (error as { code?: string }).code === "EVIDENCE_STALE_DOCUMENT_HASH",
  );
});

test("invalid declaration payloads fail closed", () => {
  assert.throws(
    () => buildPatientDeclarationRecord({ documentHash: "", acceptedKeys: [] }),
    (error: unknown) => (error as { code?: string }).code === "PATIENT_DECLARATIONS_INVALID",
  );
  assert.throws(
    () =>
      buildPatientDeclarationRecord({
        documentHash: DOCUMENT_HASH,
        acceptedKeys: ["NOT_A_REAL_KEY"],
      }),
    (error: unknown) => (error as { code?: string }).code === "PATIENT_DECLARATIONS_INVALID",
  );
});

test("clinician attestation is a separate versioned hash-bound record", () => {
  const record = buildClinicianAttestationRecord({
    clinicianUserId: "doc-1",
    documentHash: DOCUMENT_HASH,
    explainedProcedureRisksAlternatives: true,
    answeredQuestions: true,
    attestedAt: "2026-07-14T07:05:00.000Z",
  });
  assert.equal(record.version, CLINICIAN_ATTESTATION_VERSION);
  assert.equal(record.clinicianUserId, "doc-1");
  assert.equal(validateClinicianAttestation(record, DOCUMENT_HASH).complete, true);

  const missing = validateClinicianAttestation(null, DOCUMENT_HASH);
  assert.equal(missing.complete, false);
  assert.throws(
    () => assertClinicianAttestationComplete(null, DOCUMENT_HASH),
    (error: unknown) => (error as { code?: string }).code === "CLINICIAN_ATTESTATION_MISSING",
  );

  const stale = validateClinicianAttestation(
    { ...record, documentHash: "sha256:old" },
    DOCUMENT_HASH,
  );
  assert.equal(stale.stale, true);
  assert.throws(
    () =>
      assertClinicianAttestationComplete({ ...record, documentHash: "sha256:old" }, DOCUMENT_HASH),
    (error: unknown) => (error as { code?: string }).code === "EVIDENCE_STALE_DOCUMENT_HASH",
  );
});

test("attestation with unanswered questions is incomplete", () => {
  const record = buildClinicianAttestationRecord({
    clinicianUserId: "doc-1",
    documentHash: DOCUMENT_HASH,
    explainedProcedureRisksAlternatives: true,
    answeredQuestions: false,
  });
  assert.equal(validateClinicianAttestation(record, DOCUMENT_HASH).complete, false);
});
