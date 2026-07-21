import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import {
  WITNESS_ATTESTATION_VERSION,
  assertWitnessAttestation,
  assertWitnessEligibility,
  assertWitnessRoleAuthorized,
  formatSaudiArabiaTimestamp,
  hashRequestFingerprint,
  resolveAuthorizedWitnessRoles,
} from "@/lib/server/witness-requirement-service";
import {
  hasInformedConsentPermission,
} from "@/lib/modules/informed-consents-rbac";
import type { AuthContext } from "@/lib/server/auth";

function authFor(role: string): AuthContext {
  return {
    sub: `user-${role}`,
    role,
    user_type: "tenant_user",
    tenant_id: "tenant-1",
  } as AuthContext;
}

// --- Spec test 11: unauthorized witness role is rejected --------------------
test("only authorized operational roles may sign in each witness role", () => {
  assert.doesNotThrow(() => assertWitnessRoleAuthorized("nursing", "NURSING_REPRESENTATIVE"));
  assert.doesNotThrow(() =>
    assertWitnessRoleAuthorized("patient_affairs", "PATIENT_EXPERIENCE_REPRESENTATIVE"),
  );
  assert.throws(
    () => assertWitnessRoleAuthorized("doctor", "NURSING_REPRESENTATIVE"),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ROLE_UNAUTHORIZED",
  );
  assert.throws(
    () => assertWitnessRoleAuthorized("nursing", "PATIENT_EXPERIENCE_REPRESENTATIVE"),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ROLE_UNAUTHORIZED",
  );
  assert.deepEqual(resolveAuthorizedWitnessRoles("nursing"), ["NURSING_REPRESENTATIVE"]);
  assert.deepEqual(resolveAuthorizedWitnessRoles("patient_affairs"), [
    "PATIENT_EXPERIENCE_REPRESENTATIVE",
  ]);
});

test("RBAC grants consent:witness_attest to witness roles and denies it to clinicians", () => {
  assert.equal(hasInformedConsentPermission(authFor("nursing"), "consent:witness_attest"), true);
  assert.equal(
    hasInformedConsentPermission(authFor("patient_affairs"), "consent:witness_attest"),
    true,
  );
  assert.equal(hasInformedConsentPermission(authFor("doctor"), "consent:witness_attest"), false);
  assert.equal(hasInformedConsentPermission(authFor("viewer"), "consent:witness_attest"), false);
});

// --- Spec test 12: self-witnessing and duplicate protections ----------------
test("the responsible clinician cannot self-witness", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "doc-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        clinicianUserId: "doc-1",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_SELF_WITNESSING",
  );
});

test("the patient cannot self-witness", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "patient-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        patientUserId: "patient-1",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_SELF_WITNESSING",
  );
});

test("a witness must sign in the exact required role", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "nurse-1",
        candidateRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ROLE_MISMATCH",
  );
});

test("duplicate witness signatures and same-person dual roles are rejected", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "nurse-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        existingWitnesses: [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE" }],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_DUPLICATE_SIGNATURE",
  );

  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "nurse-1",
        candidateRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
        requiredRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
        existingWitnesses: [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE" }],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) =>
      (error as { code?: string }).code === "WITNESS_DUPLICATE_ROLE_SAME_PERSON",
  );

  assert.doesNotThrow(() =>
    assertWitnessEligibility({
      candidateUserId: "nurse-1",
      candidateRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
      requiredRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
      existingWitnesses: [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE" }],
      allowSamePersonMultipleRoles: true,
    }),
  );
});

test("a fully eligible witness passes the guard", () => {
  assert.doesNotThrow(() =>
    assertWitnessEligibility({
      candidateUserId: "nurse-1",
      candidateRole: "NURSING_REPRESENTATIVE",
      requiredRole: "NURSING_REPRESENTATIVE",
      clinicianUserId: "doc-1",
      patientUserId: "patient-1",
      existingWitnesses: [{ userId: "px-1", role: "PATIENT_EXPERIENCE_REPRESENTATIVE" }],
      allowSamePersonMultipleRoles: false,
    }),
  );
});

// --- Witness attestation ----------------------------------------------------
test("witness attestation must confirm identity, presence, and absence of coercion", () => {
  assert.doesNotThrow(() =>
    assertWitnessAttestation({
      identityChecked: true,
      signatureInPresence: true,
      noObjectionOrCoercion: true,
      attestationVersion: WITNESS_ATTESTATION_VERSION,
    }),
  );
  assert.throws(
    () =>
      assertWitnessAttestation({
        identityChecked: true,
        signatureInPresence: false,
        noObjectionOrCoercion: true,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ATTESTATION_INCOMPLETE",
  );
});

// --- Evidence helpers -------------------------------------------------------
test("Saudi Arabia timestamps are deterministic UTC+03:00", () => {
  const formatted = formatSaudiArabiaTimestamp(new Date("2026-07-14T07:30:00.000Z"));
  assert.equal(formatted, "2026-07-14T10:30:00.000+03:00");
});

test("request fingerprints are hashed, never raw", () => {
  const hash = hashRequestFingerprint("203.0.113.7");
  assert.ok(hash);
  assert.match(hash!, /^[0-9a-f]{64}$/);
  assert.ok(!hash!.includes("203.0.113.7"));
  assert.equal(hashRequestFingerprint(null), null);
});
