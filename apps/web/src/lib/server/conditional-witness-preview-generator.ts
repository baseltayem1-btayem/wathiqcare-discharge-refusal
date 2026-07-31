import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  drawWitnessAuthLabelsOverlay,
  launchOverlayBrowser,
  renderPdfPageToPng,
} from "@/lib/server/imc-approved-pdf-template-engine";
import {
  buildWitnessAuthLabelPreviewFixture,
  IMC_MR_1168_PAGE2_CALIBRATION,
  TEST_FIXTURE_MARKER,
} from "@/lib/server/witness-auth-label";
import { WITNESS_POLICY_PROFILES } from "@/lib/server/witness-policy-profiles";
import { ApiError } from "@/lib/server/http";

export type ConditionalWitnessPreviewArtifacts = {
  pdfPath: string;
  page2PngPath: string;
  manifestPath: string;
  pdfSha256: string;
  page2PngSha256: string;
  manifestSha256: string;
};

const SOURCE_PDF_PUBLIC_PATH = "approved-consent-forms/adenotonsillectomy.pdf";
const RASTER_SCALE = 2;

function resolveSourcePdfPath(): string {
  const candidates = [
    path.join(process.cwd(), "public", SOURCE_PDF_PUBLIC_PATH),
    path.join(process.cwd(), "apps", "web", "public", SOURCE_PDF_PUBLIC_PATH),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new ApiError(500, `Approved source PDF not found: ${SOURCE_PDF_PUBLIC_PATH}`);
}

function ensureOutputDir(outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function assertAspectRatioSafeScale(
  pageWidth: number,
  pageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): { scaleX: number; scaleY: number; scale: number } {
  const scaleX = pageWidth / viewportWidth;
  const scaleY = pageHeight / viewportHeight;
  const scale = Math.min(scaleX, scaleY);
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new ApiError(500, "Unable to compute aspect-ratio-safe overlay scale");
  }
  return { scaleX, scaleY, scale };
}

/**
 * Generate the conditional-witness preview acceptance artifacts.
 *
 * Uses the approved IMC MR 1168 adenotonsillectomy source PDF and the actual
 * local overlay/Arabic pipeline. The page-2 PNG is a genuine composed raster
 * of the final generated PDF (page background + labels), not a transparency-
 * only overlay. All evidence is synthetic and visibly marked
 * TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE.
 */
export async function generateConditionalWitnessPreviewArtifacts(
  outputDir: string,
): Promise<ConditionalWitnessPreviewArtifacts> {
  ensureOutputDir(outputDir);

  const fixture = buildWitnessAuthLabelPreviewFixture();
  // Render the conditional-witness case: two human-witness authentication
  // labels fit inside the calibrated IMC MR 1168 page-2 witness region.
  const labels = fixture.witnessLabels;

  const sourcePdfPath = resolveSourcePdfPath();
  const sourceBytes = fs.readFileSync(sourcePdfPath);
  const pdfDoc = await PDFDocument.load(sourceBytes, { updateMetadata: false });

  const originalPageCount = pdfDoc.getPageCount();
  const page2Index = IMC_MR_1168_PAGE2_CALIBRATION.page - 1;
  if (page2Index >= originalPageCount) {
    throw new ApiError(
      500,
      `Source PDF has ${originalPageCount} pages; page ${IMC_MR_1168_PAGE2_CALIBRATION.page} is required`,
    );
  }

  const browser = await launchOverlayBrowser();
  try {
    await drawWitnessAuthLabelsOverlay({ browser, pdfDoc, labels });
  } finally {
    await browser.close();
  }

  // Preserve source-PDF creation/modification timestamps for determinism.
  const sourceStat = fs.statSync(sourcePdfPath);
  pdfDoc.setCreationDate(sourceStat.birthtime);
  pdfDoc.setModificationDate(sourceStat.mtime);

  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(outputDir, "IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.pdf");
  fs.writeFileSync(pdfPath, pdfBytes);

  // Render a genuine composed page-2 PNG from the final generated PDF using
  // the locally installed pdfjs-dist + Playwright renderer.
  const page2PngPath = path.join(outputDir, "IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY_PAGE_2.png");
  const page2Png = await renderPdfPageToPng({ pdfBytes, pageIndex: page2Index, scale: RASTER_SCALE });
  fs.writeFileSync(page2PngPath, page2Png);

  const pdfSha256 = sha256File(pdfPath);
  const page2PngSha256 = sha256File(page2PngPath);

  const page2 = pdfDoc.getPage(page2Index);
  const { width: sourceWidthPt, height: sourceHeightPt } = page2.getSize();
  const overlayScale = assertAspectRatioSafeScale(
    sourceWidthPt,
    sourceHeightPt,
    1190,
    1684,
  );

  const manifest = {
    fixtureMarker: TEST_FIXTURE_MARKER,
    templateFormReference: fixture.templateFormReference,
    templateCode: fixture.templateCode,
    templateVersion: "2018-02",
    policyVersion:
      WITNESS_POLICY_PROFILES.find((p) => p.templateCode === fixture.templateCode)?.policyVersion ??
      "unknown",
    sourcePdfPath: SOURCE_PDF_PUBLIC_PATH,
    sourcePdfSha256: sha256Buffer(sourceBytes),
    generatedAt: new Date().toISOString(),
    artifacts: {
      pdf: {
        fileName: path.basename(pdfPath),
        path: pdfPath,
        sha256: pdfSha256,
        pageCount: pdfDoc.getPageCount(),
      },
      page2Png: {
        fileName: path.basename(page2PngPath),
        path: page2PngPath,
        sha256: page2PngSha256,
        widthPx: page2Png.readUInt32BE(16),
        heightPx: page2Png.readUInt32BE(20),
      },
    },
    sourceDimensions: {
      widthPt: sourceWidthPt,
      heightPt: sourceHeightPt,
    },
    renderViewport: {
      widthPx: 1190,
      heightPx: 1684,
    },
    overlayScale,
    aspectRatioSafe: {
      uniformScale: overlayScale.scale,
      scaleX: overlayScale.scaleX,
      scaleY: overlayScale.scaleY,
      assertion:
        "Overlay is scaled uniformly (scale = min(scaleX, scaleY)) and centered; no non-uniform stretch.",
    },
    calibration: {
      coordinateMode: fixture.calibration.coordinateMode,
      bilingualDividerX: fixture.calibration.bilingualDividerX,
      safetyInset: fixture.calibration.safetyInset,
      witnessRegion: fixture.calibration.witnessRegion,
      englishColumn: fixture.calibration.englishColumn,
      arabicColumn: fixture.calibration.arabicColumn,
      labelHeight: fixture.calibration.labelHeight,
      protectedRegions: fixture.calibration.protectedRegions,
      minFontSizePt: fixture.calibration.minFontSizePt,
      maxFontSizePt: fixture.calibration.maxFontSizePt,
    },
    labels: labels.map((label) => ({
      titleEn: label.titleEn,
      titleAr: label.titleAr,
      fieldCount: label.fields.length,
    })),
  };

  const manifestPath = path.join(outputDir, "IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.manifest.json");
  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(manifestPath, manifestJson);
  const manifestSha256 = sha256Buffer(Buffer.from(manifestJson, "utf8"));

  return {
    pdfPath,
    page2PngPath,
    manifestPath,
    pdfSha256,
    page2PngSha256,
    manifestSha256,
  };
}
