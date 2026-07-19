/**
 * AcroForm filled-draft preview service.
 *
 * Generates a flattened, non-editable filled draft from the canonical approved
 * PDF and the verified AcroForm manifest using current structured workspace
 * values. No database persistence is performed; the render is transient and
 * schema-independent.
 */

import crypto from "node:crypto";
import type { Browser } from "puppeteer";
import { ApiError } from "@/lib/server/http";
import { renderFieldAddressedPdf } from "@/lib/server/acroform/field-addressed-pdf-renderer";
import type { AcroFormTemplateManifest } from "@/lib/server/acroform/field-addressed-template-manifest";
import { buildAmputationFieldAddressedValues } from "@/lib/server/acroform/field-mapping/amputation-field-mapping";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { resolveCanonicalAcroFormTemplateId } from "@/lib/server/acroform/acroform-template-identity";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";

const ACROFORM_MANIFESTS: Record<string, AcroFormTemplateManifest> = {
  "imc-approved-amputation": amputationManifest as AcroFormTemplateManifest,
};

export type DraftPatientDisplay = {
  name: string;
  mrn: string;
  dob?: string | null;
};

export type DraftPhysicianContext = {
  name: string;
  designation?: string | null;
  designationEn?: string | null;
  designationAr?: string | null;
};

export type DraftEncounterReference = {
  id?: string;
  encounterId?: string;
};

export type AcroFormFilledDraftRequest = {
  formId: string;
  approvedPdfUrl: string;
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  encounterReference?: DraftEncounterReference;
  manifestHash: string;
  correlationId?: string;
  /**
   * Physician signature image captured in the workspace. Rendered in the preview
   * for visual review only; the authenticated legal signature evidence is
   * captured separately at send time and used for the final patient copy.
   */
  physicianSignatureDataUrl?: string;
};

export type AcroFormFilledDraftResult = {
  bytes: Uint8Array;
  fingerprint: string;
  summary: {
    pages: number;
    pageWidth: number;
    pageHeight: number;
    fieldsRendered: string[];
    widgetsRendered: number;
    signaturesRendered: string[];
    checkboxesRendered: string[];
    flattened: boolean;
  };
};

export type AcroFormPatientCopySignature = {
  dataUrl: string;
  signerName: string;
  signedAt: Date | string;
};

export type AcroFormPatientCopyRequest = AcroFormFilledDraftRequest & {
  patientSignature?: AcroFormPatientCopySignature;
};

export type AcroFormPatientCopyResult = AcroFormFilledDraftResult & {
  pdfHash: string;
};

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const cleaned = compactWhitespace(value);
    return cleaned || null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest("hex");
}

function normalizeRenderValues(
  doctorCompletionValues: Record<string, unknown>,
  patientDisplay: DraftPatientDisplay,
  physicianContext: DraftPhysicianContext,
  encounterReference?: DraftEncounterReference,
): Record<string, string | null> {
  const normalized: Record<string, string | null> = {};

  const sortedDoctorKeys = Object.keys(doctorCompletionValues).sort((a, b) => a.localeCompare(b));
  for (const key of sortedDoctorKeys) {
    normalized[`doctor_${key}`] = asString(doctorCompletionValues[key]);
  }

  normalized.patient_name = asString(patientDisplay.name);
  normalized.patient_mrn = asString(patientDisplay.mrn);
  normalized.patient_dob = asString(patientDisplay.dob);
  normalized.physician_name = asString(physicianContext.name);
  normalized.physician_designation = asString(physicianContext.designation);
  normalized.encounter_id = asString(encounterReference?.id);
  normalized.encounter_encounter_id = asString(encounterReference?.encounterId);

  return normalized;
}

export function computeDraftFingerprint(args: {
  formId: string;
  formVersion: string;
  canonicalPdfHash: string;
  manifestHash: string;
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  encounterReference?: DraftEncounterReference;
}): string {
  const normalized = normalizeRenderValues(
    args.doctorCompletionValues,
    args.patientDisplay,
    args.physicianContext,
    args.encounterReference,
  );

  const canonical = {
    formId: args.formId,
    formVersion: args.formVersion,
    canonicalPdfHash: args.canonicalPdfHash,
    manifestHash: args.manifestHash,
    values: normalized,
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function buildFieldAddressedDraftValues(args: {
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  physicianSignatureDataUrl?: string;
}): ReturnType<typeof buildAmputationFieldAddressedValues> {
  // Filled draft preview is generated before final patient signing. Physician
  // date/time are intentionally deferred until finalization, when the server
  // has the authenticated signature timestamp; the preview only shows the
  // physician-completed identity fields and the captured signature image.
  return buildAmputationFieldAddressedValues({
    doctorCompletionValues: args.doctorCompletionValues,
    physicianSignatureDataUrl: args.physicianSignatureDataUrl,
    patientSignatureDataUrl: undefined,
    physicianName: args.physicianContext.name,
    physicianSpecialty: args.physicianContext.designation,
    physicianDesignationEn: args.physicianContext.designationEn,
    physicianDesignationAr: args.physicianContext.designationAr,
    patientName: args.patientDisplay.name,
    mrn: args.patientDisplay.mrn,
    dob: args.patientDisplay.dob,
    signedAt: null,
  });
}

export async function renderAcroFormFilledDraftPreview(args: {
  request: AcroFormFilledDraftRequest;
  browser: Browser;
  canonicalPdfBytes: Uint8Array;
  canonicalPdfHash: string;
}): Promise<AcroFormFilledDraftResult> {
  const { request, browser, canonicalPdfBytes, canonicalPdfHash } = args;

  const identity = resolveCanonicalAcroFormTemplateId(request.formId);
  if (!identity) {
    throw new ApiError(400, "Form identifier is not a supported AcroForm-backed consent template.");
  }

  const manifest = ACROFORM_MANIFESTS[identity.canonicalFormId];
  if (!manifest) {
    throw new ApiError(400, "No verified AcroForm manifest is registered for this form.");
  }

  const diagnostics = getAcroFormTemplateDiagnostics(identity.canonicalFormId);
  if (diagnostics.status !== "READY") {
    throw new ApiError(422, `AcroForm manifest is not ready: ${diagnostics.blockers.join("; ")}`);
  }

  if (request.manifestHash !== diagnostics.manifestHash) {
    throw new ApiError(409, "Manifest hash mismatch. Refresh the field mapping and try again.");
  }

  if (canonicalPdfHash !== diagnostics.canonicalApprovedPdf?.sha256) {
    throw new ApiError(409, "Canonical approved PDF hash mismatch.");
  }

  if (!request.patientDisplay.dob) {
    throw new ApiError(422, "Patient date of birth is required to generate a governed filled draft preview.");
  }

  const values = buildFieldAddressedDraftValues({
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    physicianSignatureDataUrl: request.physicianSignatureDataUrl,
  });

  const result = await renderFieldAddressedPdf({
    canonicalPdfBytes,
    manifest,
    input: { values },
    browser,
    strict: false,
  });

  const fingerprint = computeDraftFingerprint({
    formId: identity.canonicalFormId,
    formVersion: manifest.templateVersion,
    canonicalPdfHash,
    manifestHash: diagnostics.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });

  return {
    bytes: result.bytes,
    fingerprint,
    summary: result.summary,
  };
}

function buildFieldAddressedPatientCopyValues(args: {
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  physicianSignatureDataUrl?: string;
  patientSignature?: AcroFormPatientCopySignature;
}): ReturnType<typeof buildAmputationFieldAddressedValues> {
  const signedAt = args.patientSignature?.signedAt ?? null;
  return buildAmputationFieldAddressedValues({
    doctorCompletionValues: args.doctorCompletionValues,
    physicianSignatureDataUrl: args.physicianSignatureDataUrl,
    patientSignatureDataUrl: args.patientSignature?.dataUrl,
    physicianName: args.physicianContext.name,
    physicianSpecialty: args.physicianContext.designation,
    physicianDesignationEn: args.physicianContext.designationEn,
    physicianDesignationAr: args.physicianContext.designationAr,
    patientName: args.patientDisplay.name,
    mrn: args.patientDisplay.mrn,
    dob: args.patientDisplay.dob,
    signedAt,
  });
}

export async function renderAcroFormPatientCopy(args: {
  request: AcroFormPatientCopyRequest;
  browser: Browser;
  canonicalPdfBytes: Uint8Array;
  canonicalPdfHash: string;
  strict?: boolean;
}): Promise<AcroFormPatientCopyResult> {
  const { request, browser, canonicalPdfBytes, canonicalPdfHash, strict = true } = args;

  const identity = resolveCanonicalAcroFormTemplateId(request.formId);
  if (!identity) {
    throw new ApiError(400, "Form identifier is not a supported AcroForm-backed consent template.");
  }

  const manifest = ACROFORM_MANIFESTS[identity.canonicalFormId];
  if (!manifest) {
    throw new ApiError(400, "No verified AcroForm manifest is registered for this form.");
  }

  const diagnostics = getAcroFormTemplateDiagnostics(identity.canonicalFormId);
  if (diagnostics.status !== "READY") {
    throw new ApiError(422, `AcroForm manifest is not ready: ${diagnostics.blockers.join("; ")}`);
  }

  if (request.manifestHash !== diagnostics.manifestHash) {
    throw new ApiError(409, "Manifest hash mismatch. Refresh the field mapping and try again.");
  }

  if (canonicalPdfHash !== diagnostics.canonicalApprovedPdf?.sha256) {
    throw new ApiError(409, "Canonical approved PDF hash mismatch.");
  }

  if (!request.patientDisplay.dob) {
    throw new ApiError(422, "Patient date of birth is required to generate a governed patient copy.");
  }

  const values = buildFieldAddressedPatientCopyValues({
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    physicianSignatureDataUrl: request.physicianSignatureDataUrl,
    patientSignature: request.patientSignature,
  });

  const result = await renderFieldAddressedPdf({
    canonicalPdfBytes,
    manifest,
    input: { values },
    browser,
    strict,
  });

  const fingerprint = computeDraftFingerprint({
    formId: identity.canonicalFormId,
    formVersion: manifest.templateVersion,
    canonicalPdfHash,
    manifestHash: diagnostics.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });

  return {
    bytes: result.bytes,
    fingerprint,
    pdfHash: sha256Hex(result.bytes),
    summary: result.summary,
  };
}

export { sha256Hex };
