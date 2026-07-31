import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchConsentFieldMappingReadiness,
  type ConsentFieldMappingReadiness,
} from "./lib/api";
import { computeSupportsFilledDraftPreview } from "./utils/filledDraftPreviewCapability";

const imcApprovedAmputationPayload = {
  ok: true,
  source: "consent-field-mapping-foundation",
  persistence: { available: false, reason: "CONSENT_FORM_TABLE_UNAVAILABLE" },
  formId: "imc-approved-amputation",
  slug: "amputation",
  hasMapping: true,
  verificationStatus: "VERIFIED",
  sendBlocked: false,
  blockers: [],
  requiredDoctorFields: [
    { key: "condition_description_en", labelEn: "Condition in patient's own words", section: "B", type: "MULTILINE_TEXT" },
    { key: "condition_description_ar", labelEn: "Condition in patient's own words (Arabic)", section: "B", type: "MULTILINE_TEXT" },
    { key: "proposed_procedure_en", labelEn: "Proposed procedure, site and side", section: "C", type: "MULTILINE_TEXT" },
    { key: "proposed_procedure_ar", labelEn: "Proposed procedure, site and side (Arabic)", section: "C", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_en", labelEn: "Significant risks and procedure options", section: "D", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_ar", labelEn: "Significant risks and procedure options (Arabic)", section: "D", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_cont_en", labelEn: "Significant risks/options continuation", section: "D (cont.)", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_cont_ar", labelEn: "Significant risks/options continuation (Arabic)", section: "D (cont.)", type: "MULTILINE_TEXT" },
    { key: "risks_without_procedure_en", labelEn: "Risks of not having the procedure", section: "E", type: "MULTILINE_TEXT" },
    { key: "risks_without_procedure_ar", labelEn: "Risks of not having the procedure (Arabic)", section: "E", type: "MULTILINE_TEXT" },
    { key: "physician_name", labelEn: "Doctor or delegate name", type: "TEXT" },
    { key: "physician_designation", labelEn: "Doctor/delegate designation", type: "TEXT" },
    { key: "physician_signature", labelEn: "Doctor/delegate signature", type: "SIGNATURE" },
    { key: "interpreter_required", labelEn: "Interpreter required", section: "A", type: "CHECKBOX" },
    { key: "interpreter_present", labelEn: "Interpreter present", section: "A", type: "CHECKBOX" },
  ],
  requiredAnesthesiaFields: [
    { key: "anaesthetic_discussed_en", labelEn: "Type of anaesthetic discussed", section: "F", type: "MULTILINE_TEXT", requiredWhen: "anesthesia_applies === true" },
    { key: "anaesthetic_discussed_ar", labelEn: "Type of anaesthetic discussed (Arabic)", section: "F", type: "MULTILINE_TEXT", requiredWhen: "anesthesia_applies === true" },
  ],
  requiredPatientFields: [
    { key: "consent_patient_name", labelEn: "Patient consent name", type: "TEXT" },
    { key: "patient_signature", labelEn: "Patient signature", type: "SIGNATURE" },
  ],
  acroForm: {
    canonicalTemplateIdentity: {
      formId: "imc-approved-amputation",
      slug: "amputation",
      titleEn: "Amputation",
      titleAr: "البتر",
      templateCode: "IMC MR 1135",
      layoutFamily: "IMC_MR_1135_ACROFORM",
    },
    manifestState: {
      present: true,
      hashMatches: true,
      hash: "5f9109c99544aefe7765239f7a3985bbe1324bd8fe0648f9e6ca966dc812a553",
      status: "READY",
      blockers: [],
    },
    semanticPhysicianFields: [
      { key: "condition_description_en", labelEn: "Condition in patient's own words", type: "MULTILINE_TEXT", required: true, role: "PHYSICIAN_REQUIRED" },
    ],
    patientSignatureTargets: [{ key: "patient_signature", labelEn: "Patient signature", role: "PATIENT_REQUIRED" }],
    physicianSignatureTargets: [{ key: "physician_signature", labelEn: "Doctor/delegate signature", role: "PHYSICIAN_REQUIRED" }],
    interpreterApplicable: true,
    anesthesiaApplicable: true,
    educationRequired: true,
    substituteDecisionMakerApplicable: true,
    witnessApplicable: true,
  },
};

function createMockFetch(responsePayload: unknown) {
  return async (): Promise<Response> => {
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("fetchConsentFieldMappingReadiness parses acroForm manifest for imc-approved-amputation", async () => {
  const originalFetch = global.fetch;
  global.fetch = createMockFetch(imcApprovedAmputationPayload);

  try {
    const readiness = await fetchConsentFieldMappingReadiness("imc-approved-amputation");

    assert.equal(readiness.formId, "imc-approved-amputation");
    assert.equal(readiness.hasMapping, true);
    assert.equal(readiness.verificationStatus, "VERIFIED");
    assert.ok(readiness.acroForm, "acroForm should be populated");
    assert.equal(readiness.acroForm?.canonicalTemplateIdentity.formId, "imc-approved-amputation");
    assert.equal(readiness.acroForm?.manifestState.status, "READY");
    assert.equal(
      readiness.acroForm?.manifestState.hash,
      "5f9109c99544aefe7765239f7a3985bbe1324bd8fe0648f9e6ca966dc812a553",
    );
    assert.equal(readiness.acroForm?.patientSignatureTargets.length, 1);
    assert.equal(readiness.acroForm?.physicianSignatureTargets.length, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test("computeSupportsFilledDraftPreview is true for verified imc-approved-amputation manifest/mapping/source", () => {
  const fieldMappingReadiness = {
    ...imcApprovedAmputationPayload,
    ok: true,
    source: "consent-field-mapping-foundation",
    persistence: { available: false, reason: "CONSENT_FORM_TABLE_UNAVAILABLE" },
  } as unknown as ConsentFieldMappingReadiness;

  const supports = computeSupportsFilledDraftPreview({
    fieldMappingReadiness,
    hasApprovedPdfSource: true,
    fieldMappingVerified: true,
  });

  assert.equal(supports, true, "Generate Filled Preview card should be rendered");
});

test("computeSupportsFilledDraftPreview is false when manifest is not READY", () => {
  const fieldMappingReadiness = {
    ...imcApprovedAmputationPayload,
    acroForm: {
      ...imcApprovedAmputationPayload.acroForm,
      manifestState: {
        ...imcApprovedAmputationPayload.acroForm.manifestState,
        status: "NOT_READY",
        hash: null,
      },
    },
  } as unknown as ConsentFieldMappingReadiness;

  const supports = computeSupportsFilledDraftPreview({
    fieldMappingReadiness,
    hasApprovedPdfSource: true,
    fieldMappingVerified: true,
  });

  assert.equal(supports, false);
});

test("computeSupportsFilledDraftPreview is false when field mapping is not verified", () => {
  const fieldMappingReadiness = {
    ...imcApprovedAmputationPayload,
    verificationStatus: "DRAFT",
  } as unknown as ConsentFieldMappingReadiness;

  const supports = computeSupportsFilledDraftPreview({
    fieldMappingReadiness,
    hasApprovedPdfSource: true,
    fieldMappingVerified: false,
  });

  assert.equal(supports, false);
});

test("computeSupportsFilledDraftPreview is false when approved PDF source is not verified", () => {
  const supports = computeSupportsFilledDraftPreview({
    fieldMappingReadiness: imcApprovedAmputationPayload as unknown as ConsentFieldMappingReadiness,
    hasApprovedPdfSource: false,
    fieldMappingVerified: true,
  });

  assert.equal(supports, false);
});
