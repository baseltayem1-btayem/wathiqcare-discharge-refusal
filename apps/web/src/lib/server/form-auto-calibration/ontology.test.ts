import assert from "node:assert/strict";
import test from "node:test";
import {
  getOntologyField,
  getAllOntologyKeys,
  getOntologyFieldsByRole,
} from "./ontology/consent-field-ontology";
import {
  findExactAliasMatches,
  findPartialAliasMatches,
} from "./ontology/ontology-aliases";

test("ontology contains required canonical keys", () => {
  const keys = getAllOntologyKeys();
  assert.ok(keys.includes("patient.name"));
  assert.ok(keys.includes("patient.mrn"));
  assert.ok(keys.includes("patient.date_of_birth"));
  assert.ok(keys.includes("procedure.condition.en"));
  assert.ok(keys.includes("procedure.condition.ar"));
  assert.ok(keys.includes("physician.signature"));
  assert.ok(keys.includes("patient.signature"));
  assert.ok(keys.includes("witness.1.signature"));
  assert.ok(keys.includes("witness.2.signature"));
  assert.ok(keys.includes("refusal.signature"));
});

test("ontology field metadata is complete", () => {
  const field = getOntologyField("patient.name");
  assert.ok(field);
  assert.equal(field.dataType, "string");
  assert.equal(field.role, "SYSTEM");
  assert.equal(field.sensitivity, "PHI_NAME");
  assert.equal(field.requiredness, "ALWAYS");
  assert.equal(field.aiMappingRequiresConfirmation, false);
});

test("English aliases match exact text", () => {
  const matches = findExactAliasMatches("Patient Name");
  assert.ok(matches.some((m) => m.field.key === "patient.name" && m.matchedLanguage === "EN"));
});

test("Arabic aliases match exact text", () => {
  const matches = findExactAliasMatches("اسم المريض");
  assert.ok(matches.some((m) => m.field.key === "patient.name" && m.matchedLanguage === "AR"));
});

test("partial alias matching finds procedure fields", () => {
  const matches = findPartialAliasMatches("significant risks and options");
  assert.ok(matches.length > 0);
  assert.ok(matches.some((m) => m.field.key.startsWith("procedure.significant_risks")));
});

test("signature fields require human confirmation for AI mapping", () => {
  const physicianSig = getOntologyField("physician.signature");
  const patientSig = getOntologyField("patient.signature");
  assert.equal(physicianSig?.aiMappingRequiresConfirmation, true);
  assert.equal(patientSig?.aiMappingRequiresConfirmation, true);
});

test("ontology role lookups are correct", () => {
  const physicianFields = getOntologyFieldsByRole("PHYSICIAN");
  assert.ok(physicianFields.length > 0);
  assert.ok(physicianFields.some((f) => f.key === "physician.signature"));
});
