/**
 * Lower-level deterministic Arabic font tests.
 *
 * These tests exercise the bundled Tajawal font bytes directly using a
 * shaping-capable font library so we can assert glyph IDs, joining, and
 * mixed-script preservation independent of the Chromium renderer.
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import fontkit from "fontkit";
import wawoff2 from "wawoff2";
import {
  TAJAWAL_ARABIC_400_WOFF2,
  TAJAWAL_LATIN_400_WOFF2,
} from "@/lib/server/acroform/fonts/bundled-font-data";

const ACCEPTANCE_ARABIC = "اختبار";
const ACCEPTANCE_MIXED = "اختبار WATHIQ رقم 006";

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:font\/woff2;base64,(.+)$/);
  assert.ok(match, "Expected a WOFF2 data URL");
  return Buffer.from(match[1], "base64");
}

async function openBundledFont(dataUrl: string): Promise<fontkit.Font> {
  const woff2Bytes = dataUrlToBuffer(dataUrl);
  assert.ok(woff2Bytes.length > 0, "Bundled font bytes must be non-empty");
  const ttfBytes = await wawoff2.decompress(woff2Bytes);
  assert.ok(ttfBytes.length > woff2Bytes.length, "Decompressed TTF must be larger than WOFF2");
  const font = fontkit.create(Buffer.from(ttfBytes));
  assert.ok(!("fonts" in font), "Expected a single font, not a font collection");
  return font as fontkit.Font;
}

test("bundled Arabic font data decodes to a valid font", async () => {
  const font = await openBundledFont(TAJAWAL_ARABIC_400_WOFF2);
  assert.equal(typeof font.familyName, "string");
  assert.ok(font.unitsPerEm > 0);
  assert.ok(font.numGlyphs > 100);
});

test("bundled Latin font data decodes to a valid font", async () => {
  const font = await openBundledFont(TAJAWAL_LATIN_400_WOFF2);
  assert.equal(typeof font.familyName, "string");
  assert.ok(font.unitsPerEm > 0);
  assert.ok(font.numGlyphs > 50);
});

test("Arabic shaping produces non-.notdef glyph IDs for Arabic letters", async () => {
  const font = await openBundledFont(TAJAWAL_ARABIC_400_WOFF2);
  const run = font.layout(ACCEPTANCE_ARABIC);
  const arabicGlyphs = run.glyphs.filter((g) =>
    g.codePoints.some((cp) => cp >= 0x0600 && cp <= 0x06ff),
  );
  assert.ok(arabicGlyphs.length > 0, "Arabic letters should shape to glyphs");
  assert.ok(
    arabicGlyphs.every((g) => g.id !== 0),
    "Arabic letters must not map to .notdef",
  );
});

test("Arabic joining produces positioned presentation-form glyphs", async () => {
  const font = await openBundledFont(TAJAWAL_ARABIC_400_WOFF2);
  const run = font.layout(ACCEPTANCE_ARABIC);
  const glyphNames = run.glyphs.map((g) => g.name ?? "");

  // Presentation forms (initial/medial/final) are evidence that the shaper
  // applied Arabic joining (GSUB features) rather than emitting isolated glyphs.
  const hasJoinedForms = glyphNames.some((name) =>
    /^(uniFE[0-9A-F]{2}|uniFB[0-9A-F]{2})/i.test(name),
  );
  assert.ok(hasJoinedForms, `Expected presentation forms among ${glyphNames.join(", ")}`);

  const totalAdvance = run.positions.reduce((sum, p) => sum + p.xAdvance, 0);
  assert.ok(totalAdvance > 0, "Shaped glyphs must have positive advance width");
});

test("mixed Arabic/Latin/digit input preserves all script segments", async () => {
  const arabicFont = await openBundledFont(TAJAWAL_ARABIC_400_WOFF2);
  const latinFont = await openBundledFont(TAJAWAL_LATIN_400_WOFF2);

  const arabicRun = arabicFont.layout(ACCEPTANCE_MIXED);
  const latinRun = latinFont.layout(ACCEPTANCE_MIXED);

  const arabicGlyphCount = arabicRun.glyphs.filter((g) =>
    g.codePoints.some((cp) => cp >= 0x0600 && cp <= 0x06ff),
  ).length;
  const latinGlyphCount = latinRun.glyphs.filter((g) =>
    g.codePoints.some((cp) => (cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0030 && cp <= 0x0039)),
  ).length;

  assert.ok(arabicGlyphCount > 0, "Arabic segment must produce glyphs");
  assert.ok(latinGlyphCount > 0, "Latin/digit segment must produce glyphs");
});

test("failure to decode invalid font bytes fails closed", async () => {
  const invalid = Buffer.from("not a font");
  await assert.rejects(async () => wawoff2.decompress(invalid), /Error|error/);
});

test("fontkit rejects a non-font buffer", async () => {
  await assert.rejects(async () => fontkit.create(Buffer.from("not a font")), /font/);
});

test("bundled font bytes match the pinned @fontsource files", async () => {
  const candidates = [
    path.join(process.cwd(), "node_modules", "@fontsource", "tajawal", "files", "tajawal-arabic-400-normal.woff2"),
    path.join(process.cwd(), "..", "..", "node_modules", "@fontsource", "tajawal", "files", "tajawal-arabic-400-normal.woff2"),
    path.join(process.cwd(), "..", "node_modules", "@fontsource", "tajawal", "files", "tajawal-arabic-400-normal.woff2"),
  ];
  let sourceBytes: Buffer | undefined;
  for (const candidate of candidates) {
    try {
      sourceBytes = fs.readFileSync(candidate);
      break;
    } catch {
      // try next candidate
    }
  }
  assert.ok(sourceBytes, "Could not locate source @fontsource file for comparison");
  const bundledBytes = dataUrlToBuffer(TAJAWAL_ARABIC_400_WOFF2);
  assert.deepEqual(bundledBytes, sourceBytes, "Bundled bytes must equal the pinned source file");
});
