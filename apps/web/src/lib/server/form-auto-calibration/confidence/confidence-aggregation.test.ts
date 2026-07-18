import { describe, test } from "node:test";
import assert from "node:assert";
import { aggregateFieldConfidence, aggregateCandidateConfidence } from "./confidence-aggregation";

describe("confidence-aggregation", () => {
  test("weights deterministic signal higher", () => {
    const field = aggregateFieldConfidence("patient.name", 1.0, 0.0);
    assert.equal(field.deterministic, 1.0);
    assert.equal(field.agentic, 0.0);
    assert.ok(field.final >= 0.7 && field.final <= 1.0);
  });

  test("aggregates candidate confidence and surfaces weakest fields", () => {
    const candidate = aggregateCandidateConfidence("c-1", [
      aggregateFieldConfidence("a", 1.0, 1.0),
      aggregateFieldConfidence("b", 0.5, 0.5),
    ]);
    assert.ok(candidate.overall >= 0.7 && candidate.overall <= 1.0);
    assert.ok(candidate.weakestFields.includes("b"));
  });
});
