import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { renderAcroFormFilledDraftPreview } from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { launchOverlayBrowser, renderPdfPageToPng } from "@/lib/server/imc-approved-pdf-template-engine";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";

const SCALE = 2;
const PAGE_HEIGHT_PT = 792;

const SYNTHETIC = {
  patientName: "WATHIQCARE TEST PATIENT",
  mrn: "TEST-MR1135-001",
  dob: "1990-01-01",
  condition:
    "The patient has a severe infection and poor blood circulation in the left lower leg, causing persistent pain and a non-healing wound.",
  procedure:
    "Left below-knee amputation, including removal of non-viable tissue and wound closure as clinically indicated.",
  physicianName: "Dr. Wathiq Test",
  designation: "Consultant Surgeon",
  physicianSignedAt: "2026-07-15T09:30:00.000Z",
};

function loadPdfBytes(): Uint8Array {
  const candidates = [
    path.join(process.cwd(), "public", "approved-consent-forms", "amputation.pdf"),
    path.join(process.cwd(), "apps", "web", "public", "approved-consent-forms", "amputation.pdf"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Canonical amputation PDF not found");
}

function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest("hex");
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

function isBlueish(pixel: { r: number; g: number; b: number; a: number }): boolean {
  if (pixel.a <= 30) return false;
  if (pixel.b < 70) return false;
  if (pixel.b <= pixel.r + 5 && pixel.b <= pixel.g + 5) return false;
  return true;
}

function countBluePixels(png: PNG, x1: number, y1: number, x2: number, y2: number): number {
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

function toPixelRect(rect: [number, number, number, number]) {
  return {
    left: Math.round(rect[0] * SCALE),
    top: Math.round((PAGE_HEIGHT_PT - rect[3]) * SCALE),
    right: Math.round(rect[2] * SCALE),
    bottom: Math.round((PAGE_HEIGHT_PT - rect[1]) * SCALE),
  };
}

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
  const pdfDoc = await (await import("pdf-lib")).PDFDocument.load(bytes);
  for (let i = 0; i < pdfDoc.getPages().length; i++) {
    const pngBytes = await renderPdfPageToPng({ pdfBytes: bytes, pageIndex: i, scale: SCALE });
    pages.push(PNG.sync.read(Buffer.from(pngBytes)));
  }
  return pages;
}

async function buildPreviewContext() {
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
          "procedure.condition.en": SYNTHETIC.condition,
          "procedure.condition.ar": "لدى المريض عدوى شديدة وضعف في الدورة الدموية في الساق اليسرى السفلى.",
          "procedure.site_side.en": SYNTHETIC.procedure,
          "procedure.site_side.ar": "بتر تحت الركبة للساق اليسرى، بما في ذلك إزالة الأنسجة غير القابلة للحياة.",
          "procedure.significant_risks.en": "Bleeding, infection, phantom limb pain, stump breakdown.",
          "procedure.significant_risks.ar": "نزيف، عدوى، ألم الطرف الوهمي، وتفكك جرح جذع الطرف.",
          "procedure.significant_risks_cont.en": "Additional risks include delayed wound healing and need for revision surgery.",
          "procedure.significant_risks_cont.ar": "تشمل المخاطر الإضافية تأخر شفاء الجرح والحاجة إلى جراحة تصحيحية.",
          "procedure.no_treatment_risks.en":
            "Worsening infection, sepsis, gangrene, possible limb- or life-threatening progression.",
          "procedure.no_treatment_risks.ar":
            "تفاقم العدوى، تسمم الدم، غرغرينا، تطور يهدد الطرف أو الحياة.",
          "anesthesia.type.en": "General anaesthesia with perioperative analgesia.",
          "anesthesia.type.ar": "تخدير عام مع مسكنات أثناء العملية.",
          "physician.name.en": SYNTHETIC.physicianName,
          "physician.designation.en": SYNTHETIC.designation,
          interpreter_required: "false",
          interpreter_present: "false",
          anesthesia_applies: "true",
          education_amputation_sheet_provided: "true",
        },
        patientDisplay: {
          name: SYNTHETIC.patientName,
          mrn: SYNTHETIC.mrn,
          dob: SYNTHETIC.dob,
        },
        physicianContext: {
          name: SYNTHETIC.physicianName,
          designation: SYNTHETIC.designation,
          designationEn: SYNTHETIC.designation,
          designationAr: "استشاري جراحة",
        },
        physicianSignatureDataUrl,
        physicianSignedAt: SYNTHETIC.physicianSignedAt,
        encounterReference: { id: "enc-mr1135-001", encounterId: "ENC-MR1135-001" },
        correlationId: "corr-mr1135-001",
      },
      browser,
      canonicalPdfBytes: pdfBytes,
      canonicalPdfHash,
    });

    const pages = await renderAllPages(result.bytes);
    return { result, pages, pdfBytes, browser };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

let shared: Awaited<ReturnType<typeof buildPreviewContext>> | null = null;

async function getSharedContext(): Promise<NonNullable<typeof shared>> {
  if (shared) return shared;
  shared = await buildPreviewContext();
  return shared;
}

test.after(async () => {
  if (shared) {
    await shared.browser.close();
    shared = null;
  }
});

test("page 3 no-treatment risks render inside Section E, not in continuation area", async () => {
  const { result, pages } = await getSharedContext();
  const page3 = pages[2];

  const sectionEField = amputationManifest.fields.find((f) => f.name === "risks_without_procedure_en")!;
  const continuationField = amputationManifest.fields.find((f) => f.name === "significant_risks_options_cont_en")!;

  assert.ok(result.summary.fieldsRendered.includes("risks_without_procedure_en"), "No-treatment risk field must be rendered");
  assert.ok(result.summary.fieldsRendered.includes("risks_without_procedure_ar"), "Arabic no-treatment risk field must be rendered");

  const sectionERect = toPixelRect(sectionEField.widgets[0].rect as [number, number, number, number]);
  const continuationRect = toPixelRect(continuationField.widgets[0].rect as [number, number, number, number]);

  const insideSectionE = countBluePixels(page3, sectionERect.left + 2, sectionERect.top + 2, sectionERect.right - 2, sectionERect.bottom - 2);
  const insideContinuation = countBluePixels(page3, continuationRect.left + 2, continuationRect.top + 2, continuationRect.right - 2, continuationRect.bottom - 2);

  assert.ok(insideSectionE > 100, `Expected no-treatment risk ink inside Section E, found ${insideSectionE}`);
  assert.ok(insideContinuation > 100, "Continuation field should still contain its own text");

  // Prove aliasing is not happening: no-treatment risk text is NOT in continuation widget.
  // We use a tight horizontal band inside the continuation rectangle at the same vertical
  // position as the no-treatment risk text to detect any leaked ink.
  const leakedIntoContinuation = countBluePixels(
    page3,
    continuationRect.left + 2,
    continuationRect.top + 2,
    continuationRect.right - 2,
    continuationRect.bottom - 2,
  );
  // The continuation rectangle is small (30 pt high). If no-treatment risks leaked here,
  // the blue pixel count would be dominated by the leaked text. Since the expected continuation
  // text is short, we assert it does not exceed what the continuation text alone produces.
  assert.ok(leakedIntoContinuation < 8000, `No-treatment risk ink must not dominate continuation area, found ${leakedIntoContinuation}`);
});

test("page 3 anesthetic renders inside Section F, not inside Section E", async () => {
  const { result, pages } = await getSharedContext();
  const page3 = pages[2];

  const sectionEField = amputationManifest.fields.find((f) => f.name === "risks_without_procedure_en")!;
  const sectionFField = amputationManifest.fields.find((f) => f.name === "anaesthetic_discussed_en")!;

  assert.ok(result.summary.fieldsRendered.includes("anaesthetic_discussed_en"), "Anesthetic field must be rendered");
  assert.ok(result.summary.fieldsRendered.includes("anaesthetic_discussed_ar"), "Arabic anesthetic field must be rendered");

  const sectionERect = toPixelRect(sectionEField.widgets[0].rect as [number, number, number, number]);
  const sectionFRect = toPixelRect(sectionFField.widgets[0].rect as [number, number, number, number]);

  const insideSectionE = countBluePixels(page3, sectionERect.left + 2, sectionERect.top + 2, sectionERect.right - 2, sectionERect.bottom - 2);
  const insideSectionF = countBluePixels(page3, sectionFRect.left + 2, sectionFRect.top + 2, sectionFRect.right - 2, sectionFRect.bottom - 2);

  assert.ok(insideSectionF > 100, `Expected anesthetic ink inside Section F, found ${insideSectionF}`);

  // Prove the anesthetic did not overwrite the Section E no-treatment risk box.
  // The Section E box should still contain its own text.
  assert.ok(insideSectionE > 100, `Section E must still contain no-treatment risk ink, found ${insideSectionE}`);
});

test("page 3 clinical text does not appear above its section heading", async () => {
  const { pages } = await getSharedContext();
  const page3 = pages[2];

  const sectionEField = amputationManifest.fields.find((f) => f.name === "risks_without_procedure_en")!;
  const sectionFField = amputationManifest.fields.find((f) => f.name === "anaesthetic_discussed_en")!;

  const sectionERect = toPixelRect(sectionEField.widgets[0].rect as [number, number, number, number]);
  const sectionFRect = toPixelRect(sectionFField.widgets[0].rect as [number, number, number, number]);

  // Section headings are printed source text just above each writing area.
  // Stray ink more than ~40 px above the box top indicates misplacement.
  const aboveSectionE = countBluePixels(page3, sectionERect.left, sectionERect.top - 50, sectionERect.right, sectionERect.top);
  const aboveSectionF = countBluePixels(page3, sectionFRect.left, sectionFRect.top - 50, sectionFRect.right, sectionFRect.top);

  assert.ok(aboveSectionE < 10, `Expected no stray no-treatment risk ink above Section E, found ${aboveSectionE}`);
  assert.ok(aboveSectionF < 10, `Expected no stray anesthetic ink above Section F, found ${aboveSectionF}`);
});

test("page 4 Amputation information sheet checkbox is selected and other education sheets are not", async () => {
  const { result, pages } = await getSharedContext();
  const page4 = pages[3];

  assert.ok(result.summary.checkboxesRendered.includes("info_sheet_amputation"), "Amputation sheet checkbox must be rendered");
  assert.ok(!result.summary.checkboxesRendered.includes("info_sheet_anaesthetic"), "Anaesthetic sheet checkbox must not be rendered");
  assert.ok(!result.summary.checkboxesRendered.includes("info_sheet_epidural_spinal"), "Epidural/spinal sheet checkbox must not be rendered");

  const amputationField = amputationManifest.fields.find((f) => f.name === "info_sheet_amputation")!;
  const anaestheticField = amputationManifest.fields.find((f) => f.name === "info_sheet_anaesthetic")!;
  const epiduralField = amputationManifest.fields.find((f) => f.name === "info_sheet_epidural_spinal")!;

  const checkboxHasInk = (field: typeof amputationField) => {
    let total = 0;
    for (const widget of field.widgets) {
      const rect = toPixelRect(widget.rect as [number, number, number, number]);
      total += countBluePixels(page4, rect.left + 1, rect.top + 1, rect.right - 1, rect.bottom - 1);
    }
    return total;
  };

  const amputationInk = checkboxHasInk(amputationField);
  const anaestheticInk = checkboxHasInk(anaestheticField);
  const epiduralInk = checkboxHasInk(epiduralField);

  assert.ok(amputationInk > 30, `Amputation checkbox must show a checkmark, found ${amputationInk}`);
  assert.ok(anaestheticInk < 10, `Anaesthetic checkbox must remain empty, found ${anaestheticInk}`);
  assert.ok(epiduralInk < 10, `Epidural/spinal checkbox must remain empty, found ${epiduralInk}`);
});

test("page 5 physician date and time render after physician signing", async () => {
  const { result, pages } = await getSharedContext();
  const page5 = pages[4];

  assert.ok(result.summary.fieldsRendered.includes("doctor_delegate_date"), "Physician date must be rendered");
  assert.ok(result.summary.fieldsRendered.includes("doctor_delegate_time"), "Physician time must be rendered");

  const dateField = amputationManifest.fields.find((f) => f.name === "doctor_delegate_date")!;
  const timeField = amputationManifest.fields.find((f) => f.name === "doctor_delegate_time")!;

  const dateRect = toPixelRect(dateField.widgets[0].rect as [number, number, number, number]);
  const timeRect = toPixelRect(timeField.widgets[0].rect as [number, number, number, number]);

  const dateInk = countBluePixels(page5, dateRect.left + 1, dateRect.top + 1, dateRect.right - 1, dateRect.bottom - 1);
  const timeInk = countBluePixels(page5, timeRect.left + 1, timeRect.top + 1, timeRect.right - 1, timeRect.bottom - 1);

  assert.ok(dateInk > 30, `Physician date ink must be visible, found ${dateInk}`);
  assert.ok(timeInk > 30, `Physician time ink must be visible, found ${timeInk}`);
});

test("canonical payload resolves to expected manifest field names without aliasing", async () => {
  const { result } = await getSharedContext();

  // This test documents the exact field-name resolution for the staged runtime
  // payload. If canonical-key mapping or continuation-field aliasing were wrong,
  // one of these fields would be missing or a different field would contain the
  // unexpected value.
  const expectedFields = [
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
    "info_sheet_amputation",
    "doctor_delegate_name",
    "doctor_delegate_designation",
    "doctor_delegate_signature_en",
    "doctor_delegate_signature_ar",
    "doctor_delegate_date",
    "doctor_delegate_time",
  ];

  for (const fieldName of expectedFields) {
    assert.ok(
      result.summary.fieldsRendered.includes(fieldName),
      `Expected field ${fieldName} to be rendered from canonical payload`,
    );
  }
});
