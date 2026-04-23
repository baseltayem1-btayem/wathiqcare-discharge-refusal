import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

import {
  assertWitnessIntegrityOrThrow,
  evaluateWitnessIntegrity,
} from "./witness-integrity-service";

function baseWitness(overrides: Record<string, unknown> = {}) {
  return {
    witness_id: crypto.randomUUID(),
    full_name: "Witness One",
    role: "Doctor",
    role_category: "clinical",
    id_type: "NATIONAL_ID",
    id_number: "1234567890",
    mobile_number: "+966512345678",
    identity_hash: "hash-1",
    attestation_confirmed: true,
    attested_at: "2026-04-23T10:00:00.000Z",
    attestation_language: "en",
    attestation_version: "1.0",
    signature_type: "DIGITAL_SIGNATURE",
    signature_hash: "sig-1",
    otp_reference: null,
    verification_status: "VERIFIED",
    manual_fallback_used: false,
    created_at: "2026-04-23T10:00:00.000Z",
    created_by: "user-1",
    updated_at: "2026-04-23T10:00:00.000Z",
    updated_by: "user-1",
    ip_address: "10.0.0.1",
    device_fingerprint: "browser-a",
    locked: false,
    edit_history: [],
    ...overrides,
  };
}

test("fails when fewer than two witnesses are present", () => {
  const result = evaluateWitnessIntegrity({
    witnesses: [baseWitness()],
  } as never);

  assert.equal(result.minimumWitnessesMet, false);
  assert.ok(result.blockers.includes("Minimum witnesses requirement not met"));
});

test("passes with two valid witnesses and mixed role composition", () => {
  const result = evaluateWitnessIntegrity({
    witnesses: [
      baseWitness(),
      baseWitness({
        witness_id: "w-2",
        full_name: "Witness Two",
        role: "Family Member",
        role_category: "non_clinical",
        id_number: "A7788991",
        mobile_number: "0555555555",
        signature_hash: "sig-2",
        identity_hash: "hash-2",
      }),
    ],
  } as never);

  assert.equal(result.blockers.length, 0);
});

test("throws structured error for duplicate identities", () => {
  assert.throws(
    () =>
      assertWitnessIntegrityOrThrow({
        witnesses: [
          baseWitness(),
          baseWitness({
            witness_id: "w-2",
            role_category: "non_clinical",
            id_number: "1234567890",
            mobile_number: "+966512345678",
          }),
        ],
      } as never),
    (error: unknown) => {
      const value = error as { message?: string; code?: string; fields?: Record<string, string> };
      return (
        value.message === "Witness identity not verified" &&
        value.code === "WITNESS_IDENTITY_NOT_VERIFIED" &&
        Object.keys(value.fields ?? {}).some((key) => key.includes("duplicate"))
      );
    },
  );
});

test("throws structured error when role composition is invalid", () => {
  assert.throws(
    () =>
      assertWitnessIntegrityOrThrow({
        witnesses: [
          baseWitness(),
          baseWitness({
            witness_id: "w-2",
            full_name: "Witness Two",
            role: "Nurse",
            role_category: "clinical",
            id_number: "9988776655",
            mobile_number: "+966500000001",
            identity_hash: "hash-2",
            signature_hash: "sig-2",
          }),
        ],
      } as never),
    (error: unknown) => {
      const value = error as { message?: string; code?: string };
      return value.message === "Witness roles not compliant" && value.code === "INVALID_WITNESS_COMPOSITION";
    },
  );
});

test("throws structured error when attestation is incomplete", () => {
  assert.throws(
    () =>
      assertWitnessIntegrityOrThrow({
        witnesses: [
          baseWitness(),
          baseWitness({
            witness_id: "w-2",
            full_name: "Witness Two",
            role_category: "non_clinical",
            id_number: "ZZ77661",
            mobile_number: "+966500000002",
            identity_hash: "hash-2",
            signature_hash: "",
          }),
        ],
      } as never),
    (error: unknown) => {
      const value = error as { message?: string; code?: string };
      return value.message === "Witness attestation incomplete" && value.code === "WITNESS_ATTESTATION_INCOMPLETE";
    },
  );
});
