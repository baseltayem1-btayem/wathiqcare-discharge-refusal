import assert from "node:assert/strict";
import test from "node:test";
import { buildAmputationFieldAddressedValues } from "@/lib/server/acroform/field-mapping/amputation-field-mapping";

test("buildAmputationFieldAddressedValues maps demographics and clinical fields", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      condition_description_en: "Diabetic foot infection.",
      condition_description_ar: "عدوى القدم السكرية.",
      proposed_procedure_en: "Below-knee amputation, left leg.",
      proposed_procedure_ar: "بتر تحت الركبة، الساق اليسرى.",
      interpreter_required: true,
      interpreter_present: false,
      education_amputation_sheet_provided: true,
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: "2026-07-15T09:30:00.000Z",
  });

  assert.equal(values.patient_name?.kind, "text");
  assert.equal((values.patient_name as { kind: "text"; value: string }).value, "Najib Al-Rashid");
  assert.equal((values.mrn as { kind: "text"; value: string }).value, "IMC-2026-02000");
  assert.ok(values.date_of_birth);

  assert.equal(values.interpreter_required_yes?.kind, "checkbox");
  assert.equal((values.interpreter_required_yes as { kind: "checkbox"; checked: boolean }).checked, true);
  assert.equal((values.interpreter_required_no as { kind: "checkbox"; checked: boolean }).checked, false);

  assert.equal(
    (values.condition_description_en as { kind: "text"; value: string }).value,
    "Diabetic foot infection.",
  );
  assert.equal(
    (values.proposed_procedure_en as { kind: "text"; value: string }).value,
    "Below-knee amputation, left leg.",
  );
  assert.equal((values.info_sheet_amputation as { kind: "checkbox"; checked: boolean }).checked, true);

  assert.equal((values.doctor_delegate_name as { kind: "text"; value: string }).value, "Dr. Ahmed");
  assert.equal((values.doctor_delegate_designation as { kind: "text"; value: string }).value, "Orthopedic Surgery");
});

test("buildAmputationFieldAddressedValues maps signatures to both language widgets", () => {
  const signatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAA";
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: signatureDataUrl,
    patientSignatureDataUrl: signatureDataUrl,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: "2026-07-15T09:30:00.000Z",
  });

  assert.equal(values.patient_signature_en?.kind, "signature");
  assert.equal(values.patient_signature_ar?.kind, "signature");
  assert.equal(values.doctor_delegate_signature_en?.kind, "signature");
  assert.equal(values.doctor_delegate_signature_ar?.kind, "signature");

  assert.equal(
    (values.patient_signature_en as { kind: "signature"; imageDataUrl: string }).imageDataUrl,
    signatureDataUrl,
  );
});

test("buildAmputationFieldAddressedValues handles substitute and witness fields", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      substitute_name: "Khaled Al-Rashid",
      substitute_relationship: "Brother",
      substitute_contact: "0500000000",
      witness1_name: "Sara Ali",
      witness2_name: "Omar Fayed",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: "2026-07-15T09:30:00.000Z",
  });

  assert.equal((values.substitute_name as { kind: "text"; value: string }).value, "Khaled Al-Rashid");
  assert.equal(
    (values.substitute_relationship as { kind: "text"; value: string }).value,
    "Brother",
  );
  assert.equal((values.witness1_name_en as { kind: "text"; value: string }).value, "Sara Ali");
  assert.equal((values.witness2_name_ar as { kind: "text"; value: string }).value, "Omar Fayed");
  assert.ok(values.consent_date);
  assert.ok(values.consent_time);
});
