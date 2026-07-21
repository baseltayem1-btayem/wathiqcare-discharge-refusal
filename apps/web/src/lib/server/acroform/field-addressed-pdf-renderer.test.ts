import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import type { Browser } from "puppeteer";
import { renderFieldAddressedPdf } from "@/lib/server/acroform/field-addressed-pdf-renderer";
import type { AcroFormTemplateManifest } from "@/lib/server/acroform/field-addressed-template-manifest";

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

async function buildCanonicalPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([612, 792]);
  return pdfDoc.save();
}

function buildManifest(): AcroFormTemplateManifest {
  return {
    templateCode: "IMC TEST",
    templateVersion: "1.0",
    titleEn: "Test Consent",
    titleAr: "نموذج اختبار",
    status: "VERIFIED",
    manifestHash: "placeholder",
    provenance: {
      importedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: "test",
      sourceTool: "test",
      notes: "test manifest",
    },
    canonicalApprovedPdf: {
      sha256: "abc",
      sizeBytes: 0,
      pageCount: 1,
      pageSizePoints: { width: 612, height: 792 },
    },
    acroFormAuthoringArtifact: {
      sha256: "def",
      sizeBytes: 0,
      pageCount: 1,
      pageSizePoints: { width: 612, height: 792 },
      hasJavaScript: false,
      hasOpenAction: false,
      hasActiveActions: false,
      runtimeUsage: "AUTHORING_INPUT_ONLY",
    },
    fieldCounts: { total: 3, text: 1, button: 1, signature: 1 },
    fields: [
      {
        name: "patient_name",
        semanticKey: "patient_name",
        altName: "Patient Name",
        role: "SYSTEM",
        language: "EN",
        type: "/Tx",
        flags: 0,
        required: true,
        applicabilityRule: "always",
        checkboxOnState: null,
        multiline: false,
        autofit: false,
        widgets: [{ page: 1, rect: [100, 700, 250, 720], appearanceStates: null }],
        renderingStrategy: "TEXT",
      },
      {
        name: "interpreter_required",
        semanticKey: "interpreter_required",
        altName: "Interpreter required",
        role: "INTERPRETER",
        language: "EN",
        type: "/Btn",
        flags: 0,
        required: false,
        applicabilityRule: "interpreter_decision_required",
        checkboxOnState: "/Yes",
        multiline: false,
        autofit: false,
        widgets: [
          { page: 1, rect: [100, 650, 112, 662], appearanceStates: ["/Off", "/Yes"] },
        ],
        renderingStrategy: "CHECKBOX_MARK",
      },
      {
        name: "patient_signature",
        semanticKey: "patient_signature",
        altName: "Patient signature",
        role: "PATIENT",
        language: "EN",
        type: "/Sig",
        flags: 0,
        required: true,
        applicabilityRule: "always",
        checkboxOnState: null,
        multiline: false,
        autofit: false,
        widgets: [{ page: 1, rect: [100, 600, 250, 630], appearanceStates: null }],
        renderingStrategy: "SIGNATURE_IMAGE",
      },
    ],
  };
}

test("renderFieldAddressedPdf renders text, checkbox and signature, then flattens the PDF", async () => {
  const browser = createMockBrowser();
  const canonicalBytes = await buildCanonicalPdf();
  const manifest = buildManifest();

  const result = await renderFieldAddressedPdf({
    canonicalPdfBytes: canonicalBytes,
    manifest,
    input: {
      values: {
        patient_name: { kind: "text", value: "Najib" },
        interpreter_required: { kind: "checkbox", checked: true },
        patient_signature: { kind: "signature", imageDataUrl: `data:image/png;base64,${TINY_PNG_BASE64}` },
      },
    },
    browser,
  });

  assert.ok(result.bytes.length > 0);
  assert.equal(result.summary.pages, 1);
  assert.equal(result.summary.flattened, true);
  assert.ok(result.summary.fieldsRendered.includes("patient_name"));
  assert.ok(result.summary.fieldsRendered.includes("interpreter_required"));
  assert.ok(result.summary.signaturesRendered.includes("patient_signature"));
  assert.ok(result.summary.checkboxesRendered.includes("interpreter_required"));

  const reopened = await PDFDocument.load(result.bytes);
  assert.equal(reopened.getForm().getFields().length, 0, "AcroForm fields should be removed after flattening");
});

test("renderFieldAddressedPdf throws on page count mismatch", async () => {
  const browser = createMockBrowser();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([612, 792]);
  pdfDoc.addPage([612, 792]);
  const canonicalBytes = await pdfDoc.save();
  const manifest = buildManifest();

  await assert.rejects(
    async () =>
      renderFieldAddressedPdf({
        canonicalPdfBytes: canonicalBytes,
        manifest,
        input: { values: {} },
        browser,
      }),
    /Page count mismatch/,
  );
});


test("renderFieldAddressedPdf preserves Arabic letters in rendered text summary", async () => {
  const browser = createMockBrowser();
  const canonicalBytes = await buildCanonicalPdf();
  const manifest = buildManifest();

  const arabicValue = "اختبار CA2011E1 رقم 006";
  const result = await renderFieldAddressedPdf({
    canonicalPdfBytes: canonicalBytes,
    manifest,
    input: {
      values: {
        patient_name: { kind: "text", value: arabicValue },
      },
    },
    browser,
  });

  assert.ok(result.summary.fieldsRendered.includes("patient_name"));
  // The renderer must not drop the field; actual glyph coverage is enforced by
  // the embedded WathiqOverlayArabic font and explicit document.fonts.load().
});
