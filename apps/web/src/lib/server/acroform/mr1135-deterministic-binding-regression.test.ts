import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";
import {
  renderAcroFormFilledDraftPreview,
  renderAcroFormPatientCopy,
} from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import {
  launchOverlayBrowser,
  renderImcApprovedDoctorDraftPdf,
  renderPdfPageToPng,
} from "@/lib/server/imc-approved-pdf-template-engine";
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
  signedAt: "2026-07-15T09:30:00.000Z",
};

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

function getPixel(png: PNG, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const idx = (png.width * y + x) * 4;
  return {
    r: png.data[idx],
    g: png.data[idx + 1],
    b: png.data[idx + 2],
    a: png.data[idx + 3],
  };
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

function isBlueish(pixel: { r: number; g: number; b: number; a: number }): boolean {
  if (pixel.a <= 30) return false;
  if (pixel.b < 70) return false;
  if (pixel.b <= pixel.r + 5 && pixel.b <= pixel.g + 5) return false;
  return true;
}

function rectsOverlap(a: number[], b: number[]): boolean {
  return !(a[2] <= b[0] || a[0] >= b[2] || a[3] <= b[1] || a[1] >= b[3]);
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
  const pdfDoc = await PDFDocument.load(bytes);
  for (let i = 0; i < pdfDoc.getPages().length; i++) {
    const pngBytes = await renderPdfPageToPng({ pdfBytes: bytes, pageIndex: i, scale: SCALE });
    pages.push(PNG.sync.read(Buffer.from(pngBytes)));
  }
  return pages;
}

async function buildSharedContext() {
  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadPdfBytes();
    const canonicalPdfHash = sha256Hex(pdfBytes);
    const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");
    const physicianSignatureDataUrl = await generateSignatureDataUrl(browser);
    const patientSignatureDataUrl = await generateSignatureDataUrl(browser);

    const result = await renderAcroFormPatientCopy({
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
        patientSignature: {
          dataUrl: patientSignatureDataUrl,
          signerName: SYNTHETIC.patientName,
          signedAt: SYNTHETIC.signedAt,
        },
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

let shared: Awaited<ReturnType<typeof buildSharedContext>> | null = null;

async function getSharedContext(): Promise<NonNullable<typeof shared>> {
  if (shared) return shared;
  shared = await buildSharedContext();
  return shared;
}

test.after(async () => {
  if (shared) {
    await shared.browser.close();
    shared = null;
  }
});

test("a. condition appears only in the correct page-1 condition region", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];
  const field = amputationManifest.fields.find((f) => f.name === "condition_description_en")!;
  const widget = field.widgets.find((w) => w.page === 1)!;

  const left = Math.round(widget.rect[0] * SCALE);
  const top = Math.round((PAGE_HEIGHT_PT - widget.rect[3]) * SCALE);
  const right = Math.round(widget.rect[2] * SCALE);
  const bottom = Math.round((PAGE_HEIGHT_PT - widget.rect[1]) * SCALE);

  const insideBlue = countBluePixels(page1, left + 2, top + 2, right - 2, bottom - 2);
  assert.ok(insideBlue > 100, `Expected condition ink inside mapped rectangle, found ${insideBlue}`);

  // No blue ink directly above the condition box on page 1.
  const aboveBlue = countBluePixels(page1, left, top - 120, right, top);
  assert.ok(aboveBlue < 10, `Expected no stray condition ink above the box, found ${aboveBlue}`);
});

test("b. procedure appears only in the correct page-1 procedure region", async () => {
  const { pages } = await getSharedContext();
  const page1 = pages[0];
  const field = amputationManifest.fields.find((f) => f.name === "proposed_procedure_en")!;
  const widget = field.widgets.find((w) => w.page === 1)!;

  const left = Math.round(widget.rect[0] * SCALE);
  const top = Math.round((PAGE_HEIGHT_PT - widget.rect[3]) * SCALE);
  const right = Math.round(widget.rect[2] * SCALE);
  const bottom = Math.round((PAGE_HEIGHT_PT - widget.rect[1]) * SCALE);

  const insideBlue = countBluePixels(page1, left + 2, top + 2, right - 2, bottom - 2);
  assert.ok(insideBlue > 100, `Expected procedure ink inside mapped rectangle, found ${insideBlue}`);
});

test("c. physician signature appears only on page 5", async () => {
  const { pages } = await getSharedContext();
  const page5 = pages[4];
  const field = amputationManifest.fields.find((f) => f.name === "doctor_delegate_signature_en")!;
  const widget = field.widgets.find((w) => w.page === 5)!;

  const left = Math.round(widget.rect[0] * SCALE);
  const top = Math.round((PAGE_HEIGHT_PT - widget.rect[3]) * SCALE);
  const right = Math.round(widget.rect[2] * SCALE);
  const bottom = Math.round((PAGE_HEIGHT_PT - widget.rect[1]) * SCALE);

  const insideBlue = countBluePixels(page5, left + 2, top + 2, right - 2, bottom - 2);
  assert.ok(insideBlue > 20, `Expected physician signature ink on page 5, found ${insideBlue}`);
});

test("d. no physician signature pixels on pages 1-4", async () => {
  const { pages } = await getSharedContext();
  const sigField = amputationManifest.fields.find((f) => f.name === "doctor_delegate_signature_en")!;
  const widget = sigField.widgets.find((w) => w.page === 5)!;
  const sigRect = widget.rect;

  for (let pageIndex = 0; pageIndex < 4; pageIndex++) {
    const png = pages[pageIndex];
    const blue = countBluePixels(
      png,
      Math.round(sigRect[0] * SCALE) - 4,
      Math.round((PAGE_HEIGHT_PT - sigRect[3]) * SCALE) - 4,
      Math.round(sigRect[2] * SCALE) + 4,
      Math.round((PAGE_HEIGHT_PT - sigRect[1]) * SCALE) + 4,
    );
    assert.equal(blue, 0, `Physician signature must not appear on page ${pageIndex + 1}`);
  }
});

test("e. patient name, MRN and DoB appear on all five pages", async () => {
  const { pages } = await getSharedContext();

  const identityFields = ["patient_name", "mrn", "date_of_birth"] as const;
  for (const fieldName of identityFields) {
    const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
    for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
      const png = pages[pageIndex];
      const widget = field.widgets.find((w) => w.page === pageIndex + 1);
      assert.ok(widget, `${fieldName} must have a widget on page ${pageIndex + 1}`);

      const left = Math.round(widget.rect[0] * SCALE);
      const top = Math.round((PAGE_HEIGHT_PT - widget.rect[3]) * SCALE);
      const right = Math.round(widget.rect[2] * SCALE);
      const bottom = Math.round((PAGE_HEIGHT_PT - widget.rect[1]) * SCALE);
      const blue = countBluePixels(png, left + 2, top + 2, right - 2, bottom - 2);
      assert.ok(blue > 20, `Expected ${fieldName} ink on page ${pageIndex + 1}, found ${blue}`);
    }
  }
});

test("f. physician name, designation, signature, date and time appear on page 5", async () => {
  const { pages } = await getSharedContext();
  const page5 = pages[4];

  const fields = [
    "doctor_delegate_name",
    "doctor_delegate_designation",
    "doctor_delegate_signature_en",
    "doctor_delegate_date",
    "doctor_delegate_time",
  ] as const;

  for (const fieldName of fields) {
    const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
    const widget = field.widgets.find((w) => w.page === 5);
    assert.ok(widget, `${fieldName} must have a widget on page 5`);

    const left = Math.round(widget.rect[0] * SCALE);
    const top = Math.round((PAGE_HEIGHT_PT - widget.rect[3]) * SCALE);
    const right = Math.round(widget.rect[2] * SCALE);
    const bottom = Math.round((PAGE_HEIGHT_PT - widget.rect[1]) * SCALE);
    const blue = countBluePixels(page5, left + 2, top + 2, right - 2, bottom - 2);
    assert.ok(blue > 10, `Expected ${fieldName} ink on page 5, found ${blue}`);
  }
});

test("f+. Arabic patient signature ink bounding box has zero intersection with Arabic patient date and time", async () => {
  const { pages } = await getSharedContext();
  const page4 = pages[3];

  const sigField = amputationManifest.fields.find((f) => f.name === "patient_signature_ar")!;
  const sigWidget = sigField.widgets.find((w) => w.page === 4)!;

  // Compute the actual ink bounding box for the Arabic patient signature.
  const sigLeft = Math.round(sigWidget.rect[0] * SCALE);
  const sigTop = Math.round((PAGE_HEIGHT_PT - sigWidget.rect[3]) * SCALE);
  const sigRight = Math.round(sigWidget.rect[2] * SCALE);
  const sigBottom = Math.round((PAGE_HEIGHT_PT - sigWidget.rect[1]) * SCALE);

  let minX = sigRight;
  let minY = sigBottom;
  let maxX = sigLeft;
  let maxY = sigTop;
  let inkFound = false;

  for (let y = sigTop; y < sigBottom; y++) {
    for (let x = sigLeft; x < sigRight; x++) {
      if (isBlueish(getPixel(page4, x, y))) {
        inkFound = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  assert.ok(inkFound, "Arabic patient signature ink must be present on page 4");

  const inkBoundingBox: [number, number, number, number] = [minX, minY, maxX + 1, maxY + 1];

  const dateField = amputationManifest.fields.find((f) => f.name === "consent_date")!;
  const dateWidget = dateField.widgets.find((w) => w.page === 4 && w.rect[0] > 300)!;
  const dateRect: [number, number, number, number] = [
    Math.round(dateWidget.rect[0] * SCALE),
    Math.round((PAGE_HEIGHT_PT - dateWidget.rect[3]) * SCALE),
    Math.round(dateWidget.rect[2] * SCALE),
    Math.round((PAGE_HEIGHT_PT - dateWidget.rect[1]) * SCALE),
  ];

  const timeField = amputationManifest.fields.find((f) => f.name === "consent_time")!;
  const timeWidget = timeField.widgets.find((w) => w.page === 4 && w.rect[0] > 300)!;
  const timeRect: [number, number, number, number] = [
    Math.round(timeWidget.rect[0] * SCALE),
    Math.round((PAGE_HEIGHT_PT - timeWidget.rect[3]) * SCALE),
    Math.round(timeWidget.rect[2] * SCALE),
    Math.round((PAGE_HEIGHT_PT - timeWidget.rect[1]) * SCALE),
  ];

  function rectIntersects(a: [number, number, number, number], b: [number, number, number, number]): boolean {
    return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  }

  assert.ok(
    !rectIntersects(inkBoundingBox, dateRect),
    "Arabic patient signature ink must not intersect Arabic patient date rectangle",
  );
  assert.ok(
    !rectIntersects(inkBoundingBox, timeRect),
    "Arabic patient signature ink must not intersect Arabic patient time rectangle",
  );
});

test("g. no overlay intersects Section A header/interpreter region on page 1", async () => {
  // Section A is the top header + interpreter checkbox band (y > 650 pt on page 1).
  const sectionA: [number, number, number, number] = [0, 650, 612, PAGE_HEIGHT_PT];

  const protectedFieldNames = [
    "condition_description_en",
    "condition_description_ar",
    "proposed_procedure_en",
    "proposed_procedure_ar",
  ];

  for (const fieldName of protectedFieldNames) {
    const field = amputationManifest.fields.find((f) => f.name === fieldName)!;
    for (const widget of field.widgets) {
      if (widget.page !== 1) continue;
      assert.ok(
        !rectsOverlap(widget.rect, sectionA),
        `Field ${fieldName} widget ${widget.rect.join(",")} overlaps Section A`,
      );
    }
  }
});

test("h. output remains exactly five pages", async () => {
  const { result, pages } = await getSharedContext();
  assert.equal(result.summary.pages, 5);
  assert.equal(pages.length, 5);
});

test("i. output contains no AcroForm fields, JavaScript or active actions", async () => {
  const { result } = await getSharedContext();
  const reopened = await PDFDocument.load(result.bytes);

  // Inspect the catalog before calling getForm(), because pdf-lib creates an
  // empty AcroForm dictionary on demand when getForm() is invoked.
  const catalog = reopened.catalog;
  assert.ok(!catalog.get(PDFName.of("AcroForm")), "Catalog must not contain AcroForm");
  assert.ok(!catalog.get(PDFName.of("OpenAction")), "Catalog must not contain OpenAction");
  assert.ok(!catalog.get(PDFName.of("JavaScript")), "Catalog must not contain JavaScript");

  for (const page of reopened.getPages()) {
    const annots = page.node.get(PDFName.of("Annots"));
    assert.ok(
      !annots || (annots instanceof PDFArray && annots.size() === 0),
      "Page annotations must be removed",
    );
  }

  assert.equal(reopened.getForm().getFields().length, 0, "AcroForm fields must be removed");
});

test("j. wrong canonical PDF hash causes a hard failure", async () => {
  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadPdfBytes();
    const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");

    await assert.rejects(
      async () =>
        renderAcroFormFilledDraftPreview({
          request: {
            formId: "imc-approved-amputation",
            approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
            manifestHash: diagnostics.manifestHash ?? "",
            doctorCompletionValues: {
              "procedure.condition.en": SYNTHETIC.condition,
              "procedure.site_side.en": SYNTHETIC.procedure,
              "physician.name.en": SYNTHETIC.physicianName,
              "physician.designation.en": SYNTHETIC.designation,
              interpreter_required: "false",
              interpreter_present: "false",
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
            },
            encounterReference: { id: "enc-1", encounterId: "ENC-1" },
            correlationId: "corr-1",
          },
          browser,
          canonicalPdfBytes: pdfBytes,
          canonicalPdfHash: "invalid-hash",
        }),
      /Canonical approved PDF hash mismatch/,
    );
  } finally {
    await browser.close();
  }
});

test("j. wrong manifest hash causes a hard failure", async () => {
  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadPdfBytes();
    const canonicalPdfHash = sha256Hex(pdfBytes);

    await assert.rejects(
      async () =>
        renderAcroFormFilledDraftPreview({
          request: {
            formId: "imc-approved-amputation",
            approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
            manifestHash: "invalid-hash",
            doctorCompletionValues: {
              "procedure.condition.en": SYNTHETIC.condition,
              "procedure.site_side.en": SYNTHETIC.procedure,
              "physician.name.en": SYNTHETIC.physicianName,
              "physician.designation.en": SYNTHETIC.designation,
              interpreter_required: "false",
              interpreter_present: "false",
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
            },
            encounterReference: { id: "enc-1", encounterId: "ENC-1" },
            correlationId: "corr-1",
          },
          browser,
          canonicalPdfBytes: pdfBytes,
          canonicalPdfHash,
        }),
      /Manifest hash mismatch/,
    );
  } finally {
    await browser.close();
  }
});

test("k. renderImcApprovedDoctorDraftPdf rejects MR1135", async () => {
  const pdfBytes = loadPdfBytes();

  await assert.rejects(
    async () =>
      renderImcApprovedDoctorDraftPdf({
        pdfBytes,
        formId: "imc-approved-amputation",
        doctorCompletionValues: {
          condition_description_en: SYNTHETIC.condition,
          proposed_procedure_en: SYNTHETIC.procedure,
        },
      }),
    /AcroForm-backed templates must use the field-addressed renderer/,
  );

  await assert.rejects(
    async () =>
      renderImcApprovedDoctorDraftPdf({
        pdfBytes,
        formId: "MR 1135",
        doctorCompletionValues: {},
      }),
    /AcroForm-backed templates must use the field-addressed renderer/,
  );
});
