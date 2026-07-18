import { describe, test } from "node:test";
import assert from "node:assert";
import { safeJsonParse, validateAgentMatches, validateAgentReview } from "./guardrails";

describe("guardrails", () => {
  test("parses fenced JSON", () => {
    const result = safeJsonParse('```json\n{"matches":[]}\n```');
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { matches: [] });
  });

  test("rejects disallowed ontologyKey", () => {
    const allowedKeys = new Set(["patient.name"]);
    const allowedFields = new Set(["patient_name"]);
    const result = validateAgentMatches(
      { matches: [{ ontologyKey: "bad.key", fieldName: "patient_name", reason: "x", confidence: 0.9 }] },
      allowedFields,
      allowedKeys,
    );
    assert.equal(result.ok, false);
  });

  test("validates review array", () => {
    const result = validateAgentReview({ review: [{ ontologyKey: "a", severity: "warning", message: "m" }] });
    assert.equal(result.ok, true);
    assert.equal(result.data?.length, 1);
  });
});
