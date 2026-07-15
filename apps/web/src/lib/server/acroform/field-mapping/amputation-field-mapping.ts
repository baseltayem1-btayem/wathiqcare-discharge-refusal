import type { FieldAddressedRenderValue } from "@/lib/server/acroform/field-addressed-pdf-renderer";

export type BuildAmputationFieldAddressedValuesInput = {
  doctorCompletionValues: Record<string, unknown>;
  physicianSignatureDataUrl: string | undefined;
  patientSignatureDataUrl: string | undefined;
  physicianName: string | null | undefined;
  physicianSpecialty: string | null | undefined;
  patientName: string | null | undefined;
  mrn: string | null | undefined;
  dob: string | null | undefined;
  signedAt: Date | string | null | undefined;
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return compactWhitespace(value) || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes" || normalized === "1") return true;
    if (normalized === "false" || normalized === "no" || normalized === "0") return false;
  }
  if (typeof value === "number") return value !== 0;
  return null;
}

function extractSignatureDataUrl(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("data:image/")) {
    return value;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate =
      asString(record.signatureImageDataUrl) ||
      asString(record.signatureDataUrl) ||
      asString(record.imageDataUrl);
    if (candidate?.startsWith("data:image/")) {
      return candidate;
    }
  }
  return null;
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDate(value: Date | string | null | undefined): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(value: Date | string | null | undefined): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function text(value: string | null | undefined): FieldAddressedRenderValue | null {
  const cleaned = asString(value);
  if (!cleaned) return null;
  return { kind: "text", value: cleaned };
}

function checkbox(checked: boolean | null | undefined): FieldAddressedRenderValue | null {
  if (checked === null || checked === undefined) return null;
  return { kind: "checkbox", checked };
}

function signature(imageDataUrl: string | null | undefined): FieldAddressedRenderValue | null {
  if (!imageDataUrl) return null;
  return { kind: "signature", imageDataUrl };
}

function setValue(
  values: Record<string, FieldAddressedRenderValue>,
  key: string,
  value: FieldAddressedRenderValue | null,
): void {
  if (value) {
    values[key] = value;
  }
}

/**
 * Builds the field-addressed value map for IMC MR 1135 Amputation from the
 * doctor completion payload and captured signatures.
 */
export function buildAmputationFieldAddressedValues(
  input: BuildAmputationFieldAddressedValuesInput,
): Record<string, FieldAddressedRenderValue> {
  const {
    doctorCompletionValues,
    physicianSignatureDataUrl,
    patientSignatureDataUrl,
    physicianName,
    physicianSpecialty,
    patientName,
    mrn,
    dob,
    signedAt,
  } = input;

  const values: Record<string, FieldAddressedRenderValue> = {};

  // Header demographics
  setValue(values, "patient_name", text(patientName));
  setValue(values, "mrn", text(mrn));
  setValue(values, "date_of_birth", text(formatDate(dob)));

  // Interpreter
  const interpreterRequired = asBoolean(doctorCompletionValues.interpreter_required);
  const interpreterPresent = asBoolean(doctorCompletionValues.interpreter_present);
  if (interpreterRequired !== null) {
    setValue(values, "interpreter_required_yes", checkbox(interpreterRequired === true));
    setValue(values, "interpreter_required_no", checkbox(interpreterRequired === false));
  }
  if (interpreterPresent !== null) {
    setValue(values, "interpreter_present_yes", checkbox(interpreterPresent === true));
    setValue(values, "interpreter_present_no", checkbox(interpreterPresent === false));
  }

  // Clinical disclosures
  const clinicalTextKeys = [
    "condition_description_en",
    "condition_description_ar",
    "proposed_procedure_en",
    "proposed_procedure_ar",
    "significant_risks_options_en",
    "significant_risks_options_ar",
    "significant_risks_options_cont_en",
    "significant_risks_options_cont_ar",
    "risks_without_procedure_en",
    "risks_without_procedure_ar",
    "anaesthetic_discussed_en",
    "anaesthetic_discussed_ar",
  ] as const;

  for (const key of clinicalTextKeys) {
    setValue(values, key, text(asString(doctorCompletionValues[key])));
  }

  // Education information sheets
  setValue(
    values,
    "info_sheet_anaesthetic",
    checkbox(asBoolean(doctorCompletionValues.education_anaesthetic_sheet_provided)),
  );
  setValue(
    values,
    "info_sheet_epidural_spinal",
    checkbox(asBoolean(doctorCompletionValues.education_epidural_spinal_sheet_provided)),
  );
  setValue(
    values,
    "info_sheet_amputation",
    checkbox(asBoolean(doctorCompletionValues.education_amputation_sheet_provided)),
  );

  // Patient consent block
  setValue(values, "consent_patient_name", text(patientName));
  setValue(values, "patient_signature_en", signature(patientSignatureDataUrl));
  setValue(values, "patient_signature_ar", signature(patientSignatureDataUrl));
  setValue(values, "consent_date", text(formatDate(signedAt)));
  setValue(values, "consent_time", text(formatTime(signedAt)));

  // Substitute decision-maker
  setValue(values, "substitute_name", text(asString(doctorCompletionValues.substitute_name)));
  setValue(
    values,
    "substitute_signature_en",
    signature(extractSignatureDataUrl(doctorCompletionValues.substitute_signature) ?? undefined),
  );
  setValue(
    values,
    "substitute_signature_ar",
    signature(extractSignatureDataUrl(doctorCompletionValues.substitute_signature) ?? undefined),
  );
  setValue(
    values,
    "substitute_relationship",
    text(asString(doctorCompletionValues.substitute_relationship)),
  );
  const substituteSignedAt =
    parseDate(asString(doctorCompletionValues.substitute_date) ?? undefined) ?? parseDate(signedAt);
  setValue(values, "substitute_date", text(formatDate(substituteSignedAt)));
  setValue(values, "substitute_time", text(formatTime(substituteSignedAt)));
  setValue(values, "substitute_contact", text(asString(doctorCompletionValues.substitute_contact)));

  // Physician block
  setValue(values, "doctor_delegate_name", text(physicianName));
  setValue(values, "doctor_delegate_designation", text(physicianSpecialty));
  setValue(values, "doctor_delegate_signature_en", signature(physicianSignatureDataUrl));
  setValue(values, "doctor_delegate_signature_ar", signature(physicianSignatureDataUrl));
  setValue(values, "doctor_delegate_date", text(formatDate(signedAt)));
  setValue(values, "doctor_delegate_time", text(formatTime(signedAt)));

  // Witnesses
  for (const n of [1, 2] as const) {
    const prefix = `witness${n}`;
    const witnessName = asString(doctorCompletionValues[`${prefix}_name`]);
    const witnessSignature = extractSignatureDataUrl(doctorCompletionValues[`${prefix}_signature`]);
    const witnessDateRaw = asString(doctorCompletionValues[`${prefix}_date`]);
    const witnessTimeRaw = asString(doctorCompletionValues[`${prefix}_time`]);
    const witnessSignedAt = parseDate(witnessDateRaw ?? undefined) ?? parseDate(signedAt);

    setValue(values, `${prefix}_name_en`, text(witnessName));
    setValue(values, `${prefix}_name_ar`, text(witnessName));
    setValue(values, `${prefix}_signature_en`, signature(witnessSignature ?? undefined));
    setValue(values, `${prefix}_signature_ar`, signature(witnessSignature ?? undefined));
    setValue(values, `${prefix}_date_en`, text(formatDate(witnessSignedAt)));
    setValue(values, `${prefix}_date_ar`, text(formatDate(witnessSignedAt)));
    setValue(
      values,
      `${prefix}_time_en`,
      text(witnessTimeRaw ?? formatTime(witnessSignedAt)),
    );
    setValue(
      values,
      `${prefix}_time_ar`,
      text(witnessTimeRaw ?? formatTime(witnessSignedAt)),
    );
  }

  return values;
}
