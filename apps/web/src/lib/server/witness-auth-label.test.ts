import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";

import {
  ARABIC_LABEL_BODY,
  ARABIC_LABEL_TITLE,
  ENGLISH_LABEL_BODY,
  ENGLISH_LABEL_TITLE,
  IMC_MR_1168_PAGE2_CALIBRATION,
  TEST_FIXTURE_MARKER,
  assertLabelContentSafe,
  assertLabelFits,
  assertLabelRectsValid,
  autoFitLabelText,
  buildElectronicAuthenticationLabel,
  buildHumanWitnessLabel,
  buildWitnessAuthLabelPreviewFixture,
  buildWitnessAuthLabelRects,
  centerRectInColumn,
  labelToTextLines,
  validateLabelRects,
  type AuthenticationLabel,
  type LabelRects,
} from "@/lib/server/witness-auth-label";

const CALIBRATION = IMC_MR_1168_PAGE2_CALIBRATION;
const OVERLAY_VIEWPORT = { width: 1190, height: 1684 };

function genuineEvidence() {
  return {
    verificationReference: "VREF-9f2c1a",
    maskedMobile: "+966 5****1234",
    signatureId: "sig-7e31",
    signedAtKsa: "2026-07-14T10:30:00+03:00",
    authenticationReference: "authref-b821",
    verificationUrl: null,
  };
}

// --- Spec test 15: no-witness label only with complete genuine evidence -----
test("routine electronic authentication label builds from complete genuine evidence", () => {
  const label = buildElectronicAuthenticationLabel(genuineEvidence());
  assert.equal(label.titleAr, ARABIC_LABEL_TITLE);
  assert.equal(label.titleEn, ENGLISH_LABEL_TITLE);
  assert.equal(label.bodyAr, ARABIC_LABEL_BODY);
  assert.equal(label.bodyEn, ENGLISH_LABEL_BODY);
  assert.equal(label.fields.length, 5);
  assert.doesNotThrow(() => assertLabelContentSafe(label));
});

test("label construction fails closed when evidence is a secret code or unmasked mobile", () => {
  assert.throws(
    () => buildElectronicAuthenticationLabel({ ...genuineEvidence(), verificationReference: "482913" }),
    (error: unknown) => (error as { code?: string }).code === "LABEL_SECRET_VALUE_REJECTED",
  );
  assert.throws(
    () => buildElectronicAuthenticationLabel({ ...genuineEvidence(), maskedMobile: "+966551234567" }),
    (error: unknown) => (error as { code?: string }).code === "LABEL_UNMASKED_MOBILE_REJECTED",
  );
});

// --- Spec test 16: human-witness label only after a completed signature -----
test("human witness authentication label builds from a completed witness record", () => {
  const label = buildHumanWitnessLabel({
    witnessRole: "NURSING_REPRESENTATIVE",
    witnessDisplayName: "Staff Nurse A",
    employeeId: "EMP-1042",
    department: "Nursing",
    signatureId: "sig-w-1",
    signedAtKsa: "2026-07-14T10:35:00+03:00",
    authenticationReference: "authref-w-1",
    documentHash: "hash-1",
  });
  assert.equal(label.titleEn, "Human Witness Authentication");
  assert.ok(label.fields.some((field) => field.labelEn === "Witness Role"));
  assert.ok(label.fields.some((field) => field.labelEn === "Employee ID"));
});

// --- Spec test 17: labels never contain secret code or unmasked mobile ------
test("content safety assertion rejects secret codes and OTP terminology leaks", () => {
  const label = buildElectronicAuthenticationLabel(genuineEvidence());
  const leaked: AuthenticationLabel = {
    ...label,
    fields: [...label.fields, { labelAr: "x", labelEn: "Code", value: "123456" }],
  };
  assert.throws(
    () => assertLabelContentSafe(leaked),
    (error: unknown) => (error as { code?: string }).code === "LABEL_SECRET_VALUE_REJECTED",
  );
});

// --- Spec test 18: Arabic uses رمز التحقق and never visible OTP -------------
test("Arabic visible label contains رمز التحقق terminology and no Latin OTP", () => {
  const label = buildElectronicAuthenticationLabel(genuineEvidence());
  const arabicVisible = [
    label.titleAr,
    label.bodyAr,
    ...label.fields.map((field) => `${field.labelAr} ${field.value}`),
  ].join(" ");
  assert.ok(arabicVisible.includes("رمز التحقق"));
  assert.ok(arabicVisible.includes("مرجع رمز التحقق"));
  assert.ok(!arabicVisible.includes("OTP"));

  const withOtp: AuthenticationLabel = { ...label, bodyAr: `${label.bodyAr} OTP` };
  assert.throws(
    () => assertLabelContentSafe(withOtp),
    (error: unknown) => (error as { code?: string }).code === "LABEL_ARABIC_OTP_REJECTED",
  );
});

// --- Spec test 19: rectangles remain inside their configured columns --------
test("English and Arabic rectangles remain inside their configured columns", () => {
  const rects = buildWitnessAuthLabelRects(CALIBRATION);
  const englishRight = rects.english.x + rects.english.width;
  assert.ok(rects.english.x >= CALIBRATION.englishColumn.x);
  assert.ok(englishRight <= CALIBRATION.englishColumn.x + CALIBRATION.englishColumn.width + 1e-9);
  assert.ok(englishRight < CALIBRATION.bilingualDividerX);

  const arabicRight = rects.arabic.x + rects.arabic.width;
  assert.ok(rects.arabic.x >= CALIBRATION.arabicColumn.x);
  assert.ok(rects.arabic.x > CALIBRATION.bilingualDividerX);
  assert.ok(arabicRight <= CALIBRATION.arabicColumn.x + CALIBRATION.arabicColumn.width + 1e-9);

  const result = validateLabelRects(rects, CALIBRATION);
  assert.equal(result.valid, true);
});

// --- Spec test 20: Arabic rectangle is centered in its column ---------------
test("the Arabic rectangle is mathematically centered inside the Arabic column", () => {
  const rects = buildWitnessAuthLabelRects(CALIBRATION);
  const expectedX = centerRectInColumn(CALIBRATION.arabicColumn, rects.arabic.width);
  assert.ok(Math.abs(rects.arabic.x - expectedX) < 1e-9);

  // A narrower rect must also center within the column.
  const narrowWidth = 0.3;
  const narrowX = centerRectInColumn(CALIBRATION.arabicColumn, narrowWidth);
  const columnCenter = CALIBRATION.arabicColumn.x + CALIBRATION.arabicColumn.width / 2;
  assert.ok(Math.abs(narrowX + narrowWidth / 2 - columnCenter) < 1e-9);
});

// --- Spec test 21: no rectangle crosses the bilingual divider ---------------
test("a rectangle crossing the bilingual divider is rejected", () => {
  const crossing: LabelRects = {
    english: { x: 0.4, y: 0.62, width: 0.2, height: 0.1 },
    arabic: { x: 0.55, y: 0.62, width: 0.3, height: 0.1 },
  };
  const result = validateLabelRects(crossing, CALIBRATION);
  assert.equal(result.valid, false);
  assert.ok(result.violations.includes("CROSSES_DIVIDER"));
  assert.throws(
    () => assertLabelRectsValid(crossing, CALIBRATION),
    (error: unknown) => (error as { code?: string }).code === "PDF_CALIBRATION_VIOLATION",
  );
});

test("rectangles overlapping protected signature regions or page edges are rejected", () => {
  const onSignature: LabelRects = {
    english: { x: 0.145, y: 0.468, width: 0.3, height: 0.026 },
    arabic: { x: 0.55, y: 0.62, width: 0.3, height: 0.1 },
  };
  const result = validateLabelRects(onSignature, CALIBRATION);
  assert.equal(result.valid, false);
  assert.ok(result.violations.includes("OVERLAPS_PROTECTED_REGION"));

  const offPage: LabelRects = {
    english: { x: 0.001, y: 0.62, width: 0.4, height: 0.1 },
    arabic: { x: 0.55, y: 0.62, width: 0.3, height: 0.1 },
  };
  assert.ok(validateLabelRects(offPage, CALIBRATION).violations.includes("OUTSIDE_PAGE"));
});

// --- Spec test 22: overflow fails closed rather than clipping ---------------
test("auto-fit typography shrinks deterministically and fails closed on overflow", () => {
  const label = buildElectronicAuthenticationLabel(genuineEvidence());
  const rects = buildWitnessAuthLabelRects(CALIBRATION);
  const fit = autoFitLabelText(labelToTextLines(label, "en"), rects.english, OVERLAY_VIEWPORT, {
    minFontSizePt: CALIBRATION.minFontSizePt,
    maxFontSizePt: CALIBRATION.maxFontSizePt,
  });
  assert.equal(fit.fits, true);
  assert.ok(fit.fontSizePt >= CALIBRATION.minFontSizePt);
  assert.ok(fit.fontSizePt <= CALIBRATION.maxFontSizePt);

  const overflowing = autoFitLabelText(
    [{ text: "x".repeat(5000), weight: "body" }],
    rects.english,
    OVERLAY_VIEWPORT,
    { minFontSizePt: CALIBRATION.minFontSizePt, maxFontSizePt: CALIBRATION.maxFontSizePt },
  );
  assert.equal(overflowing.fits, false);
  assert.throws(
    () => assertLabelFits(overflowing),
    (error: unknown) => (error as { code?: string }).code === "PDF_LABEL_OVERFLOW",
  );
});

// --- Deterministic preview fixture + ignored artifact -----------------------
test("preview fixture is deterministic, synthetic-marked, and written to the ignored artifact path", () => {
  const first = buildWitnessAuthLabelPreviewFixture();
  const second = buildWitnessAuthLabelPreviewFixture();
  assert.deepEqual(first, second);
  assert.equal(first.fixtureMarker, TEST_FIXTURE_MARKER);
  assert.equal(first.templateFormReference, "IMC MR 1168");
  assert.equal(first.templateCode, "imc-adenotonsillectomy");
  assert.equal(first.page, 2);
  assert.equal(first.witnessLabels.length, 2);
  assert.doesNotThrow(() => assertLabelContentSafe(first.routineLabel));
  assert.doesNotThrow(() => assertLabelRectsValid(first.rects, first.calibration));

  const outputDir = path.join(process.cwd(), "test-output");
  mkdirSync(outputDir, { recursive: true });
  const artifactPath = path.join(
    outputDir,
    "witness-auth-label-imc-mr-1168-page2.fixture.json",
  );
  writeFileSync(artifactPath, `${JSON.stringify(first, null, 2)}\n`, "utf8");
});
