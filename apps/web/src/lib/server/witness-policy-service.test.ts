import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import {
  DEFAULT_REQUIRED_WITNESS_ROLES,
  WITNESS_POLICY_VERSION,
  assertWitnessSatisfied,
  evaluateEvidenceCompleteness,
  evaluateWitnessPolicy,
  evaluateWitnessSatisfaction,
  extractStoredPolicyDecision,
  extractWitnessTriggerFacts,
  parseTemplateWitnessPolicy,
  type WitnessPolicyDecision,
  type WitnessPolicyInput,
} from "@/lib/server/witness-policy-service";
import { deriveChildIdempotencyKey } from "@/lib/server/idempotency-core";

const FIXED_EVALUATED_AT = "2026-07-14T07:00:00.000Z";

function decide(overrides: Partial<WitnessPolicyInput> = {}): WitnessPolicyDecision {
  return evaluateWitnessPolicy({
    templateRequiresWitness: false,
    templateRiskLevel: "MEDIUM",
    evaluatedAt: FIXED_EVALUATED_AT,
    ...overrides,
  });
}

const COMPLETE_EVIDENCE = {
  patientCompetent: true,
  identityVerified: true,
  declarationsComplete: true,
  clinicianAttestationComplete: true,
  electronicSignatureBoundToHash: true,
};

// --- Spec test 1: routine electronic consent => zero human witnesses --------
test("competent personally signing patient with complete electronic evidence requires zero human witnesses", () => {
  const decision = decide({ evidence: COMPLETE_EVIDENCE });
  assert.equal(decision.witnessMode, "NONE");
  assert.equal(decision.requiredWitnessCount, 0);
  assert.equal(decision.policySource, "DEFAULT_ROUTINE");
  assert.equal(decision.policyVersion, WITNESS_POLICY_VERSION);
  assert.equal(decision.evidenceCompleteness.complete, true);
  assert.equal(decision.triggerCodes.length, 0);
});

// --- Spec test 2: substitute decision-maker => witness required -------------
test("substitute decision-maker requires a human witness", () => {
  const decision = decide({ triggers: { substituteDecisionMaker: true } });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.requiredWitnessCount, 1);
  assert.deepEqual(decision.triggerCodes, ["SUBSTITUTE_DECISION_MAKER"]);
});

// --- Spec test 3: lacks capacity => witness required ------------------------
test("patient lacking decision-making capacity requires a human witness", () => {
  const decision = decide({ triggers: { lacksCapacity: true } });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.deepEqual(decision.triggerCodes, ["LACKS_CAPACITY"]);
});

// --- Spec test 4: cannot read / independently use journey -------------------
test("patient who cannot read or independently use the journey requires a human witness", () => {
  const decision = decide({ triggers: { cannotReadOrUseJourney: true } });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.deepEqual(decision.triggerCodes, ["CANNOT_READ_OR_USE_JOURNEY"]);
});

// --- Spec test 5: communication barrier => witness required -----------------
test("material communication barrier requires a human witness", () => {
  const decision = decide({ triggers: { communicationBarrier: true } });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.deepEqual(decision.triggerCodes, ["COMMUNICATION_BARRIER"]);
});

// --- Spec test 6: disputed consent, refusal, special policy -----------------
test("disputed consent and refusal workflows require witnesses as configured", () => {
  const disputed = decide({ triggers: { disputedOrObjected: true } });
  assert.deepEqual(disputed.triggerCodes, ["DISPUTED_OR_OBJECTED"]);
  assert.equal(disputed.witnessMode, "REQUIRED");

  const refusal = decide({ triggers: { refusalOrAma: true } });
  assert.deepEqual(refusal.triggerCodes, ["REFUSAL_OR_AMA"]);
  assert.equal(refusal.witnessMode, "REQUIRED");

  const specialPolicy = decide({
    templatePolicy: {
      witnessMode: "REQUIRED",
      requiredWitnessCount: 2,
      policyVersion: "2026.07-imc-2w",
    },
  });
  assert.equal(specialPolicy.witnessMode, "REQUIRED");
  assert.equal(specialPolicy.requiredWitnessCount, 2);
  assert.deepEqual(specialPolicy.requiredWitnessRoles, [
    "NURSING_REPRESENTATIVE",
    "PATIENT_EXPERIENCE_REPRESENTATIVE",
  ]);
  assert.equal(specialPolicy.policySource, "TEMPLATE_METADATA");
  assert.equal(specialPolicy.policyVersion, "2026.07-imc-2w");
  assert.deepEqual(specialPolicy.triggerCodes, ["TEMPLATE_POLICY_REQUIRED"]);
});

// --- Spec test 7: legacy paper route still respects requiresWitness ---------
test("legacy requiresWitness template flag still requires a witness (paper behaviour preserved)", () => {
  const legacy = decide({ templateRequiresWitness: true });
  assert.equal(legacy.witnessMode, "REQUIRED");
  assert.equal(legacy.requiredWitnessCount, 1);
  assert.equal(legacy.policySource, "LEGACY_TEMPLATE_FLAG");

  const highRisk = decide({ templateRiskLevel: "HIGH" });
  assert.equal(highRisk.witnessMode, "REQUIRED");
  assert.equal(highRisk.policySource, "LEGACY_TEMPLATE_FLAG");

  const critical = decide({ templateRiskLevel: "CRITICAL" });
  assert.equal(critical.witnessMode, "REQUIRED");
});

// --- Spec test 8: draft creation not blocked by legacy requiresWitness ------
test("policy evaluation never throws for legacy requiresWitness templates (draft creation is allowed)", () => {
  assert.doesNotThrow(() => decide({ templateRequiresWitness: true }));
  assert.doesNotThrow(() => decide({ templateRequiresWitness: true, templateRiskLevel: "CRITICAL" }));
});

// --- Trigger determinism and fail-closed escalation -------------------------
test("policy evaluation is deterministic for identical facts", () => {
  const a = decide({ triggers: { lacksCapacity: true, communicationBarrier: true } });
  const b = decide({ triggers: { lacksCapacity: true, communicationBarrier: true } });
  assert.deepEqual(a, b);
  // Stable, explainable trigger ordering.
  assert.deepEqual(a.triggerCodes, ["LACKS_CAPACITY", "COMMUNICATION_BARRIER"]);
});

test("a fired trigger escalates even an explicit NONE template policy (fail closed)", () => {
  const decision = decide({
    templatePolicy: { witnessMode: "NONE" },
    triggers: { lacksCapacity: true },
  });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.requiredWitnessCount, 1);
});

test("explicit CONDITIONAL template policy with no triggers yields conditional zero-witness decision", () => {
  const decision = decide({ templatePolicy: { witnessMode: "CONDITIONAL" } });
  assert.equal(decision.witnessMode, "CONDITIONAL");
  assert.equal(decision.requiredWitnessCount, 0);
});

test("invalid template witness policy configuration fails closed", () => {
  assert.throws(
    () => parseTemplateWitnessPolicy({ witnessPolicy: { witnessMode: "SOMETIMES" } }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_POLICY_CONFIG_INVALID",
  );
  assert.throws(
    () => parseTemplateWitnessPolicy({ witnessPolicy: { requiredWitnessCount: 9 } }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_POLICY_CONFIG_INVALID",
  );
  assert.equal(parseTemplateWitnessPolicy(null), null);
  assert.equal(parseTemplateWitnessPolicy({}), null);
});

// --- Evidence completeness --------------------------------------------------
test("evidence completeness reports every missing requirement", () => {
  const result = evaluateEvidenceCompleteness({ patientCompetent: true });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, [
    "identityVerified",
    "declarationsComplete",
    "clinicianAttestationComplete",
    "electronicSignatureBoundToHash",
  ]);
});

// --- Spec test 9: required missing witness blocks finalization --------------
test("required but missing witness is not satisfied", () => {
  const decision = decide({ templateRequiresWitness: true });
  const result = evaluateWitnessSatisfaction(decision, []);
  assert.equal(result.satisfied, false);
  assert.equal(result.missingCount, 1);
  assert.ok(result.blockers.includes("WITNESS_REQUIRED_NOT_SATISFIED"));
  assert.deepEqual(result.missingRoles, ["NURSING_REPRESENTATIVE"]);
  assert.throws(
    () => assertWitnessSatisfied(decision, []),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_REQUIRED_NOT_SATISFIED",
  );
});

// --- Spec test 10: complete authorized witness workflow permits completion --
test("two independent witnesses in the required roles satisfy a two-witness policy", () => {
  const decision = decide({
    templatePolicy: { witnessMode: "REQUIRED", requiredWitnessCount: 2 },
  });
  const result = evaluateWitnessSatisfaction(decision, [
    { userId: "nurse-1", role: "NURSING_REPRESENTATIVE", documentHash: "hash-a" },
    { userId: "px-1", role: "PATIENT_EXPERIENCE_REPRESENTATIVE", documentHash: "hash-a" },
  ], { expectedDocumentHash: "hash-a" });
  assert.equal(result.satisfied, true);
  assert.equal(result.signedCount, 2);
  assert.equal(result.missingCount, 0);
});

// --- Spec test 12: self-witnessing / duplicate-role protections -------------
test("the same person cannot fill two required witness roles unless policy allows", () => {
  const decision = decide({
    templatePolicy: { witnessMode: "REQUIRED", requiredWitnessCount: 2 },
  });
  const result = evaluateWitnessSatisfaction(decision, [
    { userId: "nurse-1", role: "NURSING_REPRESENTATIVE" },
    { userId: "nurse-1", role: "PATIENT_EXPERIENCE_REPRESENTATIVE" },
  ]);
  assert.equal(result.satisfied, false);
  assert.ok(result.blockers.includes("WITNESS_DUPLICATE_ROLE_SAME_PERSON"));

  const allowed = decide({
    templatePolicy: {
      witnessMode: "REQUIRED",
      requiredWitnessCount: 2,
      allowSamePersonMultipleRoles: true,
    },
  });
  const allowedResult = evaluateWitnessSatisfaction(allowed, [
    { userId: "nurse-1", role: "NURSING_REPRESENTATIVE" },
    { userId: "nurse-1", role: "PATIENT_EXPERIENCE_REPRESENTATIVE" },
  ]);
  assert.equal(allowedResult.satisfied, true);
});

// --- Spec test 13: stale document hash invalidates witness evidence ---------
test("a witness signature bound to an outdated document hash is rejected", () => {
  const decision = decide({ templateRequiresWitness: true });
  const result = evaluateWitnessSatisfaction(
    decision,
    [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE", documentHash: "old-hash" }],
    { expectedDocumentHash: "current-hash" },
  );
  assert.equal(result.satisfied, false);
  assert.ok(result.blockers.includes("WITNESS_STALE_DOCUMENT_HASH"));
});

// --- Spec test 14: idempotent witness requirement keys ----------------------
test("witness requirement idempotency keys are deterministic and per-slot distinct", () => {
  const root = "tenant-1:doc-1:witness";
  const first = deriveChildIdempotencyKey(root, "WITNESS_REQUIREMENT_CREATE:1");
  const second = deriveChildIdempotencyKey(root, "WITNESS_REQUIREMENT_CREATE:2");
  assert.notEqual(first, second);
  assert.equal(first, deriveChildIdempotencyKey(root, "WITNESS_REQUIREMENT_CREATE:1"));
});

// --- Trigger fact extraction ------------------------------------------------
test("trigger facts are extracted from document metadata and signatures", () => {
  const facts = extractWitnessTriggerFacts({
    metadata: {
      refusalSignature: { signatureId: "sig-1" },
      witnessTriggerFacts: { lacksCapacity: true },
    },
    hasGuardianSignature: true,
  });
  assert.equal(facts.refusalOrAma, true);
  assert.equal(facts.lacksCapacity, true);
  assert.equal(facts.substituteDecisionMaker, true);
  assert.equal(facts.communicationBarrier, false);

  const refused = extractWitnessTriggerFacts({ decisionStatus: "CONSENT_REFUSED" });
  assert.equal(refused.refusalOrAma, true);
});

test("stored policy decisions round-trip through metadata extraction", () => {
  const decision = decide({ templateRequiresWitness: true });
  assert.deepEqual(
    extractStoredPolicyDecision({ witnessPolicyDecision: decision }),
    decision,
  );
  assert.equal(extractStoredPolicyDecision(null), null);
  assert.equal(extractStoredPolicyDecision({ witnessPolicyDecision: { witnessMode: "BOGUS" } }), null);
});

test("default required witness roles are the two configured staff roles", () => {
  assert.deepEqual([...DEFAULT_REQUIRED_WITNESS_ROLES], [
    "NURSING_REPRESENTATIVE",
    "PATIENT_EXPERIENCE_REPRESENTATIVE",
  ]);
});
