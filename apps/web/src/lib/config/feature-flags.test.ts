import assert from "node:assert/strict";
import test from "node:test";

const originalEnv = process.env;

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}

test("envBool returns default when env var is missing or empty", () => {
  delete process.env["FF_TEST_FLAG"];
  assert.equal(envBool("FF_TEST_FLAG", false), false);
  assert.equal(envBool("FF_TEST_FLAG", true), true);

  process.env["FF_TEST_FLAG"] = "";
  assert.equal(envBool("FF_TEST_FLAG", false), false);
  assert.equal(envBool("FF_TEST_FLAG", true), true);
});

test("envBool parses true variants", () => {
  for (const value of ["true", "TRUE", "True", "1"]) {
    process.env["FF_TEST_FLAG"] = value;
    assert.equal(envBool("FF_TEST_FLAG", false), true);
  }
});

test("envBool parses false variants", () => {
  for (const value of ["false", "FALSE", "False", "0", "yes", "no"]) {
    process.env["FF_TEST_FLAG"] = value;
    assert.equal(envBool("FF_TEST_FLAG", true), false);
  }
});

test("FEATURE_FLAGS includes all CKE flags", async () => {
  const flags = await import("./feature-flags");

  assert.ok("ENABLE_CLINICAL_KNOWLEDGE_ENGINE" in flags.FEATURE_FLAGS);
  assert.ok("ENABLE_CKE_PROCEDURE_CATALOG" in flags.FEATURE_FLAGS);
  assert.ok("ENABLE_CKE_PACKAGE_ASSEMBLY" in flags.FEATURE_FLAGS);
  assert.ok("ENABLE_CKE_DECISION_RULES" in flags.FEATURE_FLAGS);
  assert.ok("ENABLE_CKE_INFORMED_CONSENT_UI" in flags.FEATURE_FLAGS);
  assert.ok("ENABLE_CKE_GOVERNANCE_UI" in flags.FEATURE_FLAGS);
});
