import assert from "node:assert/strict";
import test from "node:test";
import { computeFilledPreviewBlocker } from "./filledPreviewBlocker";
import type { ConsentFieldMappingReadiness } from "../lib/api";

const baseReadyInput = {
  supportsFilledDraftPreview: true,
  hasApprovedPdfSource: true,
  fieldMappingVerified: true,
  patientReady: true,
  patientDob: "1985-03-15",
  encounterReady: true,
  assemblyReady: true,
  doctorCompletionReady: true,
  anesthesiaMappingReady: true,
  patientSignatureMapped: true,
  filledDraftStatus: "idle" as const,
  fieldMappingReadiness: undefined as ConsentFieldMappingReadiness | undefined,
};

test("computeFilledPreviewBlocker returns null when all gates pass", () => {
  assert.equal(computeFilledPreviewBlocker(baseReadyInput), null);
});

test("computeFilledPreviewBlocker reports missing patient DOB", () => {
  const result = computeFilledPreviewBlocker({ ...baseReadyInput, patientDob: null });
  assert.equal(result, "Missing patient DOB");
});

test("computeFilledPreviewBlocker reports incomplete physician field", () => {
  const result = computeFilledPreviewBlocker({ ...baseReadyInput, doctorCompletionReady: false });
  assert.equal(result, "Incomplete physician field");
});

test("computeFilledPreviewBlocker reports missing physician signature via incomplete field", () => {
  const result = computeFilledPreviewBlocker({ ...baseReadyInput, doctorCompletionReady: false });
  assert.equal(result, "Incomplete physician field");
});

test("computeFilledPreviewBlocker reports mapping not verified", () => {
  const result = computeFilledPreviewBlocker({ ...baseReadyInput, fieldMappingVerified: false });
  assert.equal(result, "Mapping not verified");
});

test("computeFilledPreviewBlocker reports manifest not ready", () => {
  const result = computeFilledPreviewBlocker({
    ...baseReadyInput,
    supportsFilledDraftPreview: false,
    hasApprovedPdfSource: true,
    fieldMappingVerified: true,
    fieldMappingReadiness: {
      formId: "test",
      hasMapping: true,
      verificationStatus: "VERIFIED",
      sendBlocked: false,
      blockers: [],
      requiredDoctorFields: [],
      requiredAnesthesiaFields: [],
      requiredPatientFields: [],
      acroForm: {
        canonicalTemplateIdentity: {
          formId: "test",
          slug: "test",
          titleEn: "Test",
          layoutFamily: "TEST",
        },
        manifestState: {
          present: true,
          hashMatches: true,
          hash: "abc",
          status: "NOT_READY",
          blockers: ["hash mismatch"],
        },
        patientSignatureTargets: [],
        physicianSignatureTargets: [],
        interpreterApplicable: false,
        anesthesiaApplicable: false,
        educationRequired: false,
        substituteDecisionMakerApplicable: false,
        witnessApplicable: false,
      },
    } as unknown as ConsentFieldMappingReadiness,
  });
  assert.equal(result, "Manifest not ready");
});

test("computeFilledPreviewBlocker reports anesthesia decision missing", () => {
  const result = computeFilledPreviewBlocker({ ...baseReadyInput, anesthesiaMappingReady: false });
  assert.equal(result, "Anesthesia decision missing");
});
