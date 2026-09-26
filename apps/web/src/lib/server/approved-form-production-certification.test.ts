import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import {
  IMC_APPROVED_CONSENT_FORMS_MANIFEST,
  type ImcApprovedConsentManifestItem,
} from "@/lib/server/imc-approved-consent-forms.manifest";
import { getConsentFieldMappingByFormId } from "@/lib/server/consent-field-mappings";
import type { ConsentFieldMapping, ConsentFieldDefinition } from "@/lib/consents/field-mapping/types";
import {
  renderImcApprovedDoctorDraftPdf,
  renderImcApprovedConsentPdfFromSynthetic,
} from "@/lib/server/imc-approved-pdf-template-engine";
import { invalidateStaleApproval } from "@/components/informed-consents/production-workspace/hooks/useProductionWorkspace";

type CertificationStatus = "READY" | "NEEDS_REVIEW" | "FORM_SPECIFIC_FAILURE";

type CertificationResult = {
  formId: string;
  slug: string;
  titleEn: string;
  status: CertificationStatus;
  reasons: string[];
  sourceResolved: boolean;
  mappingResolved: boolean;
  mappingVerified: boolean;
  patientSignatureMapped: boolean;
  physicianSignatureMapped: boolean;
  signedAtMapped: boolean;
  draftTextFieldsDrawn: number;
  draftPhysicianSignatureDrawn: boolean;
  originalPageCount: number;
  patientCopySourcePageCount: number;
  finalPatientCopyPageCount: number;
  finalPatientCopyPhysicianSignatureDrawn: boolean;
  finalPatientCopyPatientSignatureDrawn: boolean;
  finalPatientCopyTextFieldsDrawn: number;
  finalPatientCopyChecksum: string | null;
};

const HEADER_PROTECTED_REGION_TOP = 0.05;
const HEADER_PROTECTED_REGION_BOTTOM = 0.02;

function isKnownPatientCopyFilename(manifestItem: ImcApprovedConsentManifestItem): boolean {
  return Boolean(
    manifestItem.patientCopyPdfUrl && manifestItem.patientCopyPdfUrl.toLowerCase().endsWith(".pdf"),
  );
}

async function buildSyntheticSignatureDataUrl(label: string): Promise<string> {
  return QRCode.toDataURL(`signature:${label}`, { margin: 1, width: 220 });
}

function buildSyntheticDoctorCompletionValues(mapping: ConsentFieldMapping): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of mapping.fields) {
    const editableRoles = new Set([
      "PHYSICIAN_REQUIRED",
      "PHYSICIAN_OPTIONAL",
      "ANESTHESIA_OPTIONAL",
    ]);

    if (!editableRoles.has(field.role)) {
      continue;
    }

    if (field.type === "TEXT" || field.type === "MULTILINE_TEXT") {
      values[field.key] = `Synthetic ${field.labelEn} for certification`;
    } else if (field.type === "CHECKBOX") {
      values[field.key] = field.key === "anesthesia_applies" ? "false" : "true";
    } else if (field.type === "DATE" || field.type === "DATETIME") {
      values[field.key] = new Date("2026-07-18T20:00:00.000Z").toISOString();
    }
  }

  return values;
}

function getFieldPlacement(field: ConsentFieldDefinition): { x: number; y: number } | null {
  const placement = field.coordinates || field.arabicCoordinates;
  if (!placement) return null;
  if (typeof placement.x !== "number" || typeof placement.y !== "number") return null;
  return { x: placement.x, y: placement.y };
}

function hasSignatureCoordinates(mapping: ConsentFieldMapping | null, key: string): boolean {
  if (!mapping) return false;
  const field = mapping.fields.find((f) => f.key === key);
  if (!field) return false;
  return Boolean(getFieldPlacement(field));
}

function hasSignedAtCoordinates(mapping: ConsentFieldMapping | null): boolean {
  if (!mapping) return false;
  const field = mapping.fields.find((f) => f.key === "signed_at");
  if (!field) return false;
  return Boolean(getFieldPlacement(field));
}

function isInProtectedRegion(field: ConsentFieldDefinition): boolean {
  const placement = getFieldPlacement(field);
  if (!placement) return false;
  const { y } = placement;
  return y < HEADER_PROTECTED_REGION_TOP || y > 1 - HEADER_PROTECTED_REGION_BOTTOM;
}

async function loadApprovedPdfBytes(publicUrl: string): Promise<Buffer | null> {
  const pathname = publicUrl.split("?")[0];
  if (!pathname.startsWith("/")) return null;
  const relative = decodeURIComponent(pathname.replace(/^\/+/, ""));
  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function certifyForm(
  manifestItem: ImcApprovedConsentManifestItem,
): Promise<CertificationResult> {
  const base: CertificationResult = {
    formId: manifestItem.id,
    slug: manifestItem.slug,
    titleEn: manifestItem.titleEn,
    status: "FORM_SPECIFIC_FAILURE",
    reasons: [],
    sourceResolved: false,
    mappingResolved: false,
    mappingVerified: false,
    patientSignatureMapped: false,
    physicianSignatureMapped: false,
    signedAtMapped: false,
    draftTextFieldsDrawn: 0,
    draftPhysicianSignatureDrawn: false,
    originalPageCount: 0,
    patientCopySourcePageCount: 0,
    finalPatientCopyPageCount: 0,
    finalPatientCopyPhysicianSignatureDrawn: false,
    finalPatientCopyPatientSignatureDrawn: false,
    finalPatientCopyTextFieldsDrawn: 0,
    finalPatientCopyChecksum: null,
  };

  try {
    const sourceBytes = await loadApprovedPdfBytes(manifestItem.pdfUrl);
    if (!sourceBytes) {
      base.reasons.push(`Source PDF not found: ${manifestItem.pdfUrl}`);
      return base;
    }
    base.sourceResolved = true;

    const sourcePdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
    base.originalPageCount = sourcePdf.getPageCount();

    if (manifestItem.patientCopyPdfUrl) {
      const patientCopyBytes = await loadApprovedPdfBytes(manifestItem.patientCopyPdfUrl);
      if (patientCopyBytes) {
        const patientCopyPdf = await PDFDocument.load(patientCopyBytes, { updateMetadata: false });
        base.patientCopySourcePageCount = patientCopyPdf.getPageCount();
      }
    }

    const mapping = getConsentFieldMappingByFormId(manifestItem.id);
    if (!mapping) {
      base.reasons.push("No consent field mapping resolved");
      return base;
    }
    base.mappingResolved = true;
    base.mappingVerified = mapping.verificationStatus === "VERIFIED";
    base.patientSignatureMapped = hasSignatureCoordinates(mapping, "patient_signature");
    base.physicianSignatureMapped = hasSignatureCoordinates(mapping, "treating_physician_signature");
    base.signedAtMapped = hasSignedAtCoordinates(mapping);

    const protectedFields = mapping.fields.filter(
      (f) => f.coordinates && isInProtectedRegion(f),
    );
    if (protectedFields.length > 0) {
      base.reasons.push(
        `Fields overlap protected region: ${protectedFields.map((f) => f.key).join(", ")}`,
      );
    }

    const doctorValues = buildSyntheticDoctorCompletionValues(mapping);
    const physicianSignature = await buildSyntheticSignatureDataUrl("physician");

    let draftResult:
      | Awaited<ReturnType<typeof renderImcApprovedDoctorDraftPdf>>
      | null = null;
    try {
      draftResult = await renderImcApprovedDoctorDraftPdf({
        pdfBytes: sourceBytes,
        formId: manifestItem.id,
        doctorCompletionValues: doctorValues,
        physicianSignatureDataUrl: physicianSignature,
      });
      base.draftTextFieldsDrawn = draftResult.textFieldsDrawn;
      base.draftPhysicianSignatureDrawn = draftResult.physicianSignatureDrawn;
    } catch (error) {
      base.reasons.push(
        `Draft preview failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return base;
    }

    if (draftResult.textFieldsDrawn === 0) {
      base.reasons.push("Draft preview drew no text fields");
    }
    if (!draftResult.physicianSignatureDrawn) {
      base.reasons.push("Draft preview did not draw physician signature");
    }

    const patientSignature = await buildSyntheticSignatureDataUrl("patient");

    let finalPatientCopy:
      | Awaited<ReturnType<typeof renderImcApprovedConsentPdfFromSynthetic>>
      | null = null;
    try {
      finalPatientCopy = await renderImcApprovedConsentPdfFromSynthetic({
        formId: manifestItem.id,
        copyType: "PATIENT_COPY",
        doctorCompletionValues: doctorValues,
        physicianSignatureDataUrl: physicianSignature,
        patientOrGuardianSignatureDataUrl: patientSignature,
        patientOrGuardianRole: "PATIENT",
        signedAt: new Date("2026-07-18T20:00:00.000Z"),
        patientName: "Test Patient",
        mrn: "TEST-MRN-001",
        procedure: manifestItem.titleEn,
        physicianName: "Dr. Test Physician",
        documentId: `synthetic-${manifestItem.id}`,
      });
      base.finalPatientCopyPageCount = finalPatientCopy.pageCount;
      base.finalPatientCopyPhysicianSignatureDrawn = finalPatientCopy.physicianSignatureDrawn;
      base.finalPatientCopyPatientSignatureDrawn = finalPatientCopy.patientSignatureDrawn;
      base.finalPatientCopyTextFieldsDrawn = finalPatientCopy.textFieldsDrawn;
      base.finalPatientCopyChecksum = finalPatientCopy.checksum;
    } catch (error) {
      base.reasons.push(
        `Final patient-copy generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return base;
    }

    const expectedPatientCopyPageCount =
      base.patientCopySourcePageCount > 0
        ? base.patientCopySourcePageCount
        : base.originalPageCount;
    if (finalPatientCopy.pageCount !== expectedPatientCopyPageCount) {
      base.reasons.push(
        `Patient copy page count changed: ${finalPatientCopy.pageCount} vs ${expectedPatientCopyPageCount}`,
      );
    }

    if (finalPatientCopy.textFieldsDrawn === 0) {
      base.reasons.push("Final patient copy drew no text fields");
    }

    if (!finalPatientCopy.physicianSignatureDrawn) {
      base.reasons.push("Final patient copy did not draw physician signature");
    }

    if (!finalPatientCopy.patientSignatureDrawn) {
      base.reasons.push("Final patient copy did not draw patient signature");
    }

    if (base.reasons.length === 0) {
      base.status = "READY";
      return base;
    }

    const needsReview =
      !base.mappingVerified ||
      !base.patientSignatureMapped ||
      !base.signedAtMapped ||
      !isKnownPatientCopyFilename(manifestItem);

    base.status = needsReview ? "NEEDS_REVIEW" : "FORM_SPECIFIC_FAILURE";
    return base;
  } catch (error) {
    base.reasons.push(
      `Unexpected certification error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return base;
  }
}

function selectCertificationForms(): ImcApprovedConsentManifestItem[] {
  if (process.env.FULL_APPROVED_FORM_CERTIFICATION === "1") {
    return IMC_APPROVED_CONSENT_FORMS_MANIFEST;
  }

  const preferredSlugs = new Set([
    "adenotonsillectomy",
    "arthrogram",
    "appendectomy-consent",
    "amputation",
    "anesthesia-patient-consent",
  ]);

  const preferred = IMC_APPROVED_CONSENT_FORMS_MANIFEST.filter((item) =>
    preferredSlugs.has(item.slug),
  );

  if (preferred.length > 0) {
    return preferred;
  }

  return IMC_APPROVED_CONSENT_FORMS_MANIFEST.slice(0, 5);
}

test("approval lifecycle invalidates stale approval on governed value changes", () => {
  const baseState = {
    step: "review" as const,
    procedureQuery: "",
    educationIncluded: true,
    physicianNotes: "",
    draftApproved: true,
    reviewMode: false,
    previewReviewed: true,
    recipientMobile: "",
    recipientEmail: "",
    doctorCompletionValues: {},
    physicianSignatureDataUrl: "",
    timeline: [],
    acknowledgedBlockers: new Set<string>(),
    acknowledgedAlerts: new Set<string>(),
  };

  const afterCompletion = invalidateStaleApproval({
    ...baseState,
    doctorCompletionValues: { condition_and_treatment: "updated" },
  });
  assert.equal(afterCompletion.draftApproved, false);
  assert.equal(afterCompletion.previewReviewed, false);

  const afterSignature = invalidateStaleApproval({
    ...baseState,
    physicianSignatureDataUrl: "data:image/png;base64,abc",
  });
  assert.equal(afterSignature.draftApproved, false);
  assert.equal(afterSignature.previewReviewed, false);
});

test("filled preview and final PDF generation work for adenotonsillectomy", { timeout: 120000 }, async () => {
  const manifestItem = IMC_APPROVED_CONSENT_FORMS_MANIFEST.find(
    (item) => item.slug === "adenotonsillectomy",
  );
  assert.ok(manifestItem, "adenotonsillectomy manifest entry not found");

  const result = await certifyForm(manifestItem);
  assert.equal(result.status, "READY", `Certification failed: ${result.reasons.join("; ")}`);
  assert.ok(result.finalPatientCopyChecksum, "Final patient copy checksum missing");
});

test("patient copy final PDF has no evidence appendix page", { timeout: 120000 }, async () => {
  const manifestItem = IMC_APPROVED_CONSENT_FORMS_MANIFEST.find(
    (item) => item.slug === "adenotonsillectomy",
  );
  assert.ok(manifestItem);

  const patientCopyUrl = manifestItem.patientCopyPdfUrl || manifestItem.pdfUrl;
  const sourceBytes = await loadApprovedPdfBytes(patientCopyUrl);
  assert.ok(sourceBytes);
  const sourcePdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const originalPageCount = sourcePdf.getPageCount();

  const final = await renderImcApprovedConsentPdfFromSynthetic({
    formId: manifestItem.id,
    copyType: "PATIENT_COPY",
    doctorCompletionValues: { condition_and_treatment: "Certification condition" },
    physicianSignatureDataUrl: await buildSyntheticSignatureDataUrl("physician"),
    patientOrGuardianSignatureDataUrl: await buildSyntheticSignatureDataUrl("patient"),
    patientOrGuardianRole: "PATIENT",
    signedAt: new Date("2026-07-18T20:00:00.000Z"),
  });

  assert.equal(
    final.pageCount,
    originalPageCount,
    "Patient copy must retain original page count (no appendix)",
  );
});

test(
  "approved form production certification batch",
  { timeout: 600000 },
  async () => {
    const forms = selectCertificationForms();
    const results: CertificationResult[] = [];

    for (const form of forms) {
      const result = await certifyForm(form);
      results.push(result);
    }

    console.table(
      results.map((r) => ({
        slug: r.slug,
        status: r.status,
        reasons: r.reasons.slice(0, 2).join("; "),
      })),
    );

    const readyCount = results.filter((r) => r.status === "READY").length;
    const reviewCount = results.filter((r) => r.status === "NEEDS_REVIEW").length;
    const failureCount = results.filter((r) => r.status === "FORM_SPECIFIC_FAILURE").length;

    assert.ok(
      readyCount > 0 || reviewCount > 0,
      `Batch produced no certifiable forms. Failures: ${failureCount}`,
    );

    const knownReadySlugs = ["adenotonsillectomy", "arthrogram"];
    for (const slug of knownReadySlugs) {
      const found = results.find((r) => r.slug === slug);
      if (found) {
        assert.equal(
          found.status,
          "READY",
          `${slug} should be READY; ${found.reasons.join("; ")}`,
        );
      }
    }
  },
);
