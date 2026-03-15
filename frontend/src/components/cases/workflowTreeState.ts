import { CASE_WORKFLOW_STEPS } from "@/components/cases/workflowTreeConfig";
import type {
  WorkflowSelectionState,
  WorkflowStep,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";

export type SequentialStepMeta = {
  stepId: string;
  index: number;
  status: WorkflowStepStatus;
  locked: boolean;
  current: boolean;
};

export function createDefaultWorkflowSelectionState(): WorkflowSelectionState {
  const state: WorkflowSelectionState = {};

  for (const step of CASE_WORKFLOW_STEPS) {
    state[step.id] = {};
    for (const field of step.fields) {
      state[step.id][field.id] = "";
    }
  }

  // Seed the first step so the timeline starts at a meaningful state.
  state.case_created.intake_status = "created";

  return state;
}

export function mergeWorkflowSelectionState(
  input: unknown,
  fallback: WorkflowSelectionState,
): WorkflowSelectionState {
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const next: WorkflowSelectionState = { ...fallback };

  for (const step of CASE_WORKFLOW_STEPS) {
    const stepValue = (input as Record<string, unknown>)[step.id];
    if (!stepValue || typeof stepValue !== "object") {
      continue;
    }

    const source = stepValue as Record<string, unknown>;
    const currentStep = { ...next[step.id] };

    for (const field of step.fields) {
      const value = source[field.id];
      if (typeof value === "string") {
        currentStep[field.id] = value;
      }
    }

    next[step.id] = currentStep;
  }

  return next;
}

export function getStepStatus(step: WorkflowStep, state: WorkflowSelectionState): WorkflowStepStatus {
  const values = state[step.id] || {};
  const total = step.fields.length;

  if (total === 0) {
    return "completed";
  }

  const selectedCount = step.fields.reduce((count, field) => {
    return values[field.id] ? count + 1 : count;
  }, 0);

  if (selectedCount === 0) {
    return "not_started";
  }

  if (selectedCount === total) {
    return "completed";
  }

  return "in_progress";
}

export function getSequentialStepMeta(state: WorkflowSelectionState): SequentialStepMeta[] {
  const stepStatuses = CASE_WORKFLOW_STEPS.map((step, index) => ({
    stepId: step.id,
    index,
    status: getStepStatus(step, state),
  }));

  const firstIncompleteIndex = stepStatuses.findIndex((step) => step.status !== "completed");
  const currentIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : CASE_WORKFLOW_STEPS.length - 1;

  return stepStatuses.map((item) => ({
    ...item,
    current: item.index === currentIndex,
    locked: firstIncompleteIndex >= 0 ? item.index > firstIncompleteIndex : false,
  }));
}
