import assert from "node:assert/strict";
import test from "node:test";

import {
  isMissingConsentTemplateSchemaError,
  ensureConsentTemplateSchema,
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
