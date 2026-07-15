import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcroFormBackedTemplate,
  resolveCanonicalAcroFormTemplateId,
} from "@/lib/server/acroform/acroform-template-identity";

test("resolveCanonicalAcroFormTemplateId resolves manifest id imc-approved-amputation", () => {
  const identity = resolveCanonicalAcroFormTemplateId("imc-approved-amputation");
  assert.ok(identity);
  assert.equal(identity.canonicalFormId, "imc-approved-amputation");
  assert.equal(identity.slug, "amputation");
  assert.equal(identity.templateCode, "IMC MR 1135");
  assert.equal(identity.layoutFamily, "IMC_MR_1135_ACROFORM");
});

test("resolveCanonicalAcroFormTemplateId resolves manifest slug amputation", () => {
  const identity = resolveCanonicalAcroFormTemplateId("amputation");
  assert.ok(identity);
  assert.equal(identity.canonicalFormId, "imc-approved-amputation");
});

test("resolveCanonicalAcroFormTemplateId resolves human template code IMC MR 1135", () => {
  for (const alias of ["IMC MR 1135", "imc mr 1135", "MR 1135", "MR1135", "imc-mr-1135"]) {
    const identity = resolveCanonicalAcroFormTemplateId(alias);
    assert.ok(identity, `expected alias "${alias}" to resolve`);
    assert.equal(identity.canonicalFormId, "imc-approved-amputation");
  }
});

test("resolveCanonicalAcroFormTemplateId is deterministic for all aliases", () => {
  const aliases = [
    "imc-approved-amputation",
    "amputation",
    "IMC MR 1135",
    "imc mr 1135",
    "MR 1135",
    "MR1135",
    "imc-mr-1135",
  ];
  const canonicalIds = new Set<string>();
  for (const alias of aliases) {
    const identity = resolveCanonicalAcroFormTemplateId(alias);
    assert.ok(identity);
    canonicalIds.add(identity.canonicalFormId);
  }
  assert.equal(canonicalIds.size, 1);
});

test("resolveCanonicalAcroFormTemplateId returns null for unrelated identifiers", () => {
  const unrelated = [
    "imc-approved-adenotonsillectomy",
    "adenotonsillectomy",
    "some-uuid",
    "appendectomy",
    "",
  ];
  for (const id of unrelated) {
    assert.equal(resolveCanonicalAcroFormTemplateId(id), null, `expected "${id}" to not resolve`);
  }
});

test("isAcroFormBackedTemplate returns true only for registered aliases", () => {
  assert.equal(isAcroFormBackedTemplate("imc-approved-amputation"), true);
  assert.equal(isAcroFormBackedTemplate("MR 1135"), true);
  assert.equal(isAcroFormBackedTemplate("imc-approved-adenotonsillectomy"), false);
  assert.equal(isAcroFormBackedTemplate("random-id"), false);
});
