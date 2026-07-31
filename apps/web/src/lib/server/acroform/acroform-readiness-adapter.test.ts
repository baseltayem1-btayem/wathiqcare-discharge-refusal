import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAcroFormReadinessAdapter,
  mergeAcroFormReadinessIntoFieldMappingReadiness,
} from "@/lib/server/acroform/acroform-readiness-adapter";

test("buildAcroFormReadinessAdapter returns null for non-AcroForm identifiers", () => {
  assert.equal(buildAcroFormReadinessAdapter("imc-approved-adenotonsillectomy"), null);
  assert.equal(buildAcroFormReadinessAdapter("some-uuid"), null);
});

test("buildAcroFormReadinessAdapter exposes canonical identity and READY manifest for imc-approved-amputation", () => {
  const adapter = buildAcroFormReadinessAdapter("imc-approved-amputation");
  assert.ok(adapter);
  assert.equal(adapter.canonicalTemplateIdentity.formId, "imc-approved-amputation");
  assert.equal(adapter.canonicalTemplateIdentity.slug, "amputation");
  assert.equal(adapter.canonicalTemplateIdentity.templateCode, "IMC MR 1135");
  assert.equal(adapter.manifestState.present, true);
  assert.equal(adapter.manifestState.hashMatches, true);
  assert.equal(adapter.manifestState.status, "READY");
  assert.equal(adapter.manifestState.blockers.length, 0);
});

test("buildAcroFormReadinessAdapter resolves aliases to the same canonical readiness", () => {
  const aliases = ["amputation", "IMC MR 1135", "MR1135", "imc-mr-1135"];
  for (const alias of aliases) {
    const adapter = buildAcroFormReadinessAdapter(alias);
    assert.ok(adapter, `expected alias "${alias}" to produce an adapter`);
    assert.equal(adapter.canonicalTemplateIdentity.formId, "imc-approved-amputation");
    assert.equal(adapter.manifestState.status, "READY");
  }
});

test("buildAcroFormReadinessAdapter exposes semantic physician fields for MR1135", () => {
  const adapter = buildAcroFormReadinessAdapter("imc-approved-amputation");
  assert.ok(adapter);
  const physicianFieldKeys = adapter.semanticPhysicianFields.map((field) => field.key);
  assert.ok(physicianFieldKeys.includes("condition_description_en"));
  assert.ok(physicianFieldKeys.includes("condition_description_ar"));
  assert.ok(physicianFieldKeys.includes("proposed_procedure_en"));
  assert.ok(physicianFieldKeys.includes("physician_signature"));
  assert.ok(adapter.semanticPhysicianFields.length > 0);
});

test("buildAcroFormReadinessAdapter exposes patient and physician signature targets", () => {
  const adapter = buildAcroFormReadinessAdapter("imc-approved-amputation");
  assert.ok(adapter);
  assert.ok(adapter.patientSignatureTargets.some((target) => target.key === "patient_signature"));
  assert.ok(adapter.physicianSignatureTargets.some((target) => target.key === "physician_signature"));
});

test("buildAcroFormReadinessAdapter exposes applicability flags for MR1135", () => {
  const adapter = buildAcroFormReadinessAdapter("imc-approved-amputation");
  assert.ok(adapter);
  assert.equal(adapter.interpreterApplicable, true);
  assert.equal(adapter.anesthesiaApplicable, true);
  assert.equal(adapter.educationRequired, true);
  assert.equal(adapter.substituteDecisionMakerApplicable, true);
  assert.equal(adapter.witnessApplicable, true);
});

test("mergeAcroFormReadinessIntoFieldMappingReadiness keeps non-AcroForm readiness unchanged", () => {
  const base = {
    formId: "imc-approved-adenotonsillectomy",
    slug: "adenotonsillectomy",
    hasMapping: true,
    verificationStatus: "DRAFT",
    sendBlocked: true,
    blockers: ["Consent field mapping is not verified."],
    requiredDoctorFields: [{ key: "condition_and_treatment", labelEn: "Condition and treatment", type: "MULTILINE_TEXT" }],
    requiredAnesthesiaFields: [],
    requiredPatientFields: [{ key: "patient_signature", labelEn: "Patient signature", type: "SIGNATURE" }],
  };
  const merged = mergeAcroFormReadinessIntoFieldMappingReadiness(base);
  assert.equal(merged.acroForm, null);
  assert.equal(merged.formId, "imc-approved-adenotonsillectomy");
  assert.equal(merged.requiredDoctorFields.length, 1);
});

test("mergeAcroFormReadinessIntoFieldMappingReadiness replaces alias with canonical MR1135 identity and fields", () => {
  const base = {
    formId: "MR 1135",
    hasMapping: false,
    verificationStatus: "MISSING",
    sendBlocked: true,
    blockers: ["No consent field mapping found for this form."],
    requiredDoctorFields: [],
    requiredAnesthesiaFields: [],
    requiredPatientFields: [],
  };
  const merged = mergeAcroFormReadinessIntoFieldMappingReadiness(base);
  assert.ok(merged.acroForm);
  assert.equal(merged.formId, "imc-approved-amputation");
  assert.equal(merged.slug, "amputation");
  assert.equal(merged.hasMapping, true);
  assert.equal(merged.verificationStatus, "VERIFIED");
  assert.ok(merged.requiredDoctorFields.length > 0);
  assert.ok(merged.requiredPatientFields.length > 0);
  assert.equal(merged.acroForm.manifestState.status, "READY");
});
