import type { AcroFormFilledDraftRequest } from "@/lib/server/acroform/filled-draft-preview-service";

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export function parseAcroFormFilledDraftRequest(
  formId: string,
  body: Record<string, unknown>,
): { request: AcroFormFilledDraftRequest; missing: string[] } {
  const approvedPdfUrl = readString(body.approvedPdfUrl) || readString(body.pdfUrl);
  const doctorCompletionValues = readRecord(body.doctorCompletionValues) ?? readRecord(body.values) ?? {};
  const patientDisplayRecord = readRecord(body.patientDisplay);
  const physicianContextRecord = readRecord(body.physicianContext);
  const encounterReferenceRecord = readRecord(body.encounterReference);
  const manifestHash = readString(body.manifestHash);

  const missing: string[] = [];
  if (!approvedPdfUrl) missing.push("approvedPdfUrl");
  if (!patientDisplayRecord) missing.push("patientDisplay");
  if (!physicianContextRecord) missing.push("physicianContext");
  if (!manifestHash) missing.push("manifestHash");

  const patientName = readString(patientDisplayRecord?.name);
  const patientMrn = readString(patientDisplayRecord?.mrn);
  if (patientDisplayRecord && !patientName) missing.push("patientDisplay.name");
  if (patientDisplayRecord && !patientMrn) missing.push("patientDisplay.mrn");

  const physicianName = readString(physicianContextRecord?.name);
  if (physicianContextRecord && !physicianName) missing.push("physicianContext.name");

  const request: AcroFormFilledDraftRequest = {
    formId,
    approvedPdfUrl,
    doctorCompletionValues,
    patientDisplay: {
      name: patientName,
      mrn: patientMrn,
      dob: readOptionalString(patientDisplayRecord?.dob),
    },
    physicianContext: {
      name: physicianName,
      designation: readOptionalString(physicianContextRecord?.designation)
        ?? readOptionalString(physicianContextRecord?.specialty),
    },
    encounterReference: encounterReferenceRecord
      ? {
          id: readOptionalString(encounterReferenceRecord.id),
          encounterId: readOptionalString(encounterReferenceRecord.encounterId),
        }
      : undefined,
    manifestHash,
    correlationId: readOptionalString(body.correlationId),
  };

  return { request, missing };
}
