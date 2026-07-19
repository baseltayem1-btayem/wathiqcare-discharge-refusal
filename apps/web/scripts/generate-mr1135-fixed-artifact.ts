/**
 * Generate MR1135 fixed acceptance artifacts.
 *
 * Loads the canonical approved amputation PDF, renders a synthetic canonical-key
 * payload through the AcroForm-backed renderer, and writes:
 *   - test-output/mr1135-fixed/MR1135-Fixed-Synthetic-Test.pdf
 *   - test-output/mr1135-fixed/MR1135-Fixed-Synthetic-Test-page-{1..5}.png
 *   - test-output/mr1135-fixed/field-binding-report.json
 *   - test-output/mr1135-fixed/visual-qa-report.json
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PNG } from "pngjs";
import { PDFDocument } from "pdf-lib";
import { renderAcroFormPatientCopy } from "@/lib/server/acroform/filled-draft-preview-service";
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
  signedAt: "2026-07-15T09:30:00.000Z",
};

const CANONICAL_KEY_BINDINGS: Array<{
  canonicalKey: string;
  manifestField: string;
}> = [
  { canonicalKey: "procedure.condition.en", manifestField: "condition_description_en" },
  { canonicalKey: "procedure.condition.ar", manifestField: "condition_description_ar" },
  { canonicalKey: "procedure.site_side.en", manifestField: "proposed_procedure_en" },
  { canonicalKey: "procedure.site_side.ar", manifestField: "proposed_procedure_ar" },
  { canonicalKey: "procedure.significant_risks.en", manifestField: "significant_risks_options_en" },
  { canonicalKey: "procedure.significant_risks.ar", manifestField: "significant_risks_options_ar" },
  { canonicalKey: "procedure.significant_risks_cont.en", manifestField: "significant_risks_options_cont_en" },
  { canonicalKey: "procedure.significant_risks_cont.ar", manifestField: "significant_risks_options_cont_ar" },
  { canonicalKey: "procedure.no_treatment_risks.en", manifestField: "risks_without_procedure_en" },
  { canonicalKey: "procedure.no_treatment_risks.ar", manifestField: "risks_without_procedure_ar" },
  { canonicalKey: "anesthesia.type.en", manifestField: "anaesthetic_discussed_en" },
  { canonicalKey: "anesthesia.type.ar", manifestField: "anaesthetic_discussed_ar" },
  { canonicalKey: "physician.name.en", manifestField: "doctor_delegate_name" },
  { canonicalKey: "physician.designation.en", manifestField: "doctor_delegate_designation" },
  { canonicalKey: "physician.signature", manifestField: "doctor_delegate_signature_en" },
  { canonicalKey: "physician.signature", manifestField: "doctor_delegate_signature_ar" },
  { canonicalKey: "physician.date", manifestField: "doctor_delegate_date" },
  { canonicalKey: "physician.time", manifestField: "doctor_delegate_time" },
];

const OUTPUT_DIR = path.join(process.cwd(), "test-output", "mr1135-fixed");

function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(Buffer.from(data)).digest("hex");
}

function loadCanonicalPdf(): Uint8Array {
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

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await launchOverlayBrowser();
  try {
    const pdfBytes = loadCanonicalPdf();
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
          "procedure.significant_risks.ar": "نزيف، عدوى، ألم العضو الوهمي، ت breakdown الجذع.",
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

    const pdfPath = path.join(OUTPUT_DIR, "MR1135-Fixed-Synthetic-Test.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(result.bytes));

    const reopened = await PDFDocument.load(result.bytes);
    const pageCount = reopened.getPages().length;

    // Render PNGs and collect per-region ink counts.
    const pageReports: Array<{
      page: number;
      width: number;
      height: number;
      regions: Array<{
        field: string;
        bluePixels: number;
        rect: [number, number, number, number];
      }>;
    }> = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const pngBytes = await renderPdfPageToPng({ pdfBytes: result.bytes, pageIndex, scale: SCALE });
      const png = PNG.sync.read(Buffer.from(pngBytes));
      const pngPath = path.join(OUTPUT_DIR, `MR1135-Fixed-Synthetic-Test-page-${pageIndex + 1}.png`);
      fs.writeFileSync(pngPath, Buffer.from(pngBytes));

      const regions: Array<{ field: string; bluePixels: number; rect: [number, number, number, number] }> = [];
      for (const field of amputationManifest.fields) {
        if (!result.summary.fieldsRendered.includes(field.name)) continue;

        for (const widget of field.widgets) {
          if (widget.page !== pageIndex + 1) continue;
          const rect = widget.rect as [number, number, number, number];
          const px = toPixelRect(rect);
          const bluePixels = countBluePixels(png, px.left + 2, px.top + 2, px.right - 2, px.bottom - 2);
          regions.push({
            field: field.name,
            bluePixels,
            rect,
          });
        }
      }

      pageReports.push({
        page: pageIndex + 1,
        width: png.width,
        height: png.height,
        regions,
      });
    }

    // Field binding report.
    const bindingReport = {
      templateCode: amputationManifest.templateCode,
      manifestHash: diagnostics.manifestHash,
      canonicalPdfHash,
      outputPdfHash: sha256Hex(result.bytes),
      bindings: CANONICAL_KEY_BINDINGS.map((binding) => {
        const field = amputationManifest.fields.find((f) => f.name === binding.manifestField);
        return {
          canonicalKey: binding.canonicalKey,
          manifestField: binding.manifestField,
          pages: field?.widgets.map((w) => w.page) ?? [],
          rects: field?.widgets.map((w) => w.rect) ?? [],
          rendererType: field?.renderingStrategy ?? null,
        };
      }),
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "field-binding-report.json"),
      JSON.stringify(bindingReport, null, 2),
    );

    // Visual QA report.
    const visualQaReport = {
      pageCount,
      pages: pageReports,
      hashChecks: {
        canonicalPdfHash,
        outputPdfHash: sha256Hex(result.bytes),
        manifestHash: diagnostics.manifestHash,
        manifestHashMatches: diagnostics.manifestHashMatches,
      },
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, "visual-qa-report.json"),
      JSON.stringify(visualQaReport, null, 2),
    );

    console.log(`Wrote ${pdfPath}`);
    for (let i = 1; i <= pageCount; i++) {
      console.log(`Wrote ${path.join(OUTPUT_DIR, `MR1135-Fixed-Synthetic-Test-page-${i}.png`)}`);
    }
    console.log(`Wrote ${path.join(OUTPUT_DIR, "field-binding-report.json")}`);
    console.log(`Wrote ${path.join(OUTPUT_DIR, "visual-qa-report.json")}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
