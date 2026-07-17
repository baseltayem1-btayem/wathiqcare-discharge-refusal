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


test("buildAmputationFieldAddressedValues preserves Arabic letters in mixed values", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      condition_description_ar: "اختبار CA2011E1 رقم 006",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  const rendered = (values.condition_description_ar as { kind: "text"; value: string }).value;
  assert.ok(/[\u0600-\u06FF]/.test(rendered), "Arabic letters must be preserved");
  assert.ok(rendered.includes("CA2011E1"), "Latin reference must be preserved");
  assert.ok(rendered.includes("006"), "Digits must be preserved");
});

test("buildAmputationFieldAddressedValues maps patient DOB from canonical display and normalized formats", () => {
  for (const dob of ["1985-03-15", "15/03/1985", "1985-03-15T00:00:00.000Z"]) {
    const values = buildAmputationFieldAddressedValues({
      doctorCompletionValues: {},
      physicianSignatureDataUrl: undefined,
      patientSignatureDataUrl: undefined,
      physicianName: "Dr. Ahmed",
      physicianSpecialty: "Orthopedic Surgery",
      patientName: "Najib Al-Rashid",
      mrn: "IMC-2026-02000",
      dob,
      signedAt: null,
    });

    const rendered = (values.date_of_birth as { kind: "text"; value: string }).value;
    assert.ok(rendered.includes("1985"), `DOB ${dob} should include year`);
    assert.ok(rendered.includes("03") || rendered.includes("3"), `DOB ${dob} should include month`);
    assert.ok(rendered.includes("15"), `DOB ${dob} should include day`);
  }
});

test("buildAmputationFieldAddressedValues leaves DOB blank when genuinely unavailable", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: undefined,
    signedAt: null,
  });

  assert.equal(values.date_of_birth, undefined, "Missing DOB must not be fabricated");
});

test("buildAmputationFieldAddressedValues prefers doctor-completed physician name and designation", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      physician_name: "Dr. Khalid Al-Farsi",
      physician_designation: "Vascular Surgery Consultant",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "auth.email@example.com",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(
    (values.doctor_delegate_name as { kind: "text"; value: string }).value,
    "Dr. Khalid Al-Farsi",
  );
  assert.equal(
    (values.doctor_delegate_designation as { kind: "text"; value: string }).value,
    "Vascular Surgery Consultant",
  );
});

test("buildAmputationFieldAddressedValues falls back to context physician name and designation when doctor fields are blank", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      physician_name: "   ",
      physician_designation: "",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(
    (values.doctor_delegate_name as { kind: "text"; value: string }).value,
    "Dr. Ahmed",
  );
  assert.equal(
    (values.doctor_delegate_designation as { kind: "text"; value: string }).value,
    "Orthopedic Surgery",
  );
});

test("buildAmputationFieldAddressedValues passes physician signature to both language targets", () => {
  const signatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: signatureDataUrl,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(values.doctor_delegate_signature_en?.kind, "signature");
  assert.equal(values.doctor_delegate_signature_ar?.kind, "signature");
  assert.equal(
    (values.doctor_delegate_signature_en as { kind: "signature"; imageDataUrl: string }).imageDataUrl,
    signatureDataUrl,
  );
  assert.equal(
    (values.doctor_delegate_signature_ar as { kind: "signature"; imageDataUrl: string }).imageDataUrl,
    signatureDataUrl,
  );
  assert.equal(values.patient_signature_en, undefined, "Patient signature must remain untouched");
  assert.equal(values.patient_signature_ar, undefined, "Patient signature must remain untouched");
});

test("buildAmputationFieldAddressedValues defers physician date/time until finalization", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(values.doctor_delegate_date, undefined, "Preview must not fabricate physician date");
  assert.equal(values.doctor_delegate_time, undefined, "Preview must not fabricate physician time");
});
