import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRulesWithContext } from "./rule-service";
import type { ClinicalKnowledgeDecisionRule } from "@/lib/clinical-knowledge/types";

function makeRule(
  code: string,
  condition: Record<string, unknown>,
  action: Record<string, unknown>,
  priority = 0,
): ClinicalKnowledgeDecisionRule {
  return {
    id: `rule-${code}`,
    tenantId: "tenant-test",
    code,
    nameEn: code,
    nameAr: code,
    description: "test rule",
    priority,
    condition,
    action,
    status: "ACTIVE",
    effectiveDate: new Date().toISOString(),
    createdByUserId: "user-test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test("anesthesia rule requires witness and education", () => {
  const rules = [makeRule("anesthesia", { anesthesiaRequired: true }, { requireWitness: true, educationRecommended: true })];

  const result = evaluateRulesWithContext(rules, { anesthesiaRequired: true });

  assert.ok(result.requiredParticipants.includes("witness"));
  assert.ok(result.suggestions.some((s) => s.type === "witness-required"));
  assert.ok(result.suggestions.some((s) => s.type === "education-recommended"));
  assert.equal(result.blockers.length, 0);
});

test("minor patient requires guardian and blocks assembly", () => {
  const rules = [makeRule("minor", { patientCapacityStatus: "minor" }, { requireGuardian: true, requireWitness: true })];

  const result = evaluateRulesWithContext(rules, { patientCapacityStatus: "minor" });

  assert.ok(result.requiredParticipants.includes("guardian"));
  assert.ok(result.requiredParticipants.includes("witness"));
  assert.ok(result.blockers.some((b) => b.key === "rule-minor-guardian"));
});

test("competent adult produces no blockers", () => {
  const rules = [
    makeRule("anesthesia", { anesthesiaRequired: true }, { requireWitness: true }),
    makeRule("minor", { patientCapacityStatus: "minor" }, { requireGuardian: true }),
  ];

  const result = evaluateRulesWithContext(rules, {
    anesthesiaRequired: false,
    patientCapacityStatus: "competent",
  });

  assert.equal(result.blockers.length, 0);
  assert.equal(result.requiredParticipants.length, 0);
});

test("non-matching rules are skipped", () => {
  const rules = [makeRule("anesthesia", { anesthesiaRequired: true }, { requireWitness: true })];

  const result = evaluateRulesWithContext(rules, { anesthesiaRequired: false });

  assert.equal(result.requiredParticipants.length, 0);
  assert.equal(result.suggestions.length, 0);
});
