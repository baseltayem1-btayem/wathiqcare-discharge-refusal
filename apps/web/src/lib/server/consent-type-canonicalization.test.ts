import test from "node:test";
import assert from "node:assert/strict";
import {
  buildConsentMappingValidationRows,
  normalizeConsentType,
} from "@/lib/consent-type-canonicalization";
import { SAUDI_ENTERPRISE_TEMPLATES } from "@/lib/server/informed-consents-saudi-template-library";

test("normalizes informed consent aliases to canonical catalog values", () => {
  assert.equal(normalizeConsentType("SURGICAL_CONSENT"), "SURGERY_CONSENT");
  assert.equal(normalizeConsentType("GENERAL_SURGERY"), "SURGERY_CONSENT");
  assert.equal(normalizeConsentType("BLOOD_TRANSFUSION"), "BLOOD_TRANSFUSION_CONSENT");
  assert.equal(normalizeConsentType("blood-transfusion"), "BLOOD_TRANSFUSION_CONSENT");
  assert.equal(normalizeConsentType("SURGERY_CONSENT"), "SURGERY_CONSENT");
});

test("validation rows confirm templates exist for all required consent aliases", () => {
  const rows = buildConsentMappingValidationRows(
    ["SURGICAL_CONSENT", "BLOOD_TRANSFUSION", "GENERAL_SURGERY"],
    SAUDI_ENTERPRISE_TEMPLATES.map((template) => template.consentType),
  );

  assert.deepEqual(rows, [
    {
      originalValue: "SURGICAL_CONSENT",
      normalizedValue: "SURGERY_CONSENT",
      templateFound: true,
    },
    {
      originalValue: "BLOOD_TRANSFUSION",
      normalizedValue: "BLOOD_TRANSFUSION_CONSENT",
      templateFound: true,
    },
    {
      originalValue: "GENERAL_SURGERY",
      normalizedValue: "SURGERY_CONSENT",
      templateFound: true,
    },
  ]);
});
