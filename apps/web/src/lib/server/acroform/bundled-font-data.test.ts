/**
 * Tests for the bundled overlay font byte module.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  TAJAWAL_ARABIC_400_WOFF2,
  TAJAWAL_ARABIC_700_WOFF2,
  TAJAWAL_LATIN_400_WOFF2,
  TAJAWAL_LATIN_700_WOFF2,
  TAJAWAL_ARABIC_400_WOFF2_BYTE_LENGTH,
  TAJAWAL_ARABIC_700_WOFF2_BYTE_LENGTH,
  TAJAWAL_LATIN_400_WOFF2_BYTE_LENGTH,
  TAJAWAL_LATIN_700_WOFF2_BYTE_LENGTH,
} from "@/lib/server/acroform/fonts/bundled-font-data";
import { buildInlinePdfFontFaceCss } from "@/lib/server/acroform/field-addressed-overlay-helpers";

function assertDataUrl(value: string, expectedFamily: string) {
  assert.match(value, /^data:font\/woff2;base64,[A-Za-z0-9+/=]+$/);
  const base64 = value.split(",")[1];
  const decoded = Buffer.from(base64, "base64");
  assert.ok(decoded.length > 100, `${expectedFamily} font bytes must be non-empty`);
  // WOFF2 files start with the signature "wOF2".
  assert.equal(decoded.subarray(0, 4).toString("binary"), "wOF2", `${expectedFamily} must be a WOFF2 file`);
}

test("all bundled font data URLs are valid non-empty WOFF2 files", () => {
  assertDataUrl(TAJAWAL_ARABIC_400_WOFF2, "WathiqOverlayArabic 400");
  assertDataUrl(TAJAWAL_ARABIC_700_WOFF2, "WathiqOverlayArabic 700");
  assertDataUrl(TAJAWAL_LATIN_400_WOFF2, "WathiqOverlaySans 400");
  assertDataUrl(TAJAWAL_LATIN_700_WOFF2, "WathiqOverlaySans 700");
});

test("exported byte lengths match the decoded base64 length", () => {
  const lengths = [
    [TAJAWAL_ARABIC_400_WOFF2, TAJAWAL_ARABIC_400_WOFF2_BYTE_LENGTH],
    [TAJAWAL_ARABIC_700_WOFF2, TAJAWAL_ARABIC_700_WOFF2_BYTE_LENGTH],
    [TAJAWAL_LATIN_400_WOFF2, TAJAWAL_LATIN_400_WOFF2_BYTE_LENGTH],
    [TAJAWAL_LATIN_700_WOFF2, TAJAWAL_LATIN_700_WOFF2_BYTE_LENGTH],
  ] as const;
  for (const [dataUrl, expectedLength] of lengths) {
    const decoded = Buffer.from(dataUrl.split(",")[1], "base64");
    assert.equal(decoded.length, expectedLength);
  }
});

test("buildInlinePdfFontFaceCss returns a deterministic CSS block with all four faces", () => {
  const css = buildInlinePdfFontFaceCss();
  assert.ok(css.includes("WathiqOverlayArabic"));
  assert.ok(css.includes("WathiqOverlaySans"));
  assert.ok(css.includes(TAJAWAL_ARABIC_400_WOFF2));
  assert.ok(css.includes(TAJAWAL_ARABIC_700_WOFF2));
  assert.ok(css.includes(TAJAWAL_LATIN_400_WOFF2));
  assert.ok(css.includes(TAJAWAL_LATIN_700_WOFF2));
  assert.equal((css.match(/@font-face/g) || []).length, 4);
});
