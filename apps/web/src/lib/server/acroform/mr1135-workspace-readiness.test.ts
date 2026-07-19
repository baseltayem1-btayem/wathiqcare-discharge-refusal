import assert from "node:assert/strict";
import test from "node:test";
import { normalizePatientDob } from "@/components/informed-consents/production-workspace/utils/normalizePatientDob";
import { evaluateRequiredWhen } from "@/components/informed-consents/production-workspace/utils/evaluateRequiredWhen";
import {
  buildAcroFormFilledDraftPreviewInput,
  isAmputationForm,
  withAmputationDoctorCompletionValues,
} from "@/components/informed-consents/production-workspace/utils/buildAcroFormFilledDraftPreviewInput";
import { computePhysicianJourneyReadiness } from "@/lib/server/physician-journey-readiness";
import { buildAmputationFieldAddressedValues } from "@/lib/server/acroform/field-mapping/amputation-field-mapping";
import { parseAcroFormFilledDraftRequest } from "@/lib/server/draft-pdf-request-parser";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
import type { PhysicianContext } from "@/components/informed-consents/production-workspace/types";

const PHYSICIAN: PhysicianContext = {
  userId: "user-mr1135",
  email: "doctor@example.com",
  name: "Dr. Wathiq Test",
  tenantId: "tenant-mr1135",
  specialty: "Consultant Surgeon",
  specialtyEn: "Consultant Surgeon",
  specialtyAr: "استشاري جراحة",
};

const PATIENT = {
  id: "p-mr1135",
  mrn: "TEST-MR1135-001",
  name: "WATHIQCARE TEST PATIENT",
  dateOfBirth: "1990-01-01",
  source: "case_fallback" as const,
  languagePreference: "bilingual" as const,
  capacityStatus: "competent" as const,
};

const ENCOUNTER = {
  id: "enc-mr1135",
  encounterId: "ENC-MR1135-001",
};

const BASE_MAPPING_READINESS = {
  formId: "imc-approved-amputation",
  hasMapping: true,
  verificationStatus: "VERIFIED",
  requiredDoctorFields: [] as Array<{ key: string; labelEn: string; section?: string; type: string }>,
  requiredAnesthesiaFields: [
    { key: "anesthesia_applies", labelEn: "Anesthesia applies", section: "F", type: "CHECKBOX" },
    {
      key: "anaesthetic_discussed_en",
      labelEn: "Type of anaesthetic discussed",
      section: "F",
      type: "MULTILINE_TEXT",
      requiredWhen: "anesthesia_applies === true",
    },
    {
      key: "anaesthetic_discussed_ar",
      labelEn: "Type of anaesthetic discussed (Arabic)",
      section: "F",
      type: "MULTILINE_TEXT",
      requiredWhen: "anesthesia_applies === true",
    },
  ],
  requiredPatientFields: [{ key: "patient_signature", labelEn: "Patient signature", type: "SIGNATURE" }],
  acroForm: { manifestState: { status: "READY" as const } },
};

function textValue(value: unknown): string | undefined {
  if (value && typeof value === "object" && "kind" in value && value.kind === "text") {
    return (value as { value: string }).value;
  }
  return undefined;
}

test("normalizePatientDob parses ISO, GB, and timestamp formats; rejects invalid/missing values", () => {
  assert.equal(normalizePatientDob("1990-01-01"), "1990-01-01");
  assert.equal(normalizePatientDob("01/01/1990"), "1990-01-01");
  assert.equal(normalizePatientDob("1990-01-01T00:00:00.000Z"), "1990-01-01");
  assert.equal(normalizePatientDob(new Date("1990-01-01")), "1990-01-01");
  assert.equal(normalizePatientDob(""), undefined);
  assert.equal(normalizePatientDob(null), undefined);
  assert.equal(normalizePatientDob(undefined), undefined);
  assert.equal(normalizePatientDob("not a date"), undefined);
});

test("normalizePatientDob preserves a valid date through JSON request serialization", () => {
  const dob = normalizePatientDob("1990-01-01");
  const payload = JSON.stringify({ patientDisplay: { name: "Test", mrn: "MRN", dob } });
  const parsed = JSON.parse(payload) as { patientDisplay: { dob?: string } };
  assert.equal(parsed.patientDisplay.dob, "1990-01-01");
});

test("parseAcroFormFilledDraftRequest rejects missing patientDisplay.dob", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: "hash",
    patientDisplay: { name: "Test Patient", mrn: "MRN" },
    physicianContext: { name: "Dr. Test" },
  });
  assert.ok(missing.includes("patientDisplay.dob"));
});

test("parseAcroFormFilledDraftRequest accepts normalized patientDisplay.dob", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: "hash",
    patientDisplay: { name: "Test Patient", mrn: "MRN", dob: "1990-01-01" },
    physicianContext: { name: "Dr. Test" },
  });
  assert.ok(!missing.includes("patientDisplay.dob"));
});

test("workspace DOB from selected patient reaches patientDisplay.dob", () => {
  const input = buildAcroFormFilledDraftPreviewInput({
    formId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: "hash",
    patient: PATIENT,
    encounter: ENCOUNTER,
    physician: PHYSICIAN,
    doctorCompletionValues: {},
  });
  assert.equal(input.patientDisplay.name, PATIENT.name);
  assert.equal(input.patientDisplay.mrn, PATIENT.mrn);
  assert.equal(input.patientDisplay.dob, "1990-01-01");
});

test("workspace DOB is not lost when the encounter payload provides a fallback date of birth", () => {
  const patientWithoutDob = { ...PATIENT, dateOfBirth: null as unknown as string };
  const encounterWithDob = { ...ENCOUNTER, patientDateOfBirth: "15/03/1985" };
  const mergedDob = normalizePatientDob(patientWithoutDob.dateOfBirth) || normalizePatientDob(encounterWithDob.patientDateOfBirth);
  assert.equal(mergedDob, "1985-03-15");

  const input = buildAcroFormFilledDraftPreviewInput({
    formId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: "hash",
    patient: { ...patientWithoutDob, dateOfBirth: mergedDob },
    encounter: encounterWithDob,
    physician: PHYSICIAN,
    doctorCompletionValues: {},
  });
  assert.equal(input.patientDisplay.dob, "1985-03-15");
});

test("buildAcroFormFilledDraftPreviewInput normalizes a GB-format DOB and binds amputation info sheet", () => {
  const input = buildAcroFormFilledDraftPreviewInput({
    formId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: "hash",
    patient: { ...PATIENT, dateOfBirth: "01/01/1990" },
    encounter: ENCOUNTER,
    physician: PHYSICIAN,
    doctorCompletionValues: { condition_description_en: "Condition" },
  });
  assert.equal(input.patientDisplay.dob, "1990-01-01");
  assert.equal(input.doctorCompletionValues.education_amputation_sheet_provided, "true");
});

test("amputation info-sheet default is not applied to non-amputation forms", () => {
  const input = buildAcroFormFilledDraftPreviewInput({
    formId: "some-other-form",
    approvedPdfUrl: "/x.pdf",
    manifestHash: "hash",
    patient: PATIENT,
    encounter: ENCOUNTER,
    physician: PHYSICIAN,
    doctorCompletionValues: {},
  });
  assert.equal(input.doctorCompletionValues.education_amputation_sheet_provided, undefined);
});

test("isAmputationForm recognizes the canonical MR1135 form id", () => {
  assert.equal(isAmputationForm("imc-approved-amputation"), true);
  assert.equal(isAmputationForm("imc-approved-adenotonsillectomy"), false);
});

test("withAmputationDoctorCompletionValues preserves existing values while injecting info sheet", () => {
  const values = withAmputationDoctorCompletionValues("imc-approved-amputation", {
    condition_description_en: "Condition",
  });
  assert.equal(values.condition_description_en, "Condition");
  assert.equal(values.education_amputation_sheet_provided, "true");
});

test("buildAmputationFieldAddressedValues renders normalized DOB on date_of_birth field", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: "1990-01-01",
    signedAt: null,
  });
  assert.equal(values.date_of_birth?.kind, "text");
  assert.equal(textValue(values.date_of_birth), "01/01/1990");
});

test("date_of_birth manifest field has widgets on pages 1-5", () => {
  const field = amputationManifest.fields.find((f) => f.name === "date_of_birth");
  assert.ok(field, "date_of_birth field must exist in manifest");
  const pages = new Set(field!.widgets.map((w) => w.page));
  assert.deepEqual([...pages].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test("evaluateRequiredWhen filters anesthesia fields by anesthesia_applies value", () => {
  assert.equal(
    evaluateRequiredWhen("anesthesia_applies === true", { anesthesia_applies: "true" }),
    true,
  );
  assert.equal(
    evaluateRequiredWhen("anesthesia_applies === true", { anesthesia_applies: "false" }),
    false,
  );
  assert.equal(evaluateRequiredWhen(undefined, {}), true);
  assert.equal(
    evaluateRequiredWhen("anesthesia_applies === false", { anesthesia_applies: "false" }),
    true,
  );
});

test("computePhysicianJourneyReadiness: amputation anesthesia is never marked NOT_APPLICABLE", () => {
  const readiness = computePhysicianJourneyReadiness({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: "",
    previewReviewed: false,
    recipientMobile: "",
    recipientEmail: "",
    draftApproved: false,
    acknowledgedBlockers: new Set(),
    physicianContext: PHYSICIAN,
    fieldMappingReadiness: BASE_MAPPING_READINESS,
  });
  const anesthesiaItem = readiness.items.find((i) => i.key === "anesthesia_workflow_reviewed");
  assert.ok(anesthesiaItem);
  assert.notEqual(anesthesiaItem!.status, "NOT_APPLICABLE");
  assert.equal(anesthesiaItem!.status, "REQUIRED");
});

test("computePhysicianJourneyReadiness: amputation anesthesia is blocked when applies but type values are missing", () => {
  const readiness = computePhysicianJourneyReadiness({
    doctorCompletionValues: { anesthesia_applies: "true" },
    physicianSignatureDataUrl: "",
    previewReviewed: false,
    recipientMobile: "",
    recipientEmail: "",
    draftApproved: false,
    acknowledgedBlockers: new Set(),
    physicianContext: PHYSICIAN,
    fieldMappingReadiness: BASE_MAPPING_READINESS,
  });
  const anesthesiaItem = readiness.items.find((i) => i.key === "anesthesia_workflow_reviewed");
  assert.ok(anesthesiaItem);
  assert.equal(anesthesiaItem!.status, "BLOCKED");
});

test("computePhysicianJourneyReadiness: amputation anesthesia is complete only after decision and type values", () => {
  const readiness = computePhysicianJourneyReadiness({
    doctorCompletionValues: {
      anesthesia_applies: "true",
      anaesthetic_discussed_en: "General anaesthesia",
      anaesthetic_discussed_ar: "تخدير عام",
    },
    physicianSignatureDataUrl: "",
    previewReviewed: false,
    recipientMobile: "",
    recipientEmail: "",
    draftApproved: false,
    acknowledgedBlockers: new Set(),
    physicianContext: PHYSICIAN,
    fieldMappingReadiness: BASE_MAPPING_READINESS,
  });
  const anesthesiaItem = readiness.items.find((i) => i.key === "anesthesia_workflow_reviewed");
  assert.ok(anesthesiaItem);
  assert.equal(anesthesiaItem!.status, "COMPLETE");
});

test("buildAmputationFieldAddressedValues maps canonical anesthesia.type.en/ar to Section F fields only when provided", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "anesthesia.type.en": "General anaesthesia with perioperative analgesia.",
      "anesthesia.type.ar": "تخدير عام مع مسكنات أثناء العملية.",
      anesthesia_applies: "true",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: PATIENT.dateOfBirth,
    signedAt: null,
  });
  assert.equal(values.anaesthetic_discussed_en?.kind, "text");
  assert.equal(
    textValue(values.anaesthetic_discussed_en),
    "General anaesthesia with perioperative analgesia.",
  );
  assert.equal(values.anaesthetic_discussed_ar?.kind, "text");
  assert.equal(textValue(values.anaesthetic_discussed_ar), "تخدير عام مع مسكنات أثناء العملية.");
});

test("buildAmputationFieldAddressedValues selects Amputation information sheet when auto-bound", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      education_amputation_sheet_provided: "true",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: PATIENT.dateOfBirth,
    signedAt: null,
  });
  assert.equal(values.info_sheet_amputation?.kind, "checkbox");
  assert.equal((values.info_sheet_amputation as { kind: "checkbox"; checked: boolean }).checked, true);
});

test("buildAmputationFieldAddressedValues derives physician date and time from physicianSignedAt canonical keys", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "physician.date": "2026-07-15T09:30:00.000Z",
      "physician.time": "2026-07-15T09:30:00.000Z",
    },
    physicianSignatureDataUrl: "data:image/png;base64,iVBORw0KGgo=",
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: PATIENT.dateOfBirth,
    signedAt: null,
  });
  assert.equal(values.doctor_delegate_date?.kind, "text");
  assert.equal(values.doctor_delegate_time?.kind, "text");
  assert.ok(textValue(values.doctor_delegate_date)?.includes("15/07/2026"));
  assert.ok(textValue(values.doctor_delegate_time)?.includes(":30"));
});

test("buildAmputationFieldAddressedValues leaves continuation empty unless physician enters continuation text", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "procedure.significant_risks.en": "Bleeding, infection, phantom limb pain.",
      "procedure.significant_risks.ar": "نزيف، عدوى، ألم الطرف الوهمي.",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: PATIENT.dateOfBirth,
    signedAt: null,
  });
  assert.equal(values.significant_risks_options_en?.kind, "text");
  assert.equal(values.significant_risks_options_cont_en, undefined);
  assert.equal(values.significant_risks_options_cont_ar, undefined);

  const valuesWithContinuation = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "procedure.significant_risks_cont.en": "Additional risks include delayed wound healing.",
      "procedure.significant_risks_cont.ar": "تشمل المخاطر الإضافية تأخر شفاء الجرح.",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: PHYSICIAN.name,
    physicianSpecialty: PHYSICIAN.specialty,
    patientName: PATIENT.name,
    mrn: PATIENT.mrn,
    dob: PATIENT.dateOfBirth,
    signedAt: null,
  });
  assert.equal(valuesWithContinuation.significant_risks_options_cont_en?.kind, "text");
  assert.equal(
    textValue(valuesWithContinuation.significant_risks_options_cont_en),
    "Additional risks include delayed wound healing.",
  );
  assert.equal(valuesWithContinuation.significant_risks_options_cont_ar?.kind, "text");
});
