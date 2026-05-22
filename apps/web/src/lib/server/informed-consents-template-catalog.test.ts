import assert from "node:assert/strict";
import test from "node:test";

import {
  isMissingConsentTemplateSchemaError,
  ensureConsentTemplateSchema,
  normalizeRuntimeConsentType,
  normalizeRuntimeDepartment,
  normalizeRuntimeSpecialty,
  templateMatchesRuntimeFilter,
} from "@/lib/server/informed-consents-template-catalog";

test("detects missing consent template schema errors", () => {
  assert.equal(isMissingConsentTemplateSchemaError({ code: "P2021" }), true);
  assert.equal(isMissingConsentTemplateSchemaError({ code: "P2022" }), true);
  assert.equal(isMissingConsentTemplateSchemaError({ meta: { code: "42P01" } }), true);
  assert.equal(isMissingConsentTemplateSchemaError({ code: "P2002" }), false);
});

test("ensureConsentTemplateSchema creates the missing consent template relations", async () => {
  const sqlStatements: string[] = [];

  const fakePrisma = {
    $executeRawUnsafe: async (sql: string) => {
      sqlStatements.push(sql);
      return 0;
    },
  };

  await ensureConsentTemplateSchema(fakePrisma as never);

  assert.equal(sqlStatements.length > 0, true);
  assert.equal(
    sqlStatements.some((statement) => statement.includes("CREATE TABLE IF NOT EXISTS consent_templates")),
    true,
  );
  assert.equal(
    sqlStatements.some((statement) => statement.includes("CREATE TABLE IF NOT EXISTS consent_template_localizations")),
    true,
  );
});

test("normalizeRuntimeConsentType canonicalizes legacy informed consent aliases", () => {
  assert.equal(normalizeRuntimeConsentType("SURGICAL_CONSENT"), "SURGERY_CONSENT");
  assert.equal(normalizeRuntimeConsentType("blood transfusion"), "BLOOD_TRANSFUSION_CONSENT");
});

test("normalizeRuntimeSpecialty and department normalize encounter labels", () => {
  assert.equal(normalizeRuntimeSpecialty("General Surgery"), "SURGERY");
  assert.equal(normalizeRuntimeDepartment("General Surgery"), "GENERAL_SURGERY");
});

test("templateMatchesRuntimeFilter accepts canonicalized consent filters", () => {
  const surgicalTemplate = {
    consentType: "SURGERY_CONSENT",
    specialty: "SURGERY",
    department: "GENERAL_SURGERY",
  };

  assert.equal(
    templateMatchesRuntimeFilter(surgicalTemplate, {
      consentType: "SURGICAL_CONSENT",
      specialty: "GENERAL_SURGERY",
      department: "General Surgery",
    }),
    true,
  );
});

test("templateMatchesRuntimeFilter keeps general templates available across encounter departments", () => {
  const generalTemplate = {
    consentType: "GENERAL_CONSENT",
    specialty: "GENERAL_MEDICINE",
    department: "GENERAL_MEDICINE",
  };

  assert.equal(
    templateMatchesRuntimeFilter(generalTemplate, {
      consentType: "GENERAL_CONSENT",
      specialty: "GENERAL_SURGERY",
      department: "General Surgery",
    }),
    true,
  );
});
