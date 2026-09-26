import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";

import { PDFDocument } from "pdf-lib";
import {
  generateConditionalWitnessPreviewArtifacts,
  type ConditionalWitnessPreviewArtifacts,
} from "@/lib/server/conditional-witness-preview-generator";
import {
  buildWitnessAuthLabelPreviewFixture,
  buildWitnessAuthLabelRects,
  IMC_MR_1168_PAGE2_CALIBRATION,
  TEST_FIXTURE_MARKER,
  type AuthenticationLabel,
} from "@/lib/server/witness-auth-label";


const OUTPUT_DIR = path.join(process.cwd(), "test-output");
const RASTER_SCALE = 2;

function readPngIhdr(filePath: string): { width: number; height: number; bitDepth: number; colorType: number } {
  const buf = fs.readFileSync(filePath);
  // PNG signature: 8 bytes; IHDR length: 4; type: 4; data: 13; CRC: 4
  const ihdrOffset = 8;
  const dataOffset = ihdrOffset + 8;
  return {
    width: buf.readUInt32BE(dataOffset),
    height: buf.readUInt32BE(dataOffset + 4),
    bitDepth: buf[dataOffset + 8],
    colorType: buf[dataOffset + 9],
  };
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
// Latin-1 bytes / Greek chars produced by broken UTF-8.
const MOJIBAKE_RE = /[ØÙâΓ]/;


function previewLabels(): AuthenticationLabel[] {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  return fixture.witnessLabels;
}

let artifacts: ConditionalWitnessPreviewArtifacts;

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

test.before(async () => {
  artifacts = await generateConditionalWitnessPreviewArtifacts(OUTPUT_DIR);
});

test("all three artifacts are generated", () => {
  assert.ok(fs.existsSync(artifacts.pdfPath), "PDF artifact must exist");
  assert.ok(fs.existsSync(artifacts.page2PngPath), "page 2 PNG artifact must exist");
  assert.ok(fs.existsSync(artifacts.manifestPath), "manifest artifact must exist");
});

test("manifest contains the test-only marker and matches file hashes", async () => {
  const manifest = JSON.parse(fs.readFileSync(artifacts.manifestPath, "utf8"));
  assert.equal(manifest.fixtureMarker, TEST_FIXTURE_MARKER);
  assert.equal(manifest.templateFormReference, "IMC MR 1168");
  assert.equal(manifest.templateCode, "imc-adenotonsillectomy");
  assert.equal(manifest.templateVersion, "2018-02");

  assert.equal(manifest.artifacts.pdf.sha256, sha256File(artifacts.pdfPath));
  assert.equal(manifest.artifacts.page2Png.sha256, sha256File(artifacts.page2PngPath));
  assert.equal(manifest.artifacts.pdf.sha256, artifacts.pdfSha256);
  assert.equal(manifest.artifacts.page2Png.sha256, artifacts.page2PngSha256);
  assert.equal(manifestSha256(), artifacts.manifestSha256);
});

test("generated PDF preserves the approved source page count and dimensions", async () => {
  const sourceBytes = fs.readFileSync(
    path.join(process.cwd(), "public", "approved-consent-forms", "adenotonsillectomy.pdf"),
  );
  const sourceDoc = await PDFDocument.load(sourceBytes);

  const pdfBytes = fs.readFileSync(artifacts.pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  assert.equal(pdfDoc.getPageCount(), sourceDoc.getPageCount(), "page count must match source");

  const sourcePage2 = sourceDoc.getPage(IMC_MR_1168_PAGE2_CALIBRATION.page - 1);
  const generatedPage2 = pdfDoc.getPage(IMC_MR_1168_PAGE2_CALIBRATION.page - 1);
  assert.ok(
    Math.abs(generatedPage2.getWidth() - sourcePage2.getWidth()) < 0.5,
    "page 2 width must match source",
  );
  assert.ok(
    Math.abs(generatedPage2.getHeight() - sourcePage2.getHeight()) < 0.5,
    "page 2 height must match source",
  );
});

test("label rectangles are contained in the witness region and clear the divider", () => {
  const labels = previewLabels();
  const calibration = IMC_MR_1168_PAGE2_CALIBRATION;

  labels.forEach((_label, slot) => {
    const rects = buildWitnessAuthLabelRects(calibration, slot);
    for (const rect of [rects.english, rects.arabic]) {
      assert.ok(
        rect.x >= calibration.witnessRegion.x &&
          rect.y >= calibration.witnessRegion.y &&
          rect.x + rect.width <= calibration.witnessRegion.x + calibration.witnessRegion.width &&
          rect.y + rect.height <= calibration.witnessRegion.y + calibration.witnessRegion.height,
        `slot ${slot} rect must be inside witness region`,
      );
      assert.ok(
        rect.x + rect.width <= calibration.bilingualDividerX - calibration.safetyInset ||
          rect.x >= calibration.bilingualDividerX + calibration.safetyInset,
        `slot ${slot} rect must not cross the bilingual divider`,
      );
    }
  });
});

test("label rectangles do not overlap protected signature regions", () => {
  const labels = previewLabels();
  const calibration = IMC_MR_1168_PAGE2_CALIBRATION;

  function rectsOverlap(a: typeof calibration.protectedRegions[0], b: typeof calibration.protectedRegions[0]): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  labels.forEach((_label, slot) => {
    const rects = buildWitnessAuthLabelRects(calibration, slot);
    for (const rect of [rects.english, rects.arabic]) {
      for (const protectedRegion of calibration.protectedRegions) {
        assert.ok(
          !rectsOverlap(rect, protectedRegion),
          `slot ${slot} rect overlaps a protected signature region`,
        );
      }
    }
  });
});

test("Arabic label rectangle is centered in the Arabic column", () => {
  const calibration = IMC_MR_1168_PAGE2_CALIBRATION;
  const rects = buildWitnessAuthLabelRects(calibration);
  const expectedCenterX = calibration.arabicColumn.x + calibration.arabicColumn.width / 2;
  const actualCenterX = rects.arabic.x + rects.arabic.width / 2;
  assert.ok(Math.abs(actualCenterX - expectedCenterX) < 0.001, "Arabic rect must be centered");
});

test("labels fit within the calibrated region at the approved minimum font size", () => {
  const labels = previewLabels();
  const calibration = IMC_MR_1168_PAGE2_CALIBRATION;
  const viewport = { width: 1190, height: 1684 };

  labels.forEach((_label, slot) => {
    const rects = buildWitnessAuthLabelRects(calibration, slot);
    // The overlay pipeline already validated fits; here we assert the
    // calibration itself leaves enough room for the minimum font size.
    const labelHeightPx = rects.english.height * viewport.height;
    assert.ok(
      labelHeightPx >= calibration.minFontSizePt * 4,
      `slot ${slot} label region must be tall enough for min font size`,
    );
  });
});

test("generated artifacts carry the test-only watermark", () => {
  const manifest = JSON.parse(fs.readFileSync(artifacts.manifestPath, "utf8"));
  assert.ok(manifest.fixtureMarker.includes("TEST ONLY"));
  assert.ok(manifest.fixtureMarker.includes("NON-CLINICAL"));
});

test("electronic-authentication label contains required Arabic terminology and no Latin OTP", () => {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  const label = fixture.routineLabel;
  const arabicVisible = [label.titleAr, label.bodyAr, ...label.fields.map((f) => `${f.labelAr} ${f.value}`)].join(" ");
  assert.ok(ARABIC_RE.test(arabicVisible), "Arabic label must contain Arabic script");
  assert.ok(!MOJIBAKE_RE.test(arabicVisible), `Arabic label must not contain mojibake: ${arabicVisible}`);
  assert.ok(!arabicVisible.includes("OTP"), "Arabic label must not display the Latin letters OTP");
  assert.ok(arabicVisible.includes("رمز التحقق"), "Arabic label must contain رمز التحقق terminology");
});

test("all visible labels use valid Arabic script and contain no Latin OTP or mojibake", () => {
  const labels = previewLabels();

  for (const label of labels) {
    const arabicVisible = [label.titleAr, label.bodyAr, ...label.fields.map((f) => `${f.labelAr} ${f.value}`)].join(" ");
    assert.ok(ARABIC_RE.test(arabicVisible), "Arabic label must contain Arabic script");
    assert.ok(!MOJIBAKE_RE.test(arabicVisible), `Arabic label must not contain mojibake: ${arabicVisible}`);
    assert.ok(!arabicVisible.includes("OTP"), "Arabic label must not display the Latin letters OTP");
  }
});

test("no label field leaks a secret verification code", () => {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  const labels = [fixture.routineLabel, ...fixture.witnessLabels];

  for (const label of labels) {
    for (const field of label.fields) {
      assert.ok(
        !/^\d{6}$/.test(field.value.trim()),
        `field ${field.labelEn} leaks a 6-digit verification code`,
      );
    }
  }
});

test("electronic authentication label fixture uses a masked mobile number", () => {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  const mobileField = fixture.routineLabel.fields.find((f) => f.labelEn === "Masked Mobile");
  assert.ok(mobileField, "routine label must have a masked mobile field");
  assert.ok(mobileField.value.includes("*"), "mobile must be masked");
  assert.ok(/^[*0-9+()\-\s]*\*+[*0-9+()\-\s]*$/.test(mobileField.value), "mobile must match masked pattern");
});

test("generated conditional preview uses two human-witness labels in required roles", () => {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  assert.equal(fixture.witnessLabels.length, 2);
  const roles = fixture.witnessLabels.map((label) => {
    const roleField = label.fields.find((f) => f.labelEn === "Witness Role");
    return roleField?.value;
  });
  assert.deepEqual(roles, ["NURSING_REPRESENTATIVE", "PATIENT_EXPERIENCE_REPRESENTATIVE"]);
});

test("page 2 PNG is a genuine composed raster with source-page dimensions", () => {
  const ihdr = readPngIhdr(artifacts.page2PngPath);
  const manifest = JSON.parse(fs.readFileSync(artifacts.manifestPath, "utf8"));

  // Raster dimensions must match the source PDF page scaled by RASTER_SCALE,
  // not the 1190x1684 overlay viewport.
  const expectedWidth = Math.ceil(manifest.sourceDimensions.widthPt * RASTER_SCALE);
  const expectedHeight = Math.ceil(manifest.sourceDimensions.heightPt * RASTER_SCALE);
  assert.equal(ihdr.width, expectedWidth, "PNG width must match scaled source page width");
  assert.equal(ihdr.height, expectedHeight, "PNG height must match scaled source page height");

  // The PNG must not be the old overlay-only 1190x1684 transparent artifact.
  assert.notEqual(ihdr.width, 1190, "PNG width must not equal the overlay viewport width");
  assert.notEqual(ihdr.height, 1684, "PNG height must not equal the overlay viewport height");

  // Composed page raster must be RGB (colorType 2) or RGBA (colorType 6),
  // carrying the page background and label ink rather than transparency only.
  assert.ok(
    ihdr.colorType === 2 || ihdr.colorType === 6,
    `composed page PNG must be RGB/RGBA, got colorType ${ihdr.colorType}`,
  );
});

test("page 2 PNG file is substantially larger than a transparency-only overlay", () => {
  const ihdr = readPngIhdr(artifacts.page2PngPath);
  const fileSize = fs.statSync(artifacts.page2PngPath).size;

  // The old overlay-only artifact was ~70 KB at 1190x1684. A composed page
  // raster of the same source at 1224x1584 carries the page background and
  // must be substantially larger.
  const minComposedBytes = 100_000;
  assert.ok(
    fileSize > minComposedBytes,
    `composed page PNG must be larger than a transparency-only overlay (size ${fileSize})`,
  );

  // Sanity check: file size scales roughly with pixel count.
  const pixelCount = ihdr.width * ihdr.height;
  assert.ok(
    fileSize > pixelCount / 20,
    "composed page PNG size must be consistent with a non-trivial raster",
  );
});

test("manifest records source dimensions, render viewport, and aspect-ratio-safe overlay scale", () => {
  const manifest = JSON.parse(fs.readFileSync(artifacts.manifestPath, "utf8"));

  assert.ok(manifest.sourceDimensions, "manifest must record sourceDimensions");
  assert.ok(manifest.renderViewport, "manifest must record renderViewport");
  assert.ok(manifest.overlayScale, "manifest must record overlayScale");
  assert.ok(manifest.aspectRatioSafe, "manifest must record aspectRatioSafe assertion");

  assert.equal(manifest.sourceDimensions.widthPt, 612, "source width must be 612 pt");
  assert.equal(manifest.sourceDimensions.heightPt, 792, "source height must be 792 pt");
  assert.equal(manifest.renderViewport.widthPx, 1190, "render viewport width must be 1190 px");
  assert.equal(manifest.renderViewport.heightPx, 1684, "render viewport height must be 1684 px");

  const { scaleX, scaleY, scale } = manifest.overlayScale;
  assert.ok(Number.isFinite(scaleX), "scaleX must be finite");
  assert.ok(Number.isFinite(scaleY), "scaleY must be finite");
  assert.ok(Number.isFinite(scale), "scale must be finite");
  assert.equal(
    scale,
    Math.min(scaleX, scaleY),
    "aspect-ratio-safe scale must be the minimum of scaleX and scaleY",
  );
  assert.ok(
    manifest.aspectRatioSafe.assertion.includes("uniformly"),
    "aspect-ratio-safe assertion must document uniform scaling",
  );
});

function manifestSha256(): string {
  return sha256File(artifacts.manifestPath);
}
