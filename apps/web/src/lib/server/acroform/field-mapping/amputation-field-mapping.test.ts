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

test("buildAmputationFieldAddressedValues supports alternate designation keys and never uses email", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      designation: "Consultant Surgeon / استشاري جراحة",
    },
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "physician@example.com",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  const designation = (values.doctor_delegate_designation as { kind: "text"; value: string }).value;
  assert.equal(designation, "Consultant Surgeon / استشاري جراحة");
  assert.ok(!designation.includes("@"), "Designation must never be an email address");
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

test("buildAmputationFieldAddressedValues renders separate English and Arabic designations when available", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {},
    physicianSignatureDataUrl: undefined,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    physicianDesignationEn: "Consultant Orthopedic Surgeon",
    physicianDesignationAr: "استشاري جراحة العظام",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(values.doctor_delegate_designation?.kind, "bilingual_text");
  assert.equal(
    (values.doctor_delegate_designation as { kind: "bilingual_text"; en: string; ar: string }).en,
    "Consultant Orthopedic Surgeon",
  );
  assert.equal(
    (values.doctor_delegate_designation as { kind: "bilingual_text"; en: string; ar: string }).ar,
    "استشاري جراحة العظام",
  );
});

test("buildAmputationFieldAddressedValues wraps a mixed bilingual designation safely when separate values are unavailable", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      physician_designation: "Consultant Surgeon / استشاري جراحة",
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

  assert.equal(values.doctor_delegate_designation?.kind, "text");
  assert.ok(
    (values.doctor_delegate_designation as { kind: "text"; value: string }).value.includes("Consultant Surgeon"),
  );
  assert.ok(
    /[\u0600-\u06FF]/.test((values.doctor_delegate_designation as { kind: "text"; value: string }).value),
  );
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

test("buildAmputationFieldAddressedValues maps canonical clinical ontology keys to manifest fields", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "procedure.condition.en": "Severe infection and poor circulation in the left lower leg.",
      "procedure.condition.ar": "عدوى شديدة وضعف الدورة الدموية في الساق اليسرى السفلى.",
      "procedure.site_side.en": "Left below-knee amputation.",
      "procedure.site_side.ar": "بتر تحت الركبة للساق اليسرى.",
      "procedure.significant_risks.en": "Bleeding, infection, phantom limb pain.",
      "procedure.significant_risks.ar": "نزيف، عدوى، ألم العضو الوهمي.",
      "procedure.no_treatment_risks.en": "Worsening infection, sepsis, tissue death.",
      "procedure.no_treatment_risks.ar": "تفاقم العدوى، تسمم الدم، موت الأنسجة.",
      "anesthesia.type.en": "General anaesthesia.",
      "anesthesia.type.ar": "تخدير عام.",
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
    (values.condition_description_en as { kind: "text"; value: string }).value,
    "Severe infection and poor circulation in the left lower leg.",
  );
  assert.equal(
    (values.proposed_procedure_en as { kind: "text"; value: string }).value,
    "Left below-knee amputation.",
  );
  assert.equal(
    (values.significant_risks_options_en as { kind: "text"; value: string }).value,
    "Bleeding, infection, phantom limb pain.",
  );
  assert.equal(
    (values.risks_without_procedure_en as { kind: "text"; value: string }).value,
    "Worsening infection, sepsis, tissue death.",
  );
  assert.equal(
    (values.anaesthetic_discussed_en as { kind: "text"; value: string }).value,
    "General anaesthesia.",
  );
  assert.ok(/[\u0600-\u06FF]/.test((values.condition_description_ar as { kind: "text"; value: string }).value));
});

test("buildAmputationFieldAddressedValues gives legacy keys precedence over canonical keys", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      condition_description_en: "Legacy condition.",
      "procedure.condition.en": "Canonical condition.",
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
    (values.condition_description_en as { kind: "text"; value: string }).value,
    "Legacy condition.",
  );
});

test("buildAmputationFieldAddressedValues maps canonical physician identity keys", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "physician.name.en": "Dr. Wathiq Test",
      "physician.designation.en": "Consultant Surgeon",
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

  assert.equal((values.doctor_delegate_name as { kind: "text"; value: string }).value, "Dr. Wathiq Test");
  assert.equal(
    (values.doctor_delegate_designation as { kind: "text"; value: string }).value,
    "Consultant Surgeon",
  );
});

test("buildAmputationFieldAddressedValues uses canonical physician signature when no explicit data URL is provided", () => {
  const signatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "physician.signature": signatureDataUrl,
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

  assert.equal(values.doctor_delegate_signature_en?.kind, "signature");
  assert.equal(values.doctor_delegate_signature_ar?.kind, "signature");
  assert.equal(
    (values.doctor_delegate_signature_en as { kind: "signature"; imageDataUrl: string }).imageDataUrl,
    signatureDataUrl,
  );
});

test("buildAmputationFieldAddressedValues explicit physician signature data URL takes precedence over canonical key", () => {
  const explicitSignature = "data:image/png;base64,EXPLICIT";
  const canonicalSignature = "data:image/png;base64,CANONICAL";
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "physician.signature": canonicalSignature,
    },
    physicianSignatureDataUrl: explicitSignature,
    patientSignatureDataUrl: undefined,
    physicianName: "Dr. Ahmed",
    physicianSpecialty: "Orthopedic Surgery",
    patientName: "Najib Al-Rashid",
    mrn: "IMC-2026-02000",
    dob: "1985-03-15",
    signedAt: null,
  });

  assert.equal(
    (values.doctor_delegate_signature_en as { kind: "signature"; imageDataUrl: string }).imageDataUrl,
    explicitSignature,
  );
});

test("buildAmputationFieldAddressedValues maps canonical physician date and time", () => {
  const values = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "physician.date": "2026-07-15",
      "physician.time": "14:30",
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

  assert.ok(values.doctor_delegate_date);
  assert.ok(values.doctor_delegate_time);
  assert.ok(
    (values.doctor_delegate_date as { kind: "text"; value: string }).value.includes("2026"),
    "Canonical physician date must be rendered",
  );
  assert.equal(
    (values.doctor_delegate_time as { kind: "text"; value: string }).value,
    "14:30",
    "Canonical physician time must be rendered as provided",
  );
});


test("buildAmputationFieldAddressedValues maps continuation-risk canonical keys and defers witness fields until named", () => {
  const valuesWithWitness = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "procedure.significant_risks_cont.en": "Continuation risk English.",
      "procedure.significant_risks_cont.ar": "مخاطر الاستمرار بالعربية.",
      witness1_name: "Sara Ali",
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

  assert.equal(
    (valuesWithWitness.significant_risks_options_cont_en as { kind: "text"; value: string }).value,
    "Continuation risk English.",
  );
  assert.ok(
    /[\u0600-\u06FF]/.test(
      (valuesWithWitness.significant_risks_options_cont_ar as { kind: "text"; value: string }).value,
    ),
  );
  assert.ok(valuesWithWitness.witness1_date_en, "Witness date should be set when witness name is present");

  const valuesWithoutWitness = buildAmputationFieldAddressedValues({
    doctorCompletionValues: {
      "procedure.significant_risks_cont.en": "Continuation risk English.",
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

  assert.ok(valuesWithoutWitness.significant_risks_options_cont_en);
  assert.ok(!valuesWithoutWitness.witness1_date_en, "Witness date should not be set when witness name is absent");
  assert.ok(!valuesWithoutWitness.witness1_time_en, "Witness time should not be set when witness name is absent");
  assert.ok(!valuesWithoutWitness.witness1_signature_en, "Witness signature should not be set when witness name is absent");
});
