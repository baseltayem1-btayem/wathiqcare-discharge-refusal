import { ApiError } from "@/lib/server/http";

/**
 * Bilingual electronic-signature authentication label and human-witness
 * authentication label for the approved Adeno-Tonsillectomy consent
 * (IMC MR 1168, template code imc-adenotonsillectomy), rendered as a
 * renderer-driven overlay on page 2. The approved source PDF is never
 * permanently altered.
 *
 * Coordinate system: NORMALIZED — x, y, width and height are fractions of
 * the rendered page size with the origin at the top-left corner. The page
 * has two bilingual columns separated by a vertical divider at x = 0.5:
 * English on the left (LTR), Arabic on the right (RTL).
 */

export const LABEL_RENDERER_VERSION = "1.0.0";

export const TEST_FIXTURE_MARKER = "TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE";

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WitnessLabelCalibration = {
  templateFormReference: string;
  templateCode: string;
  page: number;
  coordinateMode: "NORMALIZED";
  /** Vertical bilingual divider position (fraction of page width). */
  bilingualDividerX: number;
  /** Minimum distance from divider and page edges (fraction). */
  safetyInset: number;
  /** Configured witness region the labels must stay inside. */
  witnessRegion: NormalizedRect;
  /** English column bounds (left of divider). */
  englishColumn: { x: number; width: number };
  /** Arabic column bounds (right of divider). */
  arabicColumn: { x: number; width: number };
  /** Height reserved for each authentication label. */
  labelHeight: number;
  /** Signature regions that labels must never overlap. */
  protectedRegions: NormalizedRect[];
  minFontSizePt: number;
  maxFontSizePt: number;
};

/**
 * Template-version-specific calibration for IMC MR 1168 (version 1.0),
 * page 2. The witness region sits below the physician/guardian signature
 * rows (y 0.236 / 0.468) so protected regions are never overlapped.
 */
export const IMC_MR_1168_PAGE2_CALIBRATION: WitnessLabelCalibration = {
  templateFormReference: "IMC MR 1168",
  templateCode: "imc-adenotonsillectomy",
  page: 2,
  coordinateMode: "NORMALIZED",
  bilingualDividerX: 0.5,
  safetyInset: 0.02,
  witnessRegion: { x: 0.04, y: 0.6, width: 0.92, height: 0.34 },
  englishColumn: { x: 0.04, width: 0.44 },
  arabicColumn: { x: 0.52, width: 0.44 },
  labelHeight: 0.13,
  protectedRegions: [
    // treating_physician_signature (page 2)
    { x: 0.145, y: 0.468, width: 0.3, height: 0.026 },
    // guardian_signature (page 2)
    { x: 0.145, y: 0.236, width: 0.3, height: 0.026 },
  ],
  minFontSizePt: 6,
  maxFontSizePt: 9,
};

export type LabelRects = {
  english: NormalizedRect;
  arabic: NormalizedRect;
};

/**
 * Compute the label rectangles. The Arabic rectangle is mathematically
 * centered inside the configured Arabic column.
 */
export function buildWitnessAuthLabelRects(
  calibration: WitnessLabelCalibration,
  slot = 0,
): LabelRects {
  const y = calibration.witnessRegion.y + slot * (calibration.labelHeight + 0.01);
  const english: NormalizedRect = {
    x: calibration.englishColumn.x,
    y,
    width: calibration.englishColumn.width,
    height: calibration.labelHeight,
  };
  // Arabic rect uses the full column width; the centered variant is used
  // when the rect is narrower than the column (see centerRectInColumn).
  const arabic: NormalizedRect = {
    x: calibration.arabicColumn.x,
    y,
    width: calibration.arabicColumn.width,
    height: calibration.labelHeight,
  };
  return { english, arabic };
}

/** Center a rectangle of the given width inside its column. */
export function centerRectInColumn(
  column: { x: number; width: number },
  rectWidth: number,
): number {
  return column.x + (column.width - rectWidth) / 2;
}

export type CalibrationViolation =
  | "CROSSES_DIVIDER"
  | "OUTSIDE_PAGE"
  | "OUTSIDE_WITNESS_REGION"
  | "OVERLAPS_PROTECTED_REGION";

function rectsOverlap(a: NormalizedRect, b: NormalizedRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Validate label bounds at runtime. Fail closed: any rectangle that crosses
 * the bilingual divider, page boundaries, the configured witness region or
 * a protected signature region is rejected.
 */
export function validateLabelRects(
  rects: LabelRects,
  calibration: WitnessLabelCalibration,
): { valid: boolean; violations: CalibrationViolation[] } {
  const violations: CalibrationViolation[] = [];
  const inset = calibration.safetyInset;

  for (const rect of [rects.english, rects.arabic]) {
    if (
      rect.x < inset ||
      rect.y < 0 ||
      rect.x + rect.width > 1 - inset ||
      rect.y + rect.height > 1
    ) {
      violations.push("OUTSIDE_PAGE");
    }
    if (
      rect.x < calibration.witnessRegion.x ||
      rect.y < calibration.witnessRegion.y ||
      rect.x + rect.width > calibration.witnessRegion.x + calibration.witnessRegion.width ||
      rect.y + rect.height > calibration.witnessRegion.y + calibration.witnessRegion.height
    ) {
      violations.push("OUTSIDE_WITNESS_REGION");
    }
    if (
      rect.x < calibration.bilingualDividerX + inset &&
      rect.x + rect.width > calibration.bilingualDividerX - inset
    ) {
      violations.push("CROSSES_DIVIDER");
    }
    for (const protectedRegion of calibration.protectedRegions) {
      if (rectsOverlap(rect, protectedRegion)) {
        violations.push("OVERLAPS_PROTECTED_REGION");
        break;
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

export function assertLabelRectsValid(
  rects: LabelRects,
  calibration: WitnessLabelCalibration,
): void {
  const result = validateLabelRects(rects, calibration);
  if (!result.valid) {
    throw new ApiError(
      409,
      `Authentication label calibration failed: ${Array.from(new Set(result.violations)).join(", ")}`,
      { code: "PDF_CALIBRATION_VIOLATION" },
    );
  }
}

// ---------------------------------------------------------------------------
// Deterministic auto-fit typography
// ---------------------------------------------------------------------------

export type LabelTextLine = {
  text: string;
  /** Relative weight (title lines are bolder/larger). */
  weight?: "title" | "body" | "field";
};

export type AutoFitResult = {
  fits: boolean;
  fontSizePt: number;
  lineCount: number;
};

/** Average glyph advance as a fraction of font size, per script. */
function averageAdvanceFactor(text: string): number {
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length;
  const ratio = arabicChars / Math.max(text.length, 1);
  // Arabic glyphs are wider on average than Latin.
  return 0.5 + 0.15 * ratio;
}

/**
 * Deterministically fit label text into a rectangle of the given pixel size
 * (rect converted with the overlay viewport). Font size is reduced step by
 * step; when the approved minimum cannot fit the content the result is
 * fits=false — callers must fail closed rather than clip or truncate.
 */
export function autoFitLabelText(
  lines: LabelTextLine[],
  rect: NormalizedRect,
  viewport: { width: number; height: number },
  options: { minFontSizePt: number; maxFontSizePt: number; lineHeight?: number },
): AutoFitResult {
  const lineHeight = options.lineHeight ?? 1.25;
  const rectWidthPx = rect.width * viewport.width;
  const rectHeightPx = rect.height * viewport.height;
  const paddingPx = 6;

  for (
    let fontSize = options.maxFontSizePt;
    fontSize >= options.minFontSizePt;
    fontSize -= 0.5
  ) {
    let totalLines = 0;
    let fits = true;
    for (const line of lines) {
      const weightFactor = line.weight === "title" ? 1.15 : 1;
      const advance = averageAdvanceFactor(line.text) * weightFactor;
      const charsPerLine = Math.max(
        1,
        Math.floor((rectWidthPx - 2 * paddingPx) / (fontSize * advance)),
      );
      const wrapped = Math.max(1, Math.ceil(line.text.length / charsPerLine));
      totalLines += wrapped;
    }
    const requiredHeight = totalLines * fontSize * lineHeight + 2 * paddingPx;
    if (requiredHeight > rectHeightPx) {
      fits = false;
    }
    if (fits) {
      return { fits: true, fontSizePt: fontSize, lineCount: totalLines };
    }
  }
  return { fits: false, fontSizePt: options.minFontSizePt, lineCount: 0 };
}

export function assertLabelFits(result: AutoFitResult): void {
  if (!result.fits) {
    throw new ApiError(
      409,
      "Authentication label content does not fit the calibrated region at the approved minimum font size; refusing to clip or truncate evidence.",
      { code: "PDF_LABEL_OVERFLOW" },
    );
  }
}

// ---------------------------------------------------------------------------
// Label content
// ---------------------------------------------------------------------------

export const ARABIC_LABEL_TITLE = "توثيق التوقيع الإلكتروني";
export const ARABIC_LABEL_BODY =
  "تم التوقيع والتحقق إلكترونيًا عبر نظام واثق كير بعد التحقق من هوية الموقّع وموافقته الصريحة على محتوى الموافقة.";
export const ENGLISH_LABEL_TITLE = "Electronic Signature Authentication";
export const ENGLISH_LABEL_BODY =
  "Electronically signed and authenticated through WathiqCare after identity verification and the signatory's express acceptance of the consent.";

export const ARABIC_HUMAN_WITNESS_TITLE = "توثيق توقيع الشاهد";
export const ENGLISH_HUMAN_WITNESS_TITLE = "Human Witness Authentication";

export type AuthenticationEvidence = {
  /** OTP challenge reference — never the secret code itself. */
  verificationReference: string;
  maskedMobile: string;
  signatureId: string;
  /** ISO timestamp rendered in Saudi Arabia time (+03:00). */
  signedAtKsa: string;
  authenticationReference: string;
  /** Optional verification QR URL, only rendered when it fits safely. */
  verificationUrl?: string | null;
};

export type LabelField = { labelAr: string; labelEn: string; value: string };

export type AuthenticationLabel = {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  fields: LabelField[];
  verificationUrl: string | null;
};

const MASKED_MOBILE_PATTERN = /^[*0-9+()\-\s]*\*+[*0-9+()\-\s]*$/;

function assertNeverSecret(value: string, fieldName: string): void {
  // A bare 6-digit value is indistinguishable from a secret verification
  // code and must never reach a printed label.
  if (/^\d{6}$/.test(value.trim())) {
    throw new ApiError(400, `${fieldName} must not contain a bare verification code`, {
      code: "LABEL_SECRET_VALUE_REJECTED",
    });
  }
}

export function buildElectronicAuthenticationLabel(
  evidence: AuthenticationEvidence,
): AuthenticationLabel {
  assertNeverSecret(evidence.verificationReference, "verificationReference");
  assertNeverSecret(evidence.authenticationReference, "authenticationReference");
  if (!MASKED_MOBILE_PATTERN.test(evidence.maskedMobile) || !evidence.maskedMobile.includes("*")) {
    throw new ApiError(400, "maskedMobile must be a masked value", {
      code: "LABEL_UNMASKED_MOBILE_REJECTED",
    });
  }
  return {
    titleAr: ARABIC_LABEL_TITLE,
    titleEn: ENGLISH_LABEL_TITLE,
    bodyAr: ARABIC_LABEL_BODY,
    bodyEn: ENGLISH_LABEL_BODY,
    fields: [
      {
        labelAr: "مرجع رمز التحقق",
        labelEn: "Verification Reference",
        value: evidence.verificationReference,
      },
      {
        labelAr: "الجوال المحجوب",
        labelEn: "Masked Mobile",
        value: evidence.maskedMobile,
      },
      {
        labelAr: "معرّف التوقيع",
        labelEn: "Signature ID",
        value: evidence.signatureId,
      },
      {
        labelAr: "تاريخ ووقت التوقيع بتوقيت المملكة",
        labelEn: "Signed At - Saudi Arabia Time",
        value: evidence.signedAtKsa,
      },
      {
        labelAr: "رقم التصديق الإلكتروني",
        labelEn: "Electronic Authentication Reference",
        value: evidence.authenticationReference,
      },
    ],
    verificationUrl: evidence.verificationUrl ?? null,
  };
}

export type HumanWitnessEvidence = {
  witnessRole: string;
  witnessDisplayName: string;
  employeeId: string | null;
  department: string | null;
  signatureId: string;
  signedAtKsa: string;
  authenticationReference: string;
  documentHash: string;
};

export function buildHumanWitnessLabel(evidence: HumanWitnessEvidence): AuthenticationLabel {
  assertNeverSecret(evidence.authenticationReference, "authenticationReference");
  return {
    titleAr: ARABIC_HUMAN_WITNESS_TITLE,
    titleEn: ENGLISH_HUMAN_WITNESS_TITLE,
    bodyAr:
      "تم توثيق حضور الشاهد للتوقيع إلكترونيًا عبر نظام واثق كير بعد التحقق من هوية الموقّع والتأكد من عدم وجود اعتراض أو إكراه ظاهر.",
    bodyEn:
      "Witness presence at signing authenticated through WathiqCare after identity verification and confirmation that no objection or apparent coercion was observed.",
    fields: [
      { labelAr: "دور الشاهد", labelEn: "Witness Role", value: evidence.witnessRole },
      {
        labelAr: "اسم الشاهد",
        labelEn: "Witness Name",
        value: evidence.witnessDisplayName,
      },
      {
        labelAr: "الرقم الوظيفي",
        labelEn: "Employee ID",
        value: evidence.employeeId ?? "—",
      },
      {
        labelAr: "معرّف التوقيع",
        labelEn: "Signature ID",
        value: evidence.signatureId,
      },
      {
        labelAr: "تاريخ ووقت التوقيع بتوقيت المملكة",
        labelEn: "Signed At - Saudi Arabia Time",
        value: evidence.signedAtKsa,
      },
      {
        labelAr: "رقم التصديق الإلكتروني",
        labelEn: "Electronic Authentication Reference",
        value: evidence.authenticationReference,
      },
    ],
    verificationUrl: null,
  };
}

/**
 * Safety assertion over a fully-built label before rendering:
 * - Arabic visible text must use رمز التحقق terminology and never show the
 *   Latin letters OTP;
 * - no field may leak a secret code or an unmasked mobile number.
 */
export function assertLabelContentSafe(label: AuthenticationLabel): void {
  const arabicVisible = [
    label.titleAr,
    label.bodyAr,
    ...label.fields.map((field) => `${field.labelAr} ${field.value}`),
  ].join(" ");
  if (arabicVisible.includes("OTP")) {
    throw new ApiError(409, "Arabic label must not display the Latin letters OTP", {
      code: "LABEL_ARABIC_OTP_REJECTED",
    });
  }
  if (!arabicVisible.includes("رمز التحقق")) {
    throw new ApiError(409, "Arabic label must contain رمز التحقق terminology", {
      code: "LABEL_ARABIC_TERMINOLOGY_MISSING",
    });
  }
  for (const field of label.fields) {
    if (/^\d{6}$/.test(field.value.trim())) {
      throw new ApiError(409, `Label field ${field.labelEn} leaks a verification code`, {
        code: "LABEL_SECRET_VALUE_REJECTED",
      });
    }
  }
}

export function labelToTextLines(label: AuthenticationLabel, lang: "ar" | "en"): LabelTextLine[] {
  if (lang === "ar") {
    return [
      { text: label.titleAr, weight: "title" },
      { text: label.bodyAr, weight: "body" },
      ...label.fields.map((field) => ({
        text: `${field.labelAr}: ${field.value}`,
        weight: "field" as const,
      })),
    ];
  }
  return [
    { text: label.titleEn, weight: "title" },
    { text: label.bodyEn, weight: "body" },
    ...label.fields.map((field) => ({
      text: `${field.labelEn}: ${field.value}`,
      weight: "field" as const,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Deterministic preview fixture (synthetic, non-clinical evidence)
// ---------------------------------------------------------------------------

export function buildWitnessAuthLabelPreviewFixture(): {
  fixtureMarker: string;
  templateFormReference: string;
  templateCode: string;
  page: number;
  calibration: WitnessLabelCalibration;
  routineLabel: AuthenticationLabel;
  witnessLabels: AuthenticationLabel[];
  rects: LabelRects;
} {
  const routineLabel = buildElectronicAuthenticationLabel({
    verificationReference: "VREF-PREVIEW-0001",
    maskedMobile: "+966 5****1234",
    signatureId: "sig-preview-0001",
    signedAtKsa: "2026-07-14T10:30:00+03:00",
    authenticationReference: "authref-preview-0001",
    verificationUrl: "https://preview.invalid/verify/authref-preview-0001",
  });
  const witnessLabels = [
    buildHumanWitnessLabel({
      witnessRole: "NURSING_REPRESENTATIVE",
      witnessDisplayName: "Preview Nurse (Synthetic)",
      employeeId: "EMP-PREVIEW-1",
      department: "Nursing",
      signatureId: "sig-preview-w1",
      signedAtKsa: "2026-07-14T10:35:00+03:00",
      authenticationReference: "authref-preview-w1",
      documentHash: "preview-document-hash-0001",
    }),
    buildHumanWitnessLabel({
      witnessRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
      witnessDisplayName: "Preview Patient Experience Rep (Synthetic)",
      employeeId: "EMP-PREVIEW-2",
      department: "Patient Experience",
      signatureId: "sig-preview-w2",
      signedAtKsa: "2026-07-14T10:36:00+03:00",
      authenticationReference: "authref-preview-w2",
      documentHash: "preview-document-hash-0001",
    }),
  ];
  return {
    fixtureMarker: TEST_FIXTURE_MARKER,
    templateFormReference: IMC_MR_1168_PAGE2_CALIBRATION.templateFormReference,
    templateCode: IMC_MR_1168_PAGE2_CALIBRATION.templateCode,
    page: IMC_MR_1168_PAGE2_CALIBRATION.page,
    calibration: IMC_MR_1168_PAGE2_CALIBRATION,
    routineLabel,
    witnessLabels,
    rects: buildWitnessAuthLabelRects(IMC_MR_1168_PAGE2_CALIBRATION),
  };
}
