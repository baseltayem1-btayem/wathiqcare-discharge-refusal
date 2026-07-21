import assert from "node:assert/strict";
import test from "node:test";
import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFString,
  PDFAcroCheckBox,
  PDFAcroSignature,
  PDFAcroText,
  PDFWidgetAnnotation,
} from "pdf-lib";
import type { PDFPage } from "pdf-lib";
import {
  importAcroFormTemplate,
  AcroFormImportError,
} from "@/lib/server/acroform/acroform-template-import-service";

type Rect = { x: number; y: number; width: number; height: number };

function addTerminalFieldToPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  name: string,
  rect: Rect,
  options: {
    fieldType: "Tx" | "Btn" | "Sig";
    flags?: number;
  },
): void {
  const context = pdfDoc.context;
  const fieldDict = context.obj({
    FT: options.fieldType,
    T: PDFString.of(name),
    Kids: [],
    Ff: options.flags ?? 0,
  });
  const fieldRef = context.register(fieldDict);

  const acroField =
    options.fieldType === "Tx"
      ? PDFAcroText.fromDict(fieldDict, fieldRef)
      : options.fieldType === "Btn"
        ? PDFAcroCheckBox.fromDict(fieldDict, fieldRef)
        : PDFAcroSignature.fromDict(fieldDict, fieldRef);

  const widget = PDFWidgetAnnotation.create(context, fieldRef);
  widget.setRectangle(rect);
  widget.setP(page.ref);
  const widgetRef = context.register(widget.dict);
  acroField.addWidget(widgetRef);

  const existingAnnots = page.node.lookup(PDFName.of("Annots"));
  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(widgetRef);
  } else {
    page.node.set(PDFName.of("Annots"), context.obj([widgetRef]));
  }

  pdfDoc.getForm().acroForm.addField(fieldRef);
}

async function buildTestAcroFormPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);

  addTerminalFieldToPage(pdfDoc, page, "patient_name", { x: 100, y: 700, width: 150, height: 20 }, { fieldType: "Tx" });
  addTerminalFieldToPage(pdfDoc, page, "interpreter_required", { x: 100, y: 650, width: 12, height: 12 }, { fieldType: "Btn" });
  addTerminalFieldToPage(pdfDoc, page, "patient_signature", { x: 100, y: 600, width: 150, height: 30 }, { fieldType: "Sig" });

  return pdfDoc.save();
}

test("importAcroFormTemplate produces a verified manifest from a clean AcroForm PDF", async () => {
  const artifactBytes = await buildTestAcroFormPdf();

  const result = await importAcroFormTemplate({
    authoringArtifactBytes: artifactBytes,
    templateCode: "IMC TEST",
    templateVersion: "1.0",
    titleEn: "Test Consent",
    titleAr: "نموذج اختبار",
  });

  assert.equal(result.manifest.templateCode, "IMC TEST");
  assert.equal(result.manifest.fields.length, 3);
  assert.equal(result.manifest.fieldCounts.total, 3);
  assert.equal(result.manifest.fieldCounts.text, 1);
  assert.equal(result.manifest.fieldCounts.button, 1);
  assert.equal(result.manifest.fieldCounts.signature, 1);
  assert.equal(result.manifest.status, "VERIFIED");
  assert.equal(result.securityReport.hasXfa, false);
  assert.equal(result.securityReport.hasAttachments, false);
  assert.ok(result.manifest.manifestHash.length > 0);
});

test("importAcroFormTemplate validates against canonical approved PDF", async () => {
  const artifactBytes = await buildTestAcroFormPdf();
  const wrongSizeDoc = await PDFDocument.create();
  wrongSizeDoc.addPage([500, 700]);
  const canonicalBytes = await wrongSizeDoc.save();

  await assert.rejects(
    async () =>
      importAcroFormTemplate({
        authoringArtifactBytes: artifactBytes,
        canonicalApprovedPdfBytes: canonicalBytes,
        templateCode: "IMC TEST",
        templateVersion: "1.0",
        titleEn: "Test Consent",
        titleAr: "نموذج اختبار",
      }),
    (error) => {
      assert.ok(error instanceof AcroFormImportError);
      assert.equal((error as AcroFormImportError).code, "PAGE_SIZE_MISMATCH");
      return true;
    },
  );
});

test("importAcroFormTemplate rejects non-empty values by default", async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);

  addTerminalFieldToPage(pdfDoc, page, "patient_name", { x: 100, y: 700, width: 150, height: 20 }, { fieldType: "Tx" });
  addTerminalFieldToPage(pdfDoc, page, "patient_signature", { x: 100, y: 600, width: 150, height: 30 }, { fieldType: "Sig" });

  const textField = pdfDoc.getForm().getTextField("patient_name");
  textField.setText("Najib");

  const artifactBytes = await pdfDoc.save();

  await assert.rejects(
    async () =>
      importAcroFormTemplate({
        authoringArtifactBytes: artifactBytes,
        templateCode: "IMC TEST",
        templateVersion: "1.0",
        titleEn: "Test Consent",
        titleAr: "نموذج اختبار",
      }),
    (error) => {
      assert.ok(error instanceof AcroFormImportError);
      assert.equal((error as AcroFormImportError).code, "NON_EMPTY_VALUES");
      return true;
    },
  );
});

test("importAcroFormTemplate accepts expected manifest when fields match", async () => {
  const artifactBytes = await buildTestAcroFormPdf();

  const expectedManifest = {
    templateCode: "IMC TEST",
    templateVersion: "1.0",
    titleEn: "Test Consent",
    titleAr: "نموذج اختبار",
    acroFormAuthoringArtifact: {
      pageCount: 1,
      pageSizePoints: { width: 612, height: 792 },
    },
    canonicalApprovedPdf: {
      pageCount: 1,
      pageSizePoints: { width: 612, height: 792 },
    },
    fieldCounts: {
      total: 3,
      text: 1,
      button: 1,
      signature: 1,
    },
    fields: [
      { name: "patient_name", type: "/Tx", flags: 0, widgets: [{ page: 1, rect: [100, 700, 250, 720], appearanceStates: null }] },
      { name: "interpreter_required", type: "/Btn", flags: 0, widgets: [{ page: 1, rect: [100, 650, 112, 662], appearanceStates: ["/Yes", "/Off"] }] },
      { name: "patient_signature", type: "/Sig", flags: 0, widgets: [{ page: 1, rect: [100, 600, 250, 630], appearanceStates: null }] },
    ],
  };

  const result = await importAcroFormTemplate({
    authoringArtifactBytes: artifactBytes,
    templateCode: "IMC TEST",
    templateVersion: "1.0",
    titleEn: "Test Consent",
    titleAr: "نموذج اختبار",
    options: { expectedManifest },
  });

  assert.equal(result.manifest.fields.length, 3);
});
