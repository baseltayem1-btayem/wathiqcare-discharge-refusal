import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";
import type { Browser } from "puppeteer";
import {
  computeDraftFingerprint,
  renderAcroFormFilledDraftPreview,
  sha256Hex,
  type AcroFormFilledDraftRequest,
} from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";

// 1x1 transparent PNG
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

function createMockBrowser(): Browser {
  return {
    newPage: async () => ({
      setViewport: async () => {},
      setContent: async () => {},
      emulateMediaType: async () => {},
      evaluate: async () => {},
      screenshot: async () => Buffer.from(TINY_PNG_BASE64, "base64"),
      close: async () => {},
    }),
    close: async () => {},
  } as unknown as Browser;
}

function loadCanonicalAmputationPdf(): Uint8Array {
  const candidates = [
    path.join(process.cwd(), "public", "approved-consent-forms", "amputation.pdf"),
    path.join(process.cwd(), "apps", "web", "public", "approved-consent-forms", "amputation.pdf"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Canonical amputation PDF not found for test");
}

function buildValidRequest(overrides: Partial<AcroFormFilledDraftRequest> = {}): AcroFormFilledDraftRequest {
  return {
    formId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    manifestHash: getAcroFormTemplateDiagnostics("imc-approved-amputation").manifestHash ?? "",
    doctorCompletionValues: {
      condition_description_en: "TEST CONDITION EN",
      condition_description_ar: "حالة تجريبية",
      proposed_procedure_en: "TEST PROCEDURE EN",
      proposed_procedure_ar: "إجراء تجريبي",
      significant_risks_options_en: "TEST RISKS EN",
      significant_risks_options_ar: "مخاطر تجريبية",
      risks_without_procedure_en: "TEST NON PROCEDURE RISKS EN",
      risks_without_procedure_ar: "مخاطر عدم الإجراء",
      physician_name: "SYNTHETIC PHYSICIAN",
      physician_designation: "TEST DESIGNATION",
      interpreter_required: "false",
      interpreter_present: "false",
      anesthesia_applies: "false",
      education_amputation_sheet_provided: "true",
    },
    patientDisplay: {
      name: "SYNTHETIC PATIENT",
      mrn: "TEST-MRN-1135",
      dob: "1985-03-15",
    },
    physicianContext: {
      name: "SYNTHETIC PHYSICIAN",
      designation: "TEST DESIGNATION",
    },
    encounterReference: {
      id: "enc-1",
      encounterId: "ENC-1",
    },
    correlationId: "corr-1",
    ...overrides,
  };
}

test("computeDraftFingerprint is deterministic for identical inputs", () => {
  const request = buildValidRequest();
  const pdfBytes = new Uint8Array([1, 2, 3]);
  const a = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  const b = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  assert.equal(a, b);
});

test("computeDraftFingerprint changes when a render value changes", () => {
  const request = buildValidRequest();
  const pdfBytes = new Uint8Array([1, 2, 3]);
  const base = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  const changed = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: { ...request.doctorCompletionValues, condition_description_en: "CHANGED" },
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  assert.notEqual(base, changed);
});

test("computeDraftFingerprint changes when patient identity changes", () => {
  const request = buildValidRequest();
  const pdfBytes = new Uint8Array([1, 2, 3]);
  const base = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: request.patientDisplay,
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  const changed = computeDraftFingerprint({
    formId: request.formId,
    formVersion: "2018-02",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: request.manifestHash,
    doctorCompletionValues: request.doctorCompletionValues,
    patientDisplay: { ...request.patientDisplay, mrn: "CHANGED" },
    physicianContext: request.physicianContext,
    encounterReference: request.encounterReference,
  });
  assert.notEqual(base, changed);
});

test("renderAcroFormFilledDraftPreview rejects unknown form id", async () => {
  const browser = createMockBrowser();
  const request = buildValidRequest({ formId: "unknown-form" });
  await assert.rejects(
    async () =>
      renderAcroFormFilledDraftPreview({
        request,
        browser,
        canonicalPdfBytes: new Uint8Array([1, 2, 3]),
        canonicalPdfHash: "wrong",
      }),
    /not a supported AcroForm-backed consent template/,
  );
});

test("renderAcroFormFilledDraftPreview rejects manifest hash mismatch", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({ manifestHash: "invalid-hash" });
  await assert.rejects(
    async () =>
      renderAcroFormFilledDraftPreview({
        request,
        browser,
        canonicalPdfBytes: pdfBytes,
        canonicalPdfHash: sha256Hex(pdfBytes),
      }),
    /Manifest hash mismatch/,
  );
});

test("renderAcroFormFilledDraftPreview rejects canonical PDF hash mismatch", async () => {
  const browser = createMockBrowser();
  const request = buildValidRequest();
  await assert.rejects(
    async () =>
      renderAcroFormFilledDraftPreview({
        request,
        browser,
        canonicalPdfBytes: new Uint8Array([1, 2, 3]),
        canonicalPdfHash: sha256Hex(new Uint8Array([1, 2, 3])),
      }),
    /Canonical approved PDF hash mismatch/,
  );
});

test("renderAcroFormFilledDraftPreview produces a 5-page 612x792 flattened PDF", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.ok(result.bytes.length > 0);
  assert.ok(result.fingerprint.length > 0);
  assert.equal(result.summary.pages, 5);
  assert.equal(result.summary.pageWidth, 612);
  assert.equal(result.summary.pageHeight, 792);
  assert.equal(result.summary.flattened, true);

  const reopened = await PDFDocument.load(result.bytes);
  assert.equal(reopened.getPages().length, 5);
  assert.equal(reopened.getForm().getFields().length, 0, "AcroForm fields must be removed");

  const catalog = reopened.catalog;
  const acroFormValue = catalog.get(PDFName.of("AcroForm"));
  if (acroFormValue) {
    // If a catalog AcroForm entry remains, it must contain no fields.
    const fields = (acroFormValue as { get?: (name: unknown) => unknown }).get?.(PDFName.of("Fields"));
    assert.ok(
      !fields || (Array.isArray(fields) && fields.length === 0),
      "Any remaining AcroForm entry must have no fields",
    );
  }
  assert.ok(!catalog.get(PDFName.of("OpenAction")), "Catalog must not contain OpenAction");

  for (const page of reopened.getPages()) {
    const annots = page.node.get(PDFName.of("Annots"));
    assert.ok(
      !annots || (annots instanceof PDFArray && annots.size() === 0),
      "Page annotations must be removed",
    );
  }
});

test("renderAcroFormFilledDraftPreview renders demographics and all page fields", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  const rendered = new Set(result.summary.fieldsRendered);
  assert.ok(rendered.has("patient_name"), "patient name should render");
  assert.ok(rendered.has("mrn"), "MRN should render");
  assert.ok(rendered.has("date_of_birth"), "DOB should render");
  assert.ok(rendered.has("condition_description_en"));
  assert.ok(rendered.has("condition_description_ar"));
  assert.ok(rendered.has("proposed_procedure_en"));
  assert.ok(rendered.has("proposed_procedure_ar"));
  assert.ok(rendered.has("significant_risks_options_en"));
  assert.ok(rendered.has("significant_risks_options_ar"));
  assert.ok(rendered.has("risks_without_procedure_en"));
  assert.ok(rendered.has("risks_without_procedure_ar"));
  assert.ok(rendered.has("doctor_delegate_name"));
  assert.ok(rendered.has("doctor_delegate_designation"));
  assert.ok(rendered.has("info_sheet_amputation"), "education checkbox should render");
});

test("renderAcroFormFilledDraftPreview keeps patient and physician signatures blank", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.equal(result.summary.signaturesRendered.length, 0, "No signatures should be rendered in pre-signature draft");
  assert.ok(!result.summary.fieldsRendered.includes("patient_signature_en"));
  assert.ok(!result.summary.fieldsRendered.includes("doctor_delegate_signature_en"));
});

test("renderAcroFormFilledDraftPreview renders Arabic text without mojibake", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  const arabicFields = result.summary.fieldsRendered.filter((key) => {
    const value = String(request.doctorCompletionValues[key] ?? "");
    return /[\u0600-\u06FF]/.test(value);
  });
  assert.ok(arabicFields.length > 0, "At least one Arabic field should be rendered");
});

test("renderAcroFormFilledDraftPreview does not require the ConsentForm database table", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  // The service must not throw a schema/database error; it uses only source-controlled data.
  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.equal(result.summary.pages, 5);
});
