/**
 * MR1135 deterministic runtime field-binding regression test.
 *
 * This test verifies that the explicit, manifest-driven bindings for IMC MR 1135
 * Amputation place the physician-entered condition and procedure exactly inside
 * their mapped page-1 rectangles, place the physician signature ink only on
 * page 5, keep patient headers present on every page, and do not spill into
 * protected source regions such as Section A headings or body copy.
 */

import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import { PNG } from "pngjs";
import { PDFDocument } from "pdf-lib";
import { renderAcroFormFilledDraftPreview } from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { launchOverlayBrowser, renderPdfPageToPng } from "@/lib/server/imc-approved-pdf-template-engine";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";

const SCALE = 2;

const CONDITION_TEXT =
  "The patient has a severe infection and poor blood circulation in the left lower leg, causing persistent pain and a non-healing wound.";

const PROCEDURE_TEXT =
  "Left below-knee amputation, including removal of non-viable tissue and wound closure as clinically indicated.";

const pdfCandidates = [
  path.join(process.cwd(), "public", "approved-consent-forms", "amputation.pdf"),
  path.join(process.cwd(), "apps", "web", "public", "approved-consent-forms", "amputation.pdf"),
];

function loadPdfBytes(): Uint8Array {
  for (const candidate of pdfCandidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Canonical amputation PDF not found");
}

function getPixel(png: PNG, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const idx = (png.width * y + x) * 4;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
}

function countInkPixels(
  png: PNG,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  let count = 0;
  for (let y = Math.max(0, y1); y < Math.min(png.height, y2); y++) {
    for (let x = Math.max(0, x1); x < Math.min(png.width, x2); x++) {
      const pixel = getPixel(png, x, y);
      if (pixel.a > 30 && (pixel.r < 250 || pixel.g < 250 || pixel.b < 250)) {
        count++;
      }
    }
  }
  return count;
}

function countBluePixels(
  png: PNG,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  let count = 0;
  for (let y = Math.max(0, y1); y < Math.min(png.height, y2); y++) {
    for (let x = Math.max(0, x1); x < Math.min(png.width, x2); x++) {
      const pixel = getPixel(png, x, y);
      if (pixel.a <= 30) continue;
      if (pixel.b < 70) continue;
      if (pixel.b <= pixel.r + 5 && pixel.b <= pixel.g + 5) continue;
      count++;
    }
  }
  return count;
}

function widgetToPixelRect(widgetRect: number[]): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: Math.round(widgetRect[0] * SCALE),
    top: Math.round((792 - widgetRect[3]) * SCALE),
    right: Math.round(widgetRect[2] * SCALE),
    bottom: Math.round((792 - widgetRect[1]) * SCALE),
  };
}

function rectsOverlap(a: number[], b: number[]): boolean {
  return !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
}

async function generateSyntheticSignatureDataUrl(
  browser: Awaited<ReturnType<typeof launchOverlayBrowser>>,
): Promise<string> {
  const page = await browser.newPage();
  try {
    return await page.evaluate(() => {
      const width = 300;
      const height = 80;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(20, 55);
      ctx.bezierCurveTo(70, 25, 110, 70, 170, 40);
      ctx.bezierCurveTo(210, 20, 250, 60, 280, 45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, 45);
      ctx.quadraticCurveTo(90, 65, 140, 35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(60, 50);
      ctx.lineTo(120, 60);
      ctx.lineTo(180, 30);
      ctx.stroke();
      return canvas.toDataURL("image/png");
    });
  } finally {
    await page.close();
  }
}

async function renderAllPages(bytes: Uint8Array): Promise<PNG[]> {
  const pages: PNG[] = [];
  const pdfDoc = await PDFDocument.load(bytes);
  for (let i = 0; i < pdfDoc.getPages().length; i++) {
    const pngBytes = await renderPdfPageToPng({ pdfBytes: bytes, pageIndex: i, scale: SCALE });
    pages.push(PNG.sync.read(Buffer.from(pngBytes)));
  }
  return pages;
}

async function buildRegressionContext(): Promise<{
  result: Awaited<ReturnType<typeof renderAcroFormFilledDraftPreview>>;
  pages: PNG[];
}> {
  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadPdfBytes();
    const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");
    const physicianSignatureDataUrl = await generateSyntheticSignatureDataUrl(browser);

    const result = await renderAcroFormFilledDraftPreview({
      request: {
        formId: "imc-approved-amputation",
        approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
        manifestHash: diagnostics.manifestHash ?? "",
        doctorCompletionValues: {
          condition_description_en: CONDITION_TEXT,
          condition_description_ar: "",
          proposed_procedure_en: PROCEDURE_TEXT,
          proposed_procedure_ar: "",
          significant_risks_options_en: "Infection, bleeding, phantom limb pain, delayed wound healing.",
          significant_risks_options_ar: "",
          significant_risks_options_cont_en: "",
          significant_risks_options_cont_ar: "",
          risks_without_procedure_en: "Progressive sepsis, gangrene, and life-threatening infection.",
          risks_without_procedure_ar: "",
          anaesthetic_discussed_en: "General anaesthesia with postoperative pain control discussed.",
          anaesthetic_discussed_ar: "",
          physician_name: "Dr. Basel Tayem",
          physician_designation: "Legal Medical Consultant / مستشار طبي قانوني",
          interpreter_required: "false",
          interpreter_present: "false",
          anesthesia_applies: "false",
          education_amputation_sheet_provided: "true",
        },
        patientDisplay: {
          name: "Asma Matar Alzahrani",
          mrn: "MRN-REG-001",
          dob: "24/07/1990",
        },
        physicianContext: {
          name: "Dr. Basel Tayem",
          designation: "Legal Medical Consultant",
          designationEn: "Legal Medical Consultant",
          designationAr: "مستشار طبي قانوني",
        },
        physicianSignatureDataUrl,
        encounterReference: { id: "enc-reg-001", encounterId: "ENC-REG-001" },
        correlationId: "corr-reg-001",
      },
      browser,
      canonicalPdfBytes: pdfBytes,
      canonicalPdfHash: diagnostics.canonicalApprovedPdf?.sha256 ?? "",
    });

    const pages = await renderAllPages(result.bytes);
    return { result, pages };
  } finally {
    await browser.close();
  }
}

test("rendered PDF has exactly five pages", async () => {
  const { result, pages } = await buildRegressionContext();
  assert.equal(result.summary.pages, 5);
  assert.equal(pages.length, 5);
});

test("condition text appears only in the page-1 condition rectangle", async () => {
  const { pages } = await buildRegressionContext();
  const page1 = pages[0];
  const conditionField = amputationManifest.fields.find((f) => f.name === "condition_description_en")!;
  const conditionRect = widgetToPixelRect(conditionField.widgets.find((w) => w.page === 1)!.rect);

  const insideInk = countInkPixels(
    page1,
    conditionRect.left + 2,
    conditionRect.top + 2,
    conditionRect.right - 2,
    conditionRect.bottom - 2,
  );
  assert.ok(insideInk > 100, `Expected condition ink inside mapped rectangle, found ${insideInk}`);

  const protectedRegions = [
    { name: "page header", rect: [0, 760, 612, 792] },
    { name: "Section A heading", rect: [20, 650, 592, 720] },
    { name: "page footer", rect: [360, 0, 612, 40] },
  ];

  for (const region of protectedRegions) {
    assert.ok(
      !rectsOverlap(conditionField.widgets.find((w) => w.page === 1)!.rect, region.rect),
      `Condition rectangle must not overlap ${region.name}`,
    );
  }
});

test("procedure text appears only in the page-1 procedure rectangle", async () => {
  const { pages } = await buildRegressionContext();
  const page1 = pages[0];
  const procedureField = amputationManifest.fields.find((f) => f.name === "proposed_procedure_en")!;
  const procedureRect = widgetToPixelRect(procedureField.widgets.find((w) => w.page === 1)!.rect);

  const insideInk = countInkPixels(
    page1,
    procedureRect.left + 2,
    procedureRect.top + 2,
    procedureRect.right - 2,
    procedureRect.bottom - 2,
  );
  assert.ok(insideInk > 100, `Expected procedure ink inside mapped rectangle, found ${insideInk}`);

  const protectedRegions = [
    { name: "page header", rect: [0, 760, 612, 792] },
    { name: "Section A heading", rect: [20, 650, 592, 720] },
    { name: "condition rectangle", rect: [20, 500, 592, 650] },
    { name: "page footer", rect: [360, 0, 612, 40] },
  ];

  for (const region of protectedRegions) {
    assert.ok(
      !rectsOverlap(procedureField.widgets.find((w) => w.page === 1)!.rect, region.rect),
      `Procedure rectangle must not overlap ${region.name}`,
    );
  }
});

test("patient header fields are present on all five pages", async () => {
  const { pages } = await buildRegressionContext();
  const headerFields = ["patient_name", "mrn", "date_of_birth"];

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const png = pages[pageIndex];
    for (const fieldName of headerFields) {
      const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
      const widget = field.widgets.find((w) => w.page === pageIndex + 1);
      assert.ok(widget, `Expected ${fieldName} widget on page ${pageIndex + 1}`);
      const rect = widgetToPixelRect(widget.rect);
      const ink = countBluePixels(
        png,
        rect.left + 2,
        rect.top + 2,
        rect.right - 2,
        rect.bottom - 2,
      );
      assert.ok(ink > 10, `Expected ${fieldName} ink on page ${pageIndex + 1}, found ${ink}`);
    }
  }
});

test("physician name, designation and signature appear only on page 5", async () => {
  const { pages } = await buildRegressionContext();
  const fieldNames = [
    "doctor_delegate_name",
    "doctor_delegate_designation",
    "doctor_delegate_signature_en",
  ];

  for (const fieldName of fieldNames) {
    const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
    for (const widget of field.widgets) {
      assert.equal(
        widget.page,
        5,
        `Field ${fieldName} must only have widgets on page 5, found page ${widget.page}`,
      );
    }
  }

  const page5 = pages[4];
  for (const fieldName of fieldNames) {
    const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
    const widget = field.widgets.find((w) => w.page === 5)!;
    const rect = widgetToPixelRect(widget.rect);
    const ink = countBluePixels(page5, rect.left + 2, rect.top + 2, rect.right - 2, rect.bottom - 2);
    assert.ok(ink > 10, `Expected ${fieldName} ink on page 5, found ${ink}`);
  }
});

test("no physician signature ink appears on pages 1-4", async () => {
  const { pages } = await buildRegressionContext();
  const sigField = amputationManifest.fields.find((f) => f.name === "doctor_delegate_signature_en")!;
  const sigWidget = sigField.widgets.find((w) => w.page === 5)!;
  const sigRect = widgetToPixelRect(sigWidget.rect);

  // The physician signature widget only exists on page 5. The same spatial
  // region on pages 1-4 must not contain signature-like blue ink.
  for (let pageIndex = 0; pageIndex < 4; pageIndex++) {
    const png = pages[pageIndex];
    const blueInk = countBluePixels(
      png,
      sigRect.left,
      sigRect.top,
      sigRect.right,
      sigRect.bottom,
    );
    assert.equal(
      blueInk,
      0,
      `Page ${pageIndex + 1} must not contain physician signature ink in the signature region`,
    );
  }
});

test("no governed overlay spills outside mapped field rectangles", async () => {
  const { result, pages } = await buildRegressionContext();
  const renderedFieldNames = new Set(result.summary.fieldsRendered);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const png = pages[pageIndex];
    for (const field of amputationManifest.fields) {
      if (!renderedFieldNames.has(field.name)) continue;
      if (field.type === "/Sig") continue;

      for (const widget of field.widgets) {
        if (widget.page !== pageIndex + 1) continue;
        const rect = widgetToPixelRect(widget.rect);
        let outsideBlue = 0;
        for (let y = Math.max(0, rect.top - 4); y < Math.min(png.height, rect.bottom + 4); y++) {
          for (let x = Math.max(0, rect.left - 4); x < Math.min(png.width, rect.right + 4); x++) {
            if (x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom) continue;
            const pixel = getPixel(png, x, y);
            if (pixel.b >= 70 && (pixel.b > pixel.r + 5 || pixel.b > pixel.g + 5)) {
              outsideBlue++;
            }
          }
        }
        assert.ok(
          outsideBlue < 10,
          `Field ${field.name} on page ${pageIndex + 1} has ${outsideBlue} blue pixels outside its mapped rectangle`,
        );
      }
    }
  }
});

test("manifest fields do not overlap protected source regions", () => {
  const protectedRegions = [
    { name: "logo/header", rect: [20, 720, 180, 792] },
    { name: "page footer", rect: [360, 0, 612, 40] },
  ];

  for (const field of amputationManifest.fields) {
    for (const widget of field.widgets) {
      for (const region of protectedRegions) {
        assert.ok(
          !rectsOverlap(widget.rect, region.rect),
          `Field ${field.name} page ${widget.page} rectangle ${widget.rect.join(",")} overlaps ${region.name} ${region.rect.join(",")}`,
        );
      }
    }
  }
});
