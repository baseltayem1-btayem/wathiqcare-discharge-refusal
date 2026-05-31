import assert from "node:assert/strict";
import test from "node:test";

import {
  collectArabicMojibakeDiagnostics,
  containsArabicMojibake,
  normalizeArabicForPatientFacingText,
} from "@/lib/server/arabic-mojibake-guard";

test("repairs common Arabic mojibake payloads via latin1-to-utf8 normalization", () => {
  const source = "الخطر المتوقع";
  const corrupted = Buffer.from(source, "utf8").toString("latin1");
  const repaired = normalizeArabicForPatientFacingText(corrupted);

  assert.notEqual(repaired, corrupted);
  assert.equal(repaired, source);
  assert.equal(containsArabicMojibake(repaired), false);
});

test("repairs deeper multi-pass mojibake corruption", () => {
  const source = "الموافقة المستنيرة";
  const corruptedOnce = Buffer.from(source, "utf8").toString("latin1");
  const corruptedTwice = Buffer.from(corruptedOnce, "utf8").toString("latin1");
  const repaired = normalizeArabicForPatientFacingText(corruptedTwice);

  assert.equal(repaired, source);
  assert.equal(containsArabicMojibake(repaired), false);
});

test("flags patient-facing Arabic fields that remain mojibake after normalization", () => {
  const diagnostics = collectArabicMojibakeDiagnostics([
    {
      fieldPath: "pdplTextAr",
      value: "ÙÙÙÙ",
    },
    {
      fieldPath: "legalTextAr",
      value: "النص العربي السليم",
    },
  ]);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.fieldPath, "pdplTextAr");
});

test("does not mutate valid Arabic patient-facing text", () => {
  const original = "هذا نص خصوصية عربي صحيح.";
  assert.equal(normalizeArabicForPatientFacingText(original), original);
});