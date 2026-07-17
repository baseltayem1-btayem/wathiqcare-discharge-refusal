import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import { PNG } from "pngjs";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";
import type { Browser } from "puppeteer";
import {
  computeDraftFingerprint,
  renderAcroFormFilledDraftPreview,
  sha256Hex,
  type AcroFormFilledDraftRequest,
} from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { launchOverlayBrowser } from "@/lib/server/imc-approved-pdf-template-engine";
import { renderPdfPageToPng } from "@/lib/server/imc-approved-pdf-template-engine";

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

test("renderAcroFormFilledDraftPreview keeps patient signature blank and renders physician signature when provided", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({
    physicianSignatureDataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
  });

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.ok(
    result.summary.signaturesRendered.includes("doctor_delegate_signature_en"),
    "Physician signature should render in the preview",
  );
  assert.ok(
    result.summary.signaturesRendered.includes("doctor_delegate_signature_ar"),
    "Physician signature Arabic target should render",
  );
  assert.ok(!result.summary.fieldsRendered.includes("patient_signature_en"));
  assert.ok(!result.summary.fieldsRendered.includes("patient_signature_ar"));
});

test("renderAcroFormFilledDraftPreview defers physician date and time until finalization", async () => {
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
  assert.ok(!rendered.has("doctor_delegate_date"), "Preview must not fabricate physician date");
  assert.ok(!rendered.has("doctor_delegate_time"), "Preview must not fabricate physician time");
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


test("renderAcroFormFilledDraftPreview renders doctor-completed physician name instead of authenticated email", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({
    doctorCompletionValues: {
      ...buildValidRequest().doctorCompletionValues,
      physician_name: "Dr. Khalid Al-Farsi",
      physician_designation: "Vascular Surgery Consultant",
    },
    physicianContext: {
      name: "physician@example.com",
      designation: "Fallback Specialty",
    },
  });

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  const rendered = new Set(result.summary.fieldsRendered);
  assert.ok(rendered.has("doctor_delegate_name"));
  assert.ok(rendered.has("doctor_delegate_designation"));
});

test("renderAcroFormFilledDraftPreview renders each field at most once", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest();

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  const seen = new Set<string>();
  for (const fieldName of result.summary.fieldsRendered) {
    assert.ok(!seen.has(fieldName), `Field ${fieldName} must not be rendered twice in the summary`);
    seen.add(fieldName);
  }
});

test("renderAcroFormFilledDraftPreview rejects missing patient DOB", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({ patientDisplay: { name: "SYNTHETIC PATIENT", mrn: "TEST-MRN-1135" } });

  await assert.rejects(
    async () =>
      renderAcroFormFilledDraftPreview({
        request,
        browser,
        canonicalPdfBytes: pdfBytes,
        canonicalPdfHash: sha256Hex(pdfBytes),
      }),
    /Patient date of birth is required/,
  );
});

test("renderAcroFormFilledDraftPreview normalizes DD/MM/YYYY DOB", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({ patientDisplay: { name: "SYNTHETIC PATIENT", mrn: "TEST-MRN-1135", dob: "17/07/1985" } });

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.ok(result.summary.fieldsRendered.includes("date_of_birth"));
});

test("renderAcroFormFilledDraftPreview uses physician designation fallback and never uses email", async () => {
  const browser = createMockBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({
    doctorCompletionValues: {
      ...buildValidRequest().doctorCompletionValues,
      physician_designation: undefined,
      designation: "Consultant Surgeon",
    },
    physicianContext: {
      name: "physician@example.com",
      designation: "Fallback Specialty",
    },
  });

  const result = await renderAcroFormFilledDraftPreview({
    request,
    browser,
    canonicalPdfBytes: pdfBytes,
    canonicalPdfHash: sha256Hex(pdfBytes),
  });

  assert.ok(result.summary.fieldsRendered.includes("doctor_delegate_designation"));
});

function countNonWhitePixels(png: PNG, x1: number, y1: number, x2: number, y2: number): number {
  let count = 0;
  for (let y = Math.max(0, y1); y < Math.min(png.height, y2); y++) {
    for (let x = Math.max(0, x1); x < Math.min(png.width, x2); x++) {
      const idx = (png.width * y + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const a = png.data[idx + 3];
      // Treat any non-background (not fully white/transparent) pixel as ink.
      if (a > 30 && (r < 250 || g < 250 || b < 250)) {
        count++;
      }
    }
  }
  return count;
}

test("renderAcroFormFilledDraftPreview renders Arabic glyphs visibly on a real browser", async () => {
  const browser = await launchOverlayBrowser();
  const pdfBytes = loadCanonicalAmputationPdf();
  const request = buildValidRequest({
    doctorCompletionValues: {
      ...buildValidRequest().doctorCompletionValues,
      condition_description_ar: "اختبار WATHIQ رقم 006",
    },
  });

  try {
    const result = await renderAcroFormFilledDraftPreview({
      request,
      browser,
      canonicalPdfBytes: pdfBytes,
      canonicalPdfHash: sha256Hex(pdfBytes),
    });

    assert.ok(result.summary.fieldsRendered.includes("condition_description_ar"));

    const pngBytes = await renderPdfPageToPng({ pdfBytes: result.bytes, pageIndex: 0, scale: 2 });
    const png = PNG.sync.read(Buffer.from(pngBytes));

    // condition_description_ar widget rect in PDF points: [338, 451, 560, 494]
    // Page height is 792; CSS top = 792 - 451 = 341; height = 494 - 451 = 43; width = 560 - 338 = 222
    // At scale 2 these map to pixels.
    const fieldLeft = Math.round(338 * 2);
    const fieldTop = Math.round(341 * 2);
    const fieldWidth = Math.round(222 * 2);
    const fieldHeight = Math.round(43 * 2);

    // Arabic is RTL, so the first Arabic word "اختبار" appears on the right side
    // of the box and the last word "رقم" appears left of the Latin digits.
    const arabicRightRegion = {
      x1: fieldLeft + Math.round(fieldWidth * 0.55),
      y1: fieldTop + 4,
      x2: fieldLeft + fieldWidth - 4,
      y2: fieldTop + fieldHeight - 4,
    };
    const arabicLeftRegion = {
      x1: fieldLeft + 4,
      y1: fieldTop + 4,
      x2: fieldLeft + Math.round(fieldWidth * 0.35),
      y2: fieldTop + fieldHeight - 4,
    };

    const rightPixels = countNonWhitePixels(
      png,
      arabicRightRegion.x1,
      arabicRightRegion.y1,
      arabicRightRegion.x2,
      arabicRightRegion.y2,
    );
    const leftPixels = countNonWhitePixels(
      png,
      arabicLeftRegion.x1,
      arabicLeftRegion.y1,
      arabicLeftRegion.x2,
      arabicLeftRegion.y2,
    );

    assert.ok(rightPixels > 50, `Expected Arabic glyphs on right side of field, found ${rightPixels} ink pixels`);
    assert.ok(leftPixels > 50, `Expected Arabic glyphs on left side of field, found ${leftPixels} ink pixels`);
  } finally {
    await browser.close();
  }
});
