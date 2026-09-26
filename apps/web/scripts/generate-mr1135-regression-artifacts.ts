/**
 * Generate MR1135 deterministic-binding regression artifacts.
 *
 * Produces a filled draft PDF and per-page PNGs from the canonical amputation
 * PDF using the exact regression payload requested in MR1135 repair work.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { renderAcroFormFilledDraftPreview } from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import { launchOverlayBrowser, renderPdfPageToPng } from "@/lib/server/imc-approved-pdf-template-engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const CONDITION_TEXT =
  "The patient has a severe infection and poor blood circulation in the left lower leg, causing persistent pain and a non-healing wound.";

const PROCEDURE_TEXT =
  "Left below-knee amputation, including removal of non-viable tissue and wound closure as clinically indicated.";

const pdfCandidates = [
  path.join(projectRoot, "public", "approved-consent-forms", "amputation.pdf"),
  path.join(projectRoot, "..", "public", "approved-consent-forms", "amputation.pdf"),
];

function loadPdfBytes(): Uint8Array {
  for (const candidate of pdfCandidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Canonical amputation PDF not found");
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

async function main(): Promise<void> {
  const outDir = path.join(projectRoot, "..", "tmp", "mr1135-regression-artifacts");
  fs.mkdirSync(outDir, { recursive: true });

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

    const pdfPath = path.join(outDir, "mr1135-regression-filled.pdf");
    fs.writeFileSync(pdfPath, Buffer.from(result.bytes));
    console.log(`PDF written: ${pdfPath} (${result.bytes.length} bytes)`);

    const pdfDoc = await PDFDocument.load(result.bytes);
    for (let i = 0; i < pdfDoc.getPages().length; i++) {
      const pngBytes = await renderPdfPageToPng({ pdfBytes: result.bytes, pageIndex: i, scale: 2 });
      const pngPath = path.join(outDir, `mr1135-regression-page-${i + 1}.png`);
      fs.writeFileSync(pngPath, Buffer.from(pngBytes));
      console.log(`PNG written: ${pngPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
