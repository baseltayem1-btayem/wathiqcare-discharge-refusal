import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import {
  WITNESS_POLICY_VERSION,
  evaluateWitnessPolicy,
  extractStoredPolicyDecision,
  type WitnessPolicyDecision,
} from "@/lib/server/witness-policy-service";
import {
  GOVERNED_CODE_PROFILE_SOURCE,
  WITNESS_POLICY_PROFILES,
  resolveTemplateWitnessPolicy,
} from "@/lib/server/witness-policy-profiles";

const FIXED_EVALUATED_AT = "2026-07-14T07:00:00.000Z";

const IMC_TEMPLATE_CODE = "imc-adenotonsillectomy";
const IMC_TEMPLATE_VERSION = "2018-02";
const IMC_POLICY_VERSION = "1.1.0";

function evaluateForTemplate(input: {
  metadata?: unknown;
  templateCode?: string | null;
  templateVersionLabel?: string | null;
  templateRequiresWitness?: boolean;
  templateRiskLevel?: string | null;
  triggers?: Parameters<typeof evaluateWitnessPolicy>[0]["triggers"];
}): WitnessPolicyDecision {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: input.metadata ?? null,
    templateCode: input.templateCode,
    templateVersionLabel: input.templateVersionLabel,
  });
  return evaluateWitnessPolicy({
    templateRequiresWitness: input.templateRequiresWitness ?? false,
    templateRiskLevel: input.templateRiskLevel ?? "MEDIUM",
    templatePolicy: resolved.policy,
    templatePolicySource: resolved.policySource ?? undefined,
    triggers: input.triggers,
    evaluatedAt: FIXED_EVALUATED_AT,
  });
}

// --- Registry integrity ------------------------------------------------------
test("registry prevents ambiguous profiles by construction (unique templateCode)", () => {
  const codes = WITNESS_POLICY_PROFILES.map((profile) => profile.templateCode);
  assert.equal(new Set(codes).size, codes.length);
});

test("IMC MR 1168 profile carries the governed values from the authoritative spec", () => {
  const profile = WITNESS_POLICY_PROFILES.find((p) => p.templateCode === IMC_TEMPLATE_CODE);
  assert.ok(profile, "expected a governed profile for imc-adenotonsillectomy");
  assert.equal(profile.templateFormReference, "IMC MR 1168");
  assert.equal(profile.templateVersion, IMC_TEMPLATE_VERSION);
  assert.equal(profile.policyVersion, IMC_POLICY_VERSION);
  assert.equal(profile.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.equal(profile.effectiveState, "PREVIEW_ACTIVE");
  assert.match(profile.governanceNote, /governance approval/i);
  assert.equal(profile.policy.witnessMode, "CONDITIONAL");
  assert.equal(profile.policy.requiredWitnessCount, 0);
  assert.deepEqual(profile.policy.requiredWitnessRoles, [
    "NURSING_REPRESENTATIVE",
    "PATIENT_EXPERIENCE_REPRESENTATIVE",
  ]);
  assert.equal(profile.policy.allowSamePersonMultipleRoles, false);
});

// --- Exact code + version match ----------------------------------------------
test("exact code+version match resolves the CONDITIONAL governed profile with zero witnesses", () => {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: null,
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(resolved.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.ok(resolved.profile);
  assert.equal(resolved.policy?.witnessMode, "CONDITIONAL");

  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(decision.witnessMode, "CONDITIONAL");
  assert.equal(decision.requiredWitnessCount, 0);
  assert.deepEqual(decision.requiredWitnessRoles, []);
  assert.equal(decision.policyVersion, IMC_POLICY_VERSION);
  assert.equal(decision.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.deepEqual(decision.triggerCodes, []);
});

test("explicit template metadata witnessPolicy takes precedence over the registry profile", () => {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: { witnessPolicy: { witnessMode: "REQUIRED", policyVersion: "9.9.9" } },
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(resolved.policySource, "TEMPLATE_METADATA");
  assert.equal(resolved.profile, null);

  const decision = evaluateForTemplate({
    metadata: { witnessPolicy: { witnessMode: "REQUIRED", policyVersion: "9.9.9" } },
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.policySource, "TEMPLATE_METADATA");
  assert.equal(decision.policyVersion, "9.9.9");
});

// --- Other templates unaffected ----------------------------------------------
test("other template codes are unaffected (no profile, default routine behaviour)", () => {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: null,
    templateCode: "imc-some-other-form",
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(resolved.policy, null);
  assert.equal(resolved.profile, null);

  const decision = evaluateForTemplate({
    templateCode: "imc-some-other-form",
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(decision.witnessMode, "NONE");
  assert.equal(decision.requiredWitnessCount, 0);
  assert.equal(decision.policySource, "DEFAULT_ROUTINE");
  assert.equal(decision.policyVersion, WITNESS_POLICY_VERSION);
});

// --- Legacy paper behaviour preserved ----------------------------------------
test("legacy requiresWitness flag still resolves REQUIRED via the legacy path", () => {
  const decision = evaluateForTemplate({
    templateCode: "imc-some-other-form",
    templateRequiresWitness: true,
  });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.requiredWitnessCount, 1);
  assert.equal(decision.policySource, "LEGACY_TEMPLATE_FLAG");
  assert.equal(decision.policyVersion, WITNESS_POLICY_VERSION);
});

test("legacy HIGH/CRITICAL risk level still resolves REQUIRED via the legacy path", () => {
  const decision = evaluateForTemplate({
    templateCode: "imc-some-other-form",
    templateRiskLevel: "HIGH",
  });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.policySource, "LEGACY_TEMPLATE_FLAG");
});

// --- Trigger escalation -------------------------------------------------------
test("a fired trigger escalates the CONDITIONAL governed profile to REQUIRED (1 witness)", () => {
  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
    triggers: { substituteDecisionMaker: true },
  });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.requiredWitnessCount, 1);
  assert.deepEqual(decision.triggerCodes, ["SUBSTITUTE_DECISION_MAKER"]);
  assert.equal(decision.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.equal(decision.policyVersion, IMC_POLICY_VERSION);
});

test("no trigger permits routine electronic completion with zero human witnesses", () => {
  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  assert.equal(decision.witnessMode, "CONDITIONAL");
  assert.equal(decision.requiredWitnessCount, 0);
});

// --- Fail-closed version gate --------------------------------------------------
test("version present-but-mismatched fails closed: profile is NOT applied", () => {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: null,
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: "2019-01",
  });
  assert.equal(resolved.policy, null);
  assert.equal(resolved.profile, null);
  assert.equal(resolved.policySource, null);

  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: "2019-01",
  });
  // Falls through to default routine behaviour — never silently governed.
  assert.equal(decision.witnessMode, "NONE");
  assert.equal(decision.policySource, "DEFAULT_ROUTINE");
  assert.equal(decision.policyVersion, WITNESS_POLICY_VERSION);
});

test("absent/unknown version applies the PREVIEW_ACTIVE profile with auditable provenance", () => {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: null,
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: null,
  });
  assert.ok(resolved.profile);
  assert.equal(resolved.profile.effectiveState, "PREVIEW_ACTIVE");

  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: "   ",
  });
  assert.equal(decision.witnessMode, "CONDITIONAL");
  assert.equal(decision.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.equal(decision.policyVersion, IMC_POLICY_VERSION);
});

// --- Persisted provenance round-trip -------------------------------------------
test("decision provenance survives the metadata snapshot round-trip", () => {
  const decision = evaluateForTemplate({
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  // Simulate persistence to ConsentDocument.metadata.witnessPolicyDecision.
  const snapshot = JSON.parse(
    JSON.stringify({ witnessPolicyDecision: decision }),
  ) as Record<string, unknown>;
  const restored = extractStoredPolicyDecision(snapshot);
  assert.ok(restored);
  assert.equal(restored.policySource, GOVERNED_CODE_PROFILE_SOURCE);
  assert.equal(restored.policyVersion, IMC_POLICY_VERSION);
  assert.equal(restored.witnessMode, "CONDITIONAL");
  assert.equal(restored.requiredWitnessCount, 0);
  assert.equal(restored.evaluatedAt, FIXED_EVALUATED_AT);
});
