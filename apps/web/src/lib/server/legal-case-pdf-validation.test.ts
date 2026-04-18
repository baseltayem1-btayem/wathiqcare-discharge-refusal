import assert from "node:assert/strict";
import test from "node:test";
import { __casePdfStorageInternals } from "./legal-case-pdf-service";

test("authoritative case facts fall back to persisted metadata when workflow node is missing", () => {
  const facts = __casePdfStorageInternals.getAuthoritativeCaseFacts({
    metadata: {
      attending_physician: "Dr. Fallback",
      discharge_decision_at: "2026-04-11T08:00:00.000Z",
    },
  } as never);

  assert.equal(facts.treatingPhysician, "Dr. Fallback");
  assert.equal(facts.dischargeDecisionAt, "2026-04-11T08:00:00.000Z");
  assert.equal(facts.refusalStartedAt, null);
  assert.equal(facts.incidentTimestamp, "2026-04-11T08:00:00.000Z");
});

test("authoritative case facts prioritize workflow values and incident uses refusal timestamp first", () => {
  const facts = __casePdfStorageInternals.getAuthoritativeCaseFacts({
    metadata: {
      attending_physician: "Dr. Legacy",
      discharge_decision_at: "2026-04-10T08:00:00.000Z",
      workflow: {
        attending_physician: "Dr. Workflow",
        discharge_decision_at: "2026-04-11T08:00:00.000Z",
        refusal_started_at: "2026-04-11T09:00:00.000Z",
      },
    },
  } as never);

  assert.equal(facts.treatingPhysician, "Dr. Workflow");
  assert.equal(facts.dischargeDecisionAt, "2026-04-11T08:00:00.000Z");
  assert.equal(facts.refusalStartedAt, "2026-04-11T09:00:00.000Z");
  assert.equal(facts.incidentTimestamp, "2026-04-11T09:00:00.000Z");
});
