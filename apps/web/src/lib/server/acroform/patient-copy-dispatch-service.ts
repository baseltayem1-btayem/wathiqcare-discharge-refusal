/**
 * MR1135 patient-copy dispatch service.
 *
 * Governs the transition from physician-reviewed filled draft to the immutable
 * patient-facing signing document. Reuses the same AcroForm renderer, manifest,
 * canonical PDF, and normalized values as the physician preview.
 */

import path from "node:path";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { Browser } from "puppeteer";
import { ApiError } from "@/lib/server/http";
import { launchOverlayBrowser } from "@/lib/server/imc-approved-pdf-template-engine";
import { resolveCanonicalAcroFormTemplateId } from "@/lib/server/acroform/acroform-template-identity";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
import type { AcroFormTemplateManifest } from "@/lib/server/acroform/field-addressed-template-manifest";
import {
  computeDraftFingerprint,
  renderAcroFormPatientCopy,
  sha256Hex,
  type AcroFormPatientCopyRequest,
  type AcroFormPatientCopyResult,
  type DraftEncounterReference,
  type DraftPatientDisplay,
  type DraftPhysicianContext,
} from "@/lib/server/acroform/filled-draft-preview-service";

export type GovernedPatientCopy = AcroFormPatientCopyResult & {
  formId: string;
  approvedPdfUrl: string;
  manifestHash: string;
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  encounterReference?: DraftEncounterReference;
  generatedAt: string;
};

export type ConsentDocumentForPatientCopy = {
  id: string;
  patientName?: string;
  mrn?: string | null;
  dob?: string | null;
  physicianName?: string;
  physicianSpecialty?: string;
  metadata?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  const str = readString(value);
  return str || undefined;
}

function readDoctorCompletionValues(metadata: Record<string, unknown>): Record<string, unknown> {
  const raw = metadata.doctorCompletionValues;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function readPatientDisplay(document: ConsentDocumentForPatientCopy): DraftPatientDisplay {
  const metadata = asRecord(document.metadata) ?? {};
  const explicit = asRecord(metadata.patientDisplay);

  return {
    name: readString(explicit?.name || document.patientName),
    mrn: readString(explicit?.mrn || document.mrn),
    dob: readOptionalString(explicit?.dob || document.dob),
  };
}

function readPhysicianContext(document: ConsentDocumentForPatientCopy): DraftPhysicianContext {
  const metadata = asRecord(document.metadata) ?? {};
  const explicit = asRecord(metadata.physicianContext);

  return {
    name: readString(explicit?.name || document.physicianName),
    designation: readOptionalString(explicit?.designation || document.physicianSpecialty),
  };
}

function readEncounterReference(metadata: Record<string, unknown>): DraftEncounterReference | undefined {
  const explicit = asRecord(metadata.encounterReference);
  if (!explicit) return undefined;
  return {
    id: readOptionalString(explicit.id),
    encounterId: readOptionalString(explicit.encounterId),
  };
}

function readApprovedPdfUrl(document: ConsentDocumentForPatientCopy): string {
  const metadata = asRecord(document.metadata) ?? {};
  const candidate =
    readString(metadata.approvedPdfUrl) ||
    readString(metadata.pdfTemplateUrl) ||
    readString(metadata.sourcePdfUrl) ||
    readString(metadata.immutablePdfUrl);
  return candidate;
}

const ACROFORM_MANIFESTS: Record<string, AcroFormTemplateManifest> = {
  "imc-approved-amputation": amputationManifest as AcroFormTemplateManifest,
};

function resolveFormVersion(formId: string): string {
  const canonical = resolveCanonicalAcroFormTemplateId(formId);
  const canonicalFormId = canonical?.canonicalFormId ?? formId;
  const manifest = ACROFORM_MANIFESTS[canonicalFormId];
  return manifest?.templateVersion ?? "1.0";
}

export function resolveAcroFormPatientCopyInputs(document: ConsentDocumentForPatientCopy): {
  formId: string;
  formVersion: string;
  approvedPdfUrl: string;
  manifestHash: string;
  doctorCompletionValues: Record<string, unknown>;
  patientDisplay: DraftPatientDisplay;
  physicianContext: DraftPhysicianContext;
  encounterReference?: DraftEncounterReference;
  filledDraftFingerprint?: string;
  filledDraftReviewed?: boolean;
} {
  const metadata = asRecord(document.metadata) ?? {};
  const fieldMappingReadiness = asRecord(metadata.fieldMappingReadiness);
  const acroForm = asRecord(fieldMappingReadiness?.acroForm);
  const manifestState = asRecord(acroForm?.manifestState);

  const formId = readString(metadata.approvedConsentFormId || fieldMappingReadiness?.formId);
  const approvedPdfUrl = readApprovedPdfUrl(document);
  const manifestHash = readString(manifestState?.hash);
  const doctorCompletionValues = readDoctorCompletionValues(metadata);
  const patientDisplay = readPatientDisplay(document);
  const physicianContext = readPhysicianContext(document);
  const encounterReference = readEncounterReference(metadata);
  const filledDraftFingerprint = readOptionalString(metadata.filledDraftFingerprint);
  const filledDraftReviewed = metadata.filledDraftReviewed === true;
  const formVersion = resolveFormVersion(formId);

  return {
    formId,
    formVersion,
    approvedPdfUrl,
    manifestHash,
    doctorCompletionValues,
    patientDisplay,
    physicianContext,
    encounterReference,
    filledDraftFingerprint,
    filledDraftReviewed,
  };
}

export function isAcroFormBackedPatientCopy(document: ConsentDocumentForPatientCopy): boolean {
  const inputs = resolveAcroFormPatientCopyInputs(document);
  return Boolean(
    inputs.formId &&
      inputs.approvedPdfUrl &&
      inputs.manifestHash &&
      inputs.filledDraftFingerprint &&
      inputs.filledDraftReviewed,
  );
}

export function verifyFilledDraftFingerprint(
  inputs: ReturnType<typeof resolveAcroFormPatientCopyInputs>,
  canonicalPdfHash: string,
): void {
  if (!inputs.filledDraftReviewed) {
    throw new ApiError(409, "Filled draft preview has not been reviewed.");
  }

  if (!inputs.filledDraftFingerprint) {
    throw new ApiError(409, "Filled draft fingerprint is missing.");
  }

  const regenerated = computeDraftFingerprint({
    formId: inputs.formId,
    formVersion: inputs.formVersion,
    canonicalPdfHash,
    manifestHash: inputs.manifestHash,
    doctorCompletionValues: inputs.doctorCompletionValues,
    patientDisplay: inputs.patientDisplay,
    physicianContext: inputs.physicianContext,
    encounterReference: inputs.encounterReference,
  });

  if (regenerated !== inputs.filledDraftFingerprint) {
    throw new ApiError(409, "Filled draft fingerprint mismatch: preview is stale or values were altered.");
  }
}

const ALLOWED_PUBLIC_PREFIXES = ["/imc-consent-library/", "/approved-consent-forms/"];

function resolveCanonicalPdfFile(sourceUrl: string): string | null {
  const url = sourceUrl.trim();

  if (!url.startsWith("/")) return null;

  const pathname = url.split("?")[0] || "";
  const allowed = ALLOWED_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!allowed) return null;

  const decodedPathname = decodeURIComponent(pathname);
  const relativePath = decodedPathname.replace(/^\/+/, "");
  if (relativePath.includes("..")) return null;
  if (path.extname(relativePath).toLowerCase() !== ".pdf") return null;

  const publicRoots = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "apps", "web", "public"),
    path.resolve(process.cwd(), "..", "public"),
  ];

  for (const root of publicRoots) {
    const candidate = path.resolve(root, relativePath);
    if (!candidate.startsWith(root + path.sep)) continue;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

export async function fetchCanonicalPdfBytes(approvedPdfUrl: string): Promise<Uint8Array> {
  if (/^https?:\/\//i.test(approvedPdfUrl)) {
    const response = await fetch(approvedPdfUrl);
    if (!response.ok) {
      throw new ApiError(422, "Canonical approved PDF source returned an error.");
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const filePath = resolveCanonicalPdfFile(approvedPdfUrl);
  if (!filePath) {
    throw new ApiError(422, "Canonical approved PDF source is unavailable.");
  }

  const bytes = await readFile(filePath);
  return new Uint8Array(bytes);
}

export async function generateGovernedPatientCopy(args: {
  document: ConsentDocumentForPatientCopy;
  browser?: Browser;
  patientSignature?: AcroFormPatientCopyRequest["patientSignature"];
}): Promise<GovernedPatientCopy> {
  const inputs = resolveAcroFormPatientCopyInputs(args.document);

  if (!inputs.formId) {
    throw new ApiError(422, "Approved consent form identity is missing.");
  }
  if (!inputs.approvedPdfUrl) {
    throw new ApiError(422, "Approved PDF source URL is missing.");
  }
  if (!inputs.manifestHash) {
    throw new ApiError(422, "AcroForm manifest hash is missing.");
  }

  const canonicalPdfBytes = await fetchCanonicalPdfBytes(inputs.approvedPdfUrl);
  const canonicalPdfHash = sha256Hex(canonicalPdfBytes);

  verifyFilledDraftFingerprint(inputs, canonicalPdfHash);

  const request: AcroFormPatientCopyRequest = {
    formId: inputs.formId,
    approvedPdfUrl: inputs.approvedPdfUrl,
    manifestHash: inputs.manifestHash,
    doctorCompletionValues: inputs.doctorCompletionValues,
    patientDisplay: inputs.patientDisplay,
    physicianContext: inputs.physicianContext,
    encounterReference: inputs.encounterReference,
    patientSignature: args.patientSignature,
  };

  const browser = args.browser ?? (await launchOverlayBrowser());
  const shouldCloseBrowser = !args.browser;

  try {
    const rendered = await renderAcroFormPatientCopy({
      request,
      browser,
      canonicalPdfBytes,
      canonicalPdfHash,
    });

    return {
      ...rendered,
      formId: inputs.formId,
      approvedPdfUrl: inputs.approvedPdfUrl,
      manifestHash: inputs.manifestHash,
      doctorCompletionValues: inputs.doctorCompletionValues,
      patientDisplay: inputs.patientDisplay,
      physicianContext: inputs.physicianContext,
      encounterReference: inputs.encounterReference,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    if (shouldCloseBrowser) {
      await browser.close().catch(() => {
        /* ignore close errors */
      });
    }
  }
}
