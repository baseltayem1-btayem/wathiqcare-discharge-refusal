import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  clinicalTypeLabel,
  groupFieldsIntoBilingualPairs,
  isTechnicalTypeLabel,
} from "./DoctorCompletionPanel";

const panelPath = path.join(process.cwd(), "src", "components", "informed-consents", "production-workspace", "components", "enterprise", "DoctorCompletionPanel.tsx");

test("DoctorCompletionPanel source does not contain mojibake separator", () => {
  const source = fs.readFileSync(panelPath, "utf-8");
  assert.ok(!source.includes("Â·"), "Source must not contain mojibake bullet (Â·)");
  assert.ok(source.includes("·"), "Source should contain proper middle-dot separator (·)");
});

test("clinicalTypeLabel maps technical types to physician-friendly labels", () => {
  assert.equal(clinicalTypeLabel("MULTILINE_TEXT", "en"), "Doctor statement");
  assert.equal(clinicalTypeLabel("TEXT", "en"), "Statement");
  assert.equal(clinicalTypeLabel("SIGNATURE", "en"), "Signature");
  assert.equal(clinicalTypeLabel("CHECKBOX", "en"), "Decision");
});

test("isTechnicalTypeLabel identifies raw implementation types", () => {
  assert.equal(isTechnicalTypeLabel("MULTILINE_TEXT"), true);
  assert.equal(isTechnicalTypeLabel("TEXT"), true);
  assert.equal(isTechnicalTypeLabel("SIGNATURE"), true);
  assert.equal(isTechnicalTypeLabel("Doctor statement"), false);
  assert.equal(isTechnicalTypeLabel("Statement"), false);
});

test("groupFieldsIntoBilingualPairs groups English and Arabic counterparts", () => {
  const fields = [
    { key: "condition_description_en", labelEn: "Condition in patient's own words", section: "B", type: "MULTILINE_TEXT" },
    { key: "condition_description_ar", labelEn: "Condition in patient's own words (Arabic)", section: "B", type: "MULTILINE_TEXT" },
    { key: "physician_signature", labelEn: "Doctor/delegate signature", type: "SIGNATURE" },
  ];

  const pairs = groupFieldsIntoBilingualPairs(fields);
  assert.equal(pairs.length, 2);

  const conditionPair = pairs.find((p) => p.key === "condition_description")!;
  assert.ok(conditionPair.en);
  assert.ok(conditionPair.ar);
  assert.equal(conditionPair.en.key, "condition_description_en");
  assert.equal(conditionPair.ar.key, "condition_description_ar");

  const signaturePair = pairs.find((p) => p.key === "physician_signature")!;
  assert.ok(signaturePair.en);
  assert.equal(signaturePair.ar, undefined);
});

test("groupFieldsIntoBilingualPairs preserves section and type on pairs", () => {
  const fields = [
    { key: "significant_risks_options_en", labelEn: "Significant risks and procedure options", section: "D", type: "MULTILINE_TEXT" },
    { key: "significant_risks_options_ar", labelEn: "Significant risks and procedure options (Arabic)", section: "D", type: "MULTILINE_TEXT" },
  ];

  const pairs = groupFieldsIntoBilingualPairs(fields);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].section, "D");
  assert.equal(pairs[0].type, "MULTILINE_TEXT");
});
