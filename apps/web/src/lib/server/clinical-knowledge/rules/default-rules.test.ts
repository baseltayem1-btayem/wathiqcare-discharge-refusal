import assert from "node:assert/strict";
import test from "node:test";
import { defaultDecisionRules, buildDefaultRuleCreateInputs } from "./default-rules";

test("default rules cover anesthesia, guardian, and interpreter scenarios", () => {
  const codes = defaultDecisionRules.map((r) => r.code);

  assert.ok(codes.includes("RULE_ANESTHESIA_WITNESS"), "expected anesthesia witness rule");
  assert.ok(codes.includes("RULE_MINOR_GUARDIAN"), "expected minor guardian rule");
  assert.ok(codes.includes("RULE_NON_ARABIC_INTERPRETER"), "expected interpreter rule");
});

test("rule priorities are ordered correctly", () => {
  const sorted = [...defaultDecisionRules].sort((a, b) => b.priority - a.priority);
  assert.deepEqual(
    sorted.map((r) => r.code),
    defaultDecisionRules.map((r) => r.code),
    "expected rules to be sorted by descending priority",
  );
});

test("buildDefaultRuleCreateInputs produces tenant-scoped inputs", () => {
  const inputs = buildDefaultRuleCreateInputs("tenant-test", "user-test");

  assert.ok(inputs.length > 0);
  assert.ok(inputs.every((i) => i.tenantId === "tenant-test"));
  assert.ok(inputs.every((i) => i.createdByUserId === "user-test"));
  assert.ok(inputs.every((i) => i.status === "ACTIVE"));
});
