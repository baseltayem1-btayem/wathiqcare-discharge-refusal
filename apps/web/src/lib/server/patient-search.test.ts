import assert from "node:assert/strict";
import test from "node:test";

import {
  isUatMrnAliasEnabled,
  normalizePatientSearchQuery,
} from "./patient-search";

test("normalizePatientSearchQuery trims and uppercases official MRNs", () => {
  const normalized = normalizePatientSearchQuery("  imc-2026-02000  ");

  assert.equal(normalized.trimmedQuery, "imc-2026-02000");
  assert.equal(normalized.canonicalQuery, "IMC-2026-02000");
  assert.deepEqual(normalized.mrnVariants, ["IMC-2026-02000"]);
});

test("normalizePatientSearchQuery maps MRN alias to IMC only when UAT alias is enabled", () => {
  const disabled = normalizePatientSearchQuery("mrn-2026-02000", { enableUatMrnAlias: false });
  const enabled = normalizePatientSearchQuery("mrn-2026-02000", { enableUatMrnAlias: true });

  assert.equal(disabled.canonicalQuery, "MRN-2026-02000");
  assert.deepEqual(disabled.mrnVariants, ["MRN-2026-02000"]);

  assert.equal(enabled.canonicalQuery, "IMC-2026-02000");
  assert.deepEqual(enabled.mrnVariants, ["MRN-2026-02000", "IMC-2026-02000"]);
});

test("normalizePatientSearchQuery preserves non-MRN patient name input", () => {
  const normalized = normalizePatientSearchQuery(" Najib ");

  assert.equal(normalized.trimmedQuery, "Najib");
  assert.equal(normalized.canonicalQuery, "Najib");
  assert.equal(normalized.containsQuery, "Najib");
  assert.deepEqual(normalized.mrnVariants, []);
});

test("isUatMrnAliasEnabled reads the explicit env flag", () => {
  const previousValue = process.env.ENABLE_UAT_MRN_ALIAS;

  process.env.ENABLE_UAT_MRN_ALIAS = "true";
  assert.equal(isUatMrnAliasEnabled(), true);

  process.env.ENABLE_UAT_MRN_ALIAS = "false";
  assert.equal(isUatMrnAliasEnabled(), false);

  if (previousValue === undefined) {
    delete process.env.ENABLE_UAT_MRN_ALIAS;
  } else {
    process.env.ENABLE_UAT_MRN_ALIAS = previousValue;
  }
});