import assert from "node:assert/strict";
import test from "node:test";
import { computePhysicianJourneyReadiness } from "@/lib/server/physician-journey-readiness";

const baseArgs = {
  doctorCompletionValues: {},
  physicianSignatureDataUrl: "",
  previewReviewed: false,
  filledDraftStatus: "idle" as const,
  filledDraftReviewed: false,
  recipientMobile: "",
  recipientEmail: "",
  sendEligibility: { allowlisted: true, reason: "Pilot allowlisted." },
  draftApproved: false,
  acknowledgedBlockers: new Set<string>(),
  physicianContext: {
    userId: "physician-1",
    name: "Dr. Ahmed",
    email: "ahmed@example.com",
    tenantId: "tenant-1",
  },
} as const;

const mr1135FieldMapping = {
  hasMapping: true,
  verificationStatus: "VERIFIED",
  formId: "imc-approved-amputation",
  requiredDoctorFields: [
    { key: "condition_description_en", labelEn: "Condition in patient's own words", type: "MULTILINE_TEXT" },
    { key: "condition_description_ar", labelEn: "Condition in patient's own words (Arabic)", type: "MULTILINE_TEXT" },
    { key: "proposed_procedure_en", labelEn: "Proposed procedure, site and side", type: "MULTILINE_TEXT" },
    { key: "proposed_procedure_ar", labelEn: "Proposed procedure, site and side (Arabic)", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_en", labelEn: "Significant risks and procedure options", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_ar", labelEn: "Significant risks and procedure options (Arabic)", type: "MULTILINE_TEXT" },
    { key: "risks_without_procedure_en", labelEn: "Risks of not having the procedure", type: "MULTILINE_TEXT" },
    { key: "risks_without_procedure_ar", labelEn: "Risks of not having the procedure (Arabic)", type: "MULTILINE_TEXT" },
    { key: "physician_name", labelEn: "Doctor or delegate name", type: "TEXT" },
    { key: "physician_designation", labelEn: "Doctor/delegate designation", type: "TEXT" },
    { key: "physician_signature", labelEn: "Doctor/delegate signature", type: "SIGNATURE" },
    { key: "interpreter_required", labelEn: "Interpreter required", type: "CHECKBOX" },
    { key: "interpreter_present", labelEn: "Interpreter present", type: "CHECKBOX" },
  ],
  requiredAnesthesiaFields: [
    { key: "anaesthetic_discussed_en", labelEn: "Type of anaesthetic discussed", type: "MULTILINE_TEXT", requiredWhen: "anesthesia_applies === true" },
    { key: "anaesthetic_discussed_ar", labelEn: "Type of anaesthetic discussed (Arabic)", type: "MULTILINE_TEXT", requiredWhen: "anesthesia_applies === true" },
  ],
  requiredPatientFields: [
    { key: "consent_patient_name", labelEn: "Patient consent name", type: "TEXT" },
    { key: "patient_signature", labelEn: "Patient signature", type: "SIGNATURE" },
  ],
  interpreterApplicable: true,
  acroForm: {
    canonicalTemplateIdentity: {
      formId: "imc-approved-amputation",
      slug: "amputation",
      titleEn: "Amputation",
      layoutFamily: "IMC_MR_1135_ACROFORM",
    },
    manifestState: {
      status: "READY",
      present: true,
      hashMatches: true,
      hash: "abc",
      blockers: [],
    },
    semanticPhysicianFields: [],
    patientSignatureTargets: [],
    physicianSignatureTargets: [],
    interpreterApplicable: true,
    anesthesiaApplicable: true,
    educationRequired: true,
    substituteDecisionMakerApplicable: false,
    witnessApplicable: false,
  } as unknown as import("@/components/informed-consents/production-workspace/lib/api").ConsentFieldMappingReadiness["acroForm"],
};

function findItem(readiness: ReturnType<typeof computePhysicianJourneyReadiness>, key: string) {
  return readiness.items.find((item) => item.key === key);
}

test("initial MR1135 readiness reports required physician fields, not 0/0", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
  });

  const physicianFieldsItem = findItem(readiness, "physician_fields_complete");
  assert.ok(physicianFieldsItem);
  assert.equal(physicianFieldsItem.status, "BLOCKED");
  assert.ok(physicianFieldsItem.detail?.includes("Condition in patient's own words"));
});

test("MR1135 physician fields are BLOCKED, not NOT_APPLICABLE", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
  });

  const physicianFieldsItem = findItem(readiness, "physician_fields_complete");
  assert.equal(physicianFieldsItem?.status, "BLOCKED");
});

test("MR1135 physician signature is REQUIRED, not NOT_APPLICABLE", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
  });

  const signatureItem = findItem(readiness, "physician_signature_complete");
  assert.equal(signatureItem?.status, "REQUIRED");
});

test("MR1135 patient signature mapping is COMPLETE", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
  });

  const patientSignatureItem = findItem(readiness, "patient_signature_mapped");
  assert.equal(patientSignatureItem?.status, "COMPLETE");
});

test("MR1135 incomplete bilingual clinical data blocks readiness", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      significant_risks_options_en: "Infection, bleeding.",
      risks_without_procedure_en: "Sepsis.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
  });

  const physicianFieldsItem = findItem(readiness, "physician_fields_complete");
  assert.equal(physicianFieldsItem?.status, "BLOCKED");
  assert.ok(physicianFieldsItem?.detail?.includes("Arabic"));
});

test("MR1135 unanswered interpreter decision blocks readiness", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
  });

  const physicianFieldsItem = findItem(readiness, "physician_fields_complete");
  assert.equal(physicianFieldsItem?.status, "BLOCKED");
  assert.ok(physicianFieldsItem?.detail?.includes("Interpreter"));
});

test("MR1135 completed synthetic values update the field count correctly", () => {
  const partial = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
  });

  const physicianFieldsItem = findItem(partial, "physician_fields_complete");
  assert.equal(physicianFieldsItem?.status, "COMPLETE");
});

test("MR1135 preview reviewed remains required when filled draft is current but not reviewed", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
    previewReviewed: false,
    filledDraftStatus: "current",
    filledDraftReviewed: false,
  });

  assert.equal(findItem(readiness, "filled_draft_current")?.status, "COMPLETE");
  const previewItem = findItem(readiness, "preview_reviewed");
  assert.equal(previewItem?.status, "REQUIRED");
  assert.equal(readiness.sendReady, false);
});

test("MR1135 readiness can reach 100 percent only after all current evidence", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    patient: {
      id: "patient-1",
      mrn: "MRN-000001",
      name: "Test Patient",
      dateOfBirth: "1985-03-15",
      languagePreference: "bilingual",
    },
    encounter: {
      id: "enc-1",
      encounterId: "enc-1",
    },
    selectedProcedure: {
      id: "imc-approved-amputation",
      titleEn: "Amputation",
      titleAr: "",
      procedureCode: "amputation",
      categoryCode: "general-surgery",
      specialty: "General Surgery",
      anesthesiaRequired: true,
    },
    assembly: {
      tenantId: "tenant-1",
      status: "ready",
      procedureId: "imc-approved-amputation",
      procedureCode: "amputation",
      procedureNameEn: "Amputation",
      procedureNameAr: "",
      packageId: "pkg-1",
      packageVersion: "1.0",
      assemblyId: "asm-1",
      consentForm: {
        id: "imc-approved-amputation",
        tenantId: "tenant-1",
        code: "IMC MR 1135",
        titleEn: "Amputation",
        titleAr: "",
        formType: "PROCEDURE_CONSENT",
        riskLevel: "HIGH",
        status: "PUBLISHED",
        version: "1.0",
        effectiveDate: "2026-01-01T00:00:00.000Z",
        expiryDate: null,
        governanceSnapshot: null,
        pdfTemplateUrl: "/approved-consent-forms/amputation.pdf",
        requiresWitness: true,
        requiresInterpreter: true,
        createdByUserId: "",
        publishedByUserId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        sections: [],
      },
      educationMaterials: [
        {
          id: "ed-1",
          tenantId: "tenant-1",
          code: "ed-1",
          titleEn: "Amputation education",
          titleAr: "",
          assetType: "PDF",
          assetUrl: "/ed.pdf",
          durationMinutes: null,
          status: "PUBLISHED",
          version: "1.0",
          effectiveDate: "2026-01-01T00:00:00.000Z",
          expiryDate: null,
          governanceSnapshot: null,
          createdByUserId: "",
          publishedByUserId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      riskDisclosures: [],
      illustrations: [],
      decisionRules: [],
      suggestions: [],
      blockers: [],
      requiredParticipants: [],
      packageSnapshot: null,
      assembledAt: "2026-01-01T00:00:00.000Z",
    } as unknown as import("@/components/informed-consents/production-workspace/types").ProductionAssembly,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
    previewReviewed: true,
    filledDraftStatus: "current",
    filledDraftReviewed: true,
    recipientMobile: "+966500000000",
    recipientEmail: "patient@example.com",
    draftApproved: true,
  });

  assert.equal(findItem(readiness, "filled_draft_current")?.status, "COMPLETE");
  assert.equal(findItem(readiness, "preview_reviewed")?.status, "COMPLETE");
  assert.equal(readiness.sendReady, true);
  assert.equal(readiness.progressPercentage, 100);
});

test("MR1135 stale filled draft blocks readiness", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
    filledDraftStatus: "stale",
    filledDraftReviewed: true,
  });

  assert.equal(findItem(readiness, "filled_draft_current")?.status, "BLOCKED");
  assert.equal(findItem(readiness, "preview_reviewed")?.status, "BLOCKED");
  assert.equal(readiness.sendReady, false);
});

test("MR1135 missing filled draft is required", () => {
  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: mr1135FieldMapping,
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      significant_risks_options_en: "Infection, bleeding.",
      significant_risks_options_ar: "عدوى، نزيف.",
      risks_without_procedure_en: "Sepsis.",
      risks_without_procedure_ar: "تسمم الدم.",
      physician_name: "Dr. Ahmed",
      physician_designation: "Orthopedic Surgery",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
    },
    physicianSignatureDataUrl: "data:image/png;base64,AAAA",
  });

  assert.equal(findItem(readiness, "filled_draft_current")?.status, "REQUIRED");
  assert.equal(readiness.sendReady, false);
});

test("adenotonsillectomy MR1168 behavior is unchanged without physician fields", () => {
  const adenotonsillectomyMapping = {
    hasMapping: true,
    verificationStatus: "VERIFIED",
    formId: "imc-approved-adenotonsillectomy",
    requiredDoctorFields: [
      { key: "condition_and_treatment", labelEn: "Condition and treatment", type: "MULTILINE_TEXT" },
      { key: "procedure_site_side", labelEn: "Procedure, site and/or side", type: "MULTILINE_TEXT" },
      { key: "treating_physician_signature", labelEn: "Treating physician signature", type: "SIGNATURE" },
    ],
    requiredAnesthesiaFields: [],
    requiredPatientFields: [{ key: "patient_signature", labelEn: "Patient signature", type: "SIGNATURE" }],
  };

  const readiness = computePhysicianJourneyReadiness({
    ...baseArgs,
    fieldMappingReadiness: adenotonsillectomyMapping,
  });

  const physicianFieldsItem = findItem(readiness, "physician_fields_complete");
  assert.equal(physicianFieldsItem?.status, "BLOCKED");
  const signatureItem = findItem(readiness, "physician_signature_complete");
  assert.equal(signatureItem?.status, "REQUIRED");
  // Non-AcroForm forms use the single preview_reviewed gate, not filled_draft_current.
  assert.equal(findItem(readiness, "filled_draft_current"), undefined);
});
