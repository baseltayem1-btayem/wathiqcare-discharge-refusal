import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { PDFDocument } from "pdf-lib";
import { renderAcroFormFilledDraftPreview } from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { launchOverlayBrowser, renderPdfPageToPng } from "@/lib/server/imc-approved-pdf-template-engine";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
import { GOVERNED_OVERLAY_COLOR } from "@/lib/server/acroform/governed-overlay-style";

const SCALE = 2;
const OLD_OVERLAY_COLOR = "#0d2c57";

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

function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest("hex");
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
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

function countInkPixels(png: PNG, x1: number, y1: number, x2: number, y2: number): number {
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
      if (isBlueish(getPixel(png, x, y))) {
        count++;
      }
    }
  }
  return count;
}

function isBlueish(pixel: { r: number; g: number; b: number; a: number }): boolean {
  if (pixel.a <= 30) return false;
  // Overlay text/signature is rendered in #0066FF. Anti-aliased edge pixels
  // still have blue as the dominant channel.
  if (pixel.b < 70) return false;
  if (pixel.b <= pixel.r + 5 && pixel.b <= pixel.g + 5) return false;
  return true;
}

type TestContext = {
  result: Awaited<ReturnType<typeof renderAcroFormFilledDraftPreview>>;
  pages: PNG[];
  sourcePages: PNG[];
};

async function generateSignatureDataUrl(browser: Awaited<ReturnType<typeof launchOverlayBrowser>>): Promise<string> {
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

let shared: TestContext | null = null;

async function getSharedContext(): Promise<TestContext> {
  if (shared) return shared;

  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadPdfBytes();
    const canonicalPdfHash = sha256Hex(pdfBytes);
    const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");
    const physicianSignatureDataUrl = await generateSignatureDataUrl(browser);

    const result = await renderAcroFormFilledDraftPreview({
      request: {
        formId: "imc-approved-amputation",
        approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
        manifestHash: diagnostics.manifestHash ?? "",
        doctorCompletionValues: {
          condition_description_en: "TEST CONDITION 001",
          condition_description_ar: "اختبار الحالة المرضية رقم 001",
          proposed_procedure_en: "TEST PROCEDURE SITE 002",
          proposed_procedure_ar: "اختبار موضع الإجراء رقم 002",
          significant_risks_options_en: "TEST SIGNIFICANT RISK 003",
          significant_risks_options_ar: "اختبار المخاطر المهمة رقم 003",
          significant_risks_options_cont_en: "TEST SIGNIFICANT RISK CONTINUATION 003",
          significant_risks_options_cont_ar: "اختبار تكملة المخاطر المهمة رقم 003",
          risks_without_procedure_en: "TEST NO PROCEDURE RISK 004",
          risks_without_procedure_ar: "اختبار مخاطر عدم الإجراء رقم 004",
          anaesthetic_discussed_en: "TEST GENERAL ANAESTHESIA 005",
          anaesthetic_discussed_ar: "اختبار التخدير العام رقم 005",
          physician_name: "BASEL TAYEM",
          physician_designation: "Legal Medical Consultant / مستشار طبي قانوني",
          interpreter_required: "false",
          interpreter_present: "false",
          anesthesia_applies: "false",
          education_amputation_sheet_provided: "true",
        },
        patientDisplay: {
          name: "PILOT TEST — Asma Matar Alzahrani",
          mrn: "TEST-MRN-006",
          dob: "24/07/1990",
        },
        physicianContext: {
          name: "BASEL TAYEM",
          designation: "Legal Medical Consultant",
        },
        physicianSignatureDataUrl,
        encounterReference: { id: "enc-vis-001", encounterId: "ENC-VIS-001" },
        correlationId: "corr-vis-001",
      },
      browser,
      canonicalPdfBytes: pdfBytes,
      canonicalPdfHash,
    });

    const [pages, sourcePages] = await Promise.all([
      renderAllPages(result.bytes),
      renderAllPages(pdfBytes),
    ]);

    shared = { result, pages, sourcePages };
    return shared;
  } finally {
    await browser.close();
  }
}

test("governed overlay color is exactly #0066FF and opacity is 1", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];
  const enRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_en")!
    .widgets.find((w) => w.page === 1)!.rect;
  const left = Math.round(enRect[0] * SCALE);
  const top = Math.round((792 - enRect[3]) * SCALE);
  const width = Math.round((enRect[2] - enRect[0]) * SCALE);
  const height = Math.round((enRect[3] - enRect[1]) * SCALE);

  const target = parseHexColor(GOVERNED_OVERLAY_COLOR);
  let exactMatchCount = 0;
  let nonWhiteCount = 0;
  let nonBlueCount = 0;

  // Sample the upper two-thirds of the box to avoid printed underlines that
  // sit below the governed value.
  const sampleBottom = top + Math.floor(height * 0.65);

  for (let y = top + 2; y < sampleBottom; y++) {
    for (let x = left + 2; x < left + width - 2; x++) {
      const pixel = getPixel(page1, x, y);
      if (pixel.a <= 30) continue;
      if (pixel.r > 250 && pixel.g > 250 && pixel.b > 250) continue;

      nonWhiteCount++;
      if (pixel.r === target.r && pixel.g === target.g && pixel.b === target.b) {
        exactMatchCount++;
      }
      if (!isBlueish(pixel)) nonBlueCount++;
    }
  }

  assert.ok(nonWhiteCount > 50, `Expected ink pixels in condition_description_en, found ${nonWhiteCount}`);
  assert.ok(
    exactMatchCount > 0,
    `Expected at least some exact #0066FF pixels in condition_description_en`,
  );
  assert.ok(
    nonBlueCount / nonWhiteCount < 0.15,
    `Expected no meaningful non-blue pixels, found ${nonBlueCount}/${nonWhiteCount}`,
  );

  for (let y = top + 2; y < sampleBottom; y++) {
    for (let x = left + 2; x < left + width - 2; x++) {
      const pixel = getPixel(page1, x, y);
      if (isBlueish(pixel)) {
        assert.equal(pixel.a, 255, "Governed overlay pixels must be fully opaque");
      }
    }
  }
});

test("Arabic and English overlays use the same blue", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];

  const enRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_en")!
    .widgets.find((w) => w.page === 1)!.rect;
  const arRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_ar")!
    .widgets.find((w) => w.page === 1)!.rect;

  const enBlue = countBluePixels(
    page1,
    Math.round(enRect[0] * SCALE) + 2,
    Math.round((792 - enRect[3]) * SCALE) + 2,
    Math.round(enRect[2] * SCALE) - 2,
    Math.round((792 - enRect[1]) * SCALE) - 2,
  );
  const arBlue = countBluePixels(
    page1,
    Math.round(arRect[0] * SCALE) + 2,
    Math.round((792 - arRect[3]) * SCALE) + 2,
    Math.round(arRect[2] * SCALE) - 2,
    Math.round((792 - arRect[1]) * SCALE) - 2,
  );

  assert.ok(enBlue > 50, `Expected English blue pixels, found ${enBlue}`);
  assert.ok(arBlue > 50, `Expected Arabic blue pixels, found ${arBlue}`);
});

test("physician signature is blue and patient signature remains blank", async () => {
  const { pages } = await getSharedContext();
  const page5 = pages[4];
  const page4 = pages[3];

  const physicianSigEn = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_signature_en")!
    .widgets.find((w) => w.page === 5)!.rect;
  const patientSigEn = amputationManifest.fields
    .find((f) => f.name === "patient_signature_en")!
    .widgets.find((w) => w.page === 4)!.rect;

  const physBlue = countBluePixels(
    page5,
    Math.round(physicianSigEn[0] * SCALE) + 2,
    Math.round((792 - physicianSigEn[3]) * SCALE) + 2,
    Math.round(physicianSigEn[2] * SCALE) - 2,
    Math.round((792 - physicianSigEn[1]) * SCALE) - 2,
  );
  assert.ok(physBlue > 20, `Expected blue physician signature pixels, found ${physBlue}`);

  const patientBlue = countBluePixels(
    page4,
    Math.round(patientSigEn[0] * SCALE) + 2,
    Math.round((792 - patientSigEn[3]) * SCALE) + 2,
    Math.round(patientSigEn[2] * SCALE) - 2,
    Math.round((792 - patientSigEn[1]) * SCALE) - 2,
  );
  assert.equal(patientBlue, 0, "Patient signature must remain blank in filled preview");
});

test("no old grey-blue overlay remains", async () => {
  const { pages } = await getSharedContext();
  const oldColor = parseHexColor(OLD_OVERLAY_COLOR);

  const fieldNames = new Set<string>([
    "patient_name",
    "mrn",
    "date_of_birth",
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
    "consent_patient_name",
    "doctor_delegate_name",
    "doctor_delegate_designation",
  ]);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const png = pages[pageIndex];
    let oldColorCount = 0;

    for (const field of amputationManifest.fields) {
      if (!fieldNames.has(field.name)) continue;
      for (const widget of field.widgets) {
        if (widget.page !== pageIndex + 1) continue;
        const left = Math.round(widget.rect[0] * SCALE);
        const top = Math.round((792 - widget.rect[3]) * SCALE);
        const right = Math.round(widget.rect[2] * SCALE);
        const bottom = Math.round((792 - widget.rect[1]) * SCALE);

        for (let y = top + 1; y < bottom - 1; y++) {
          for (let x = left + 1; x < right - 1; x++) {
            const pixel = getPixel(png, x, y);
            if (pixel.a <= 30 || isBlueish(pixel)) continue;
            if (colorDistance(pixel, oldColor) < 12) {
              oldColorCount++;
            }
          }
        }
      }
    }

    assert.ok(
      oldColorCount <= 3,
      `No old grey-blue overlay may remain on page ${pageIndex + 1} (found ${oldColorCount})`,
    );
  }
});

test("page 5 name, designation, and signature regions do not overlap", async () => {
  const { pages } = await getSharedContext();
  const page5 = pages[4];

  const nameRect = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_name")!
    .widgets.find((w) => w.page === 5 && w.rect[0] < 200)!.rect;
  const designationRect = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_designation")!
    .widgets.find((w) => w.page === 5 && w.rect[0] < 200)!.rect;
  const signatureRect = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_signature_en")!
    .widgets.find((w) => w.page === 5)!.rect;

  function rectsOverlap(a: number[], b: number[]): boolean {
    return !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
  }

  assert.ok(!rectsOverlap(nameRect, designationRect), "Name and designation must not overlap");
  assert.ok(!rectsOverlap(designationRect, signatureRect), "Designation and signature must not overlap");
  assert.ok(!rectsOverlap(nameRect, signatureRect), "Name and signature must not overlap");

  for (const rect of [nameRect, designationRect, signatureRect]) {
    const blue = countBluePixels(
      page5,
      Math.round(rect[0] * SCALE) + 2,
      Math.round((792 - rect[3]) * SCALE) + 2,
      Math.round(rect[2] * SCALE) - 2,
      Math.round((792 - rect[1]) * SCALE) - 2,
    );
    assert.ok(blue > 10, `Expected blue ink in region ${rect.join(",")}, found ${blue}`);
  }
});

test("Arabic fields are right-aligned and English fields are left-aligned", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];

  const enRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_en")!
    .widgets.find((w) => w.page === 1)!.rect;
  const arRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_ar")!
    .widgets.find((w) => w.page === 1)!.rect;

  const enLeft = Math.round(enRect[0] * SCALE);
  const enTop = Math.round((792 - enRect[3]) * SCALE);
  const enWidth = Math.round((enRect[2] - enRect[0]) * SCALE);
  const enHeight = Math.round((enRect[3] - enRect[1]) * SCALE);
  const enLeftInk = countBluePixels(page1, enLeft + 2, enTop + 2, enLeft + Math.round(enWidth * 0.25), enTop + enHeight - 2);
  const enRightInk = countBluePixels(page1, enLeft + Math.round(enWidth * 0.75), enTop + 2, enLeft + enWidth - 2, enTop + enHeight - 2);

  const arLeft = Math.round(arRect[0] * SCALE);
  const arTop = Math.round((792 - arRect[3]) * SCALE);
  const arWidth = Math.round((arRect[2] - arRect[0]) * SCALE);
  const arHeight = Math.round((arRect[3] - arRect[1]) * SCALE);
  const arLeftInk = countBluePixels(page1, arLeft + 2, arTop + 2, arLeft + Math.round(arWidth * 0.25), arTop + arHeight - 2);
  const arRightInk = countBluePixels(page1, arLeft + Math.round(arWidth * 0.75), arTop + 2, arLeft + arWidth - 2, arTop + arHeight - 2);

  assert.ok(enLeftInk > enRightInk, "English field should have more ink on the left");
  assert.ok(arRightInk > arLeftInk, "Arabic field should have more ink on the right");
});

test("approved source pixels remain unchanged outside governed overlays", async () => {
  const { sourcePages, pages } = await getSharedContext();
  const source = sourcePages[0];
  const rendered = pages[0];
  const region = { x1: 20, y1: 20, x2: 180, y2: 120 };

  let diffCount = 0;
  for (let y = region.y1 * SCALE; y < region.y2 * SCALE; y++) {
    for (let x = region.x1 * SCALE; x < region.x2 * SCALE; x++) {
      const s = getPixel(source, x, y);
      const r = getPixel(rendered, x, y);
      if (colorDistance(s, r) > 8 || Math.abs(s.a - r.a) > 8) {
        diffCount++;
      }
    }
  }

  assert.equal(diffCount, 0, `Source logo region must be unchanged, found ${diffCount} differing pixels`);
});

test("rendered PDF has exactly five pages and physician date/time remain blank", async () => {
  const { result, pages } = await getSharedContext();
  assert.equal(result.summary.pages, 5);
  assert.equal(pages.length, 5);

  const page5 = pages[4];
  const dateRect = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_date")!
    .widgets.find((w) => w.page === 5 && w.rect[0] < 200)!.rect;
  const timeRect = amputationManifest.fields
    .find((f) => f.name === "doctor_delegate_time")!
    .widgets.find((w) => w.page === 5 && w.rect[0] < 300)!.rect;

  const dateBlue = countBluePixels(
    page5,
    Math.round(dateRect[0] * SCALE) + 1,
    Math.round((792 - dateRect[3]) * SCALE) + 1,
    Math.round(dateRect[2] * SCALE) - 1,
    Math.round((792 - dateRect[1]) * SCALE) - 1,
  );
  const timeBlue = countBluePixels(
    page5,
    Math.round(timeRect[0] * SCALE) + 1,
    Math.round((792 - timeRect[3]) * SCALE) + 1,
    Math.round(timeRect[2] * SCALE) - 1,
    Math.round((792 - timeRect[1]) * SCALE) - 1,
  );

  assert.equal(dateBlue, 0, "Physician date must remain blank in preview");
  assert.equal(timeBlue, 0, "Physician time must remain blank in preview");
});

test("deterministic Arabic glyph rendering remains operational", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];
  const arRect = amputationManifest.fields
    .find((f) => f.name === "condition_description_ar")!
    .widgets.find((w) => w.page === 1)!.rect;

  const left = Math.round(arRect[0] * SCALE);
  const top = Math.round((792 - arRect[3]) * SCALE);
  const width = Math.round((arRect[2] - arRect[0]) * SCALE);
  const height = Math.round((arRect[3] - arRect[1]) * SCALE);

  const rightRegionInk = countInkPixels(
    page1,
    left + Math.round(width * 0.55),
    top + 4,
    left + width - 4,
    top + height - 4,
  );
  const leftRegionInk = countInkPixels(
    page1,
    left + 4,
    top + 4,
    left + Math.round(width * 0.35),
    top + height - 4,
  );

  assert.ok(rightRegionInk > 50, `Expected Arabic glyphs on right side, found ${rightRegionInk}`);
  assert.ok(leftRegionInk > 50, `Expected mixed value ink on left side, found ${leftRegionInk}`);
});

test("rendered pixels remain within mapped field rectangles", async () => {
  const { result, pages } = await getSharedContext();

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const png = pages[pageIndex];
    const renderedFieldNames = new Set(result.summary.fieldsRendered);

    for (const field of amputationManifest.fields) {
      if (!renderedFieldNames.has(field.name)) continue;
      if (field.type === "/Sig") continue;

      for (const widget of field.widgets) {
        if (widget.page !== pageIndex + 1) continue;
        const left = Math.round(widget.rect[0] * SCALE) - 1;
        const top = Math.round((792 - widget.rect[3]) * SCALE) - 1;
        const right = Math.round(widget.rect[2] * SCALE) + 1;
        const bottom = Math.round((792 - widget.rect[1]) * SCALE) + 1;

        let outsideBlue = 0;
        for (let y = Math.max(0, top - 4); y < Math.min(png.height, bottom + 4); y++) {
          for (let x = Math.max(0, left - 4); x < Math.min(png.width, right + 4); x++) {
            if (x >= left && x < right && y >= top && y < bottom) continue;
            if (isBlueish(getPixel(png, x, y))) {
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

test("governed constants are centralized and exported", () => {
  assert.equal(GOVERNED_OVERLAY_COLOR, "#0066FF");
});
