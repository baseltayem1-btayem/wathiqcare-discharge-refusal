import assert from "node:assert/strict";
import test from "node:test";
import { CASE_WORKFLOW_STEPS } from "@/components/cases/workflowTreeConfig";
import {
  createDefaultWorkflowSelectionState,
  getStepStatus,
} from "@/components/cases/workflowTreeState";

test("workflow tree default state is initialized safely", () => {
  const state = createDefaultWorkflowSelectionState();

  assert.equal(state.case_created.intake_status, "created");
  assert.equal(
    getStepStatus(CASE_WORKFLOW_STEPS[0], state),
    "completed",
  );
  assert.equal(
    getStepStatus(CASE_WORKFLOW_STEPS[1], state),
    "not_started",
  );
});

test("workflow tree step status becomes in_progress and completed", () => {
  const state = createDefaultWorkflowSelectionState();

  state.risk_identified.risk_level = "high";
  assert.equal(
    getStepStatus(CASE_WORKFLOW_STEPS[1], state),
    "in_progress",
  );

  state.risk_identified.barrier_type = "no_payer";
  assert.equal(
    getStepStatus(CASE_WORKFLOW_STEPS[1], state),
    "completed",
  );
});
