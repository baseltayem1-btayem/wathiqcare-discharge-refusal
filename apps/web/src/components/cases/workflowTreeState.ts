import { CASE_WORKFLOW_STEPS } from "@/components/cases/workflowTreeConfig";
import type {
  WorkflowSelectionState,
  WorkflowStep,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";

const FIRST_STEP_ID = CASE_WORKFLOW_STEPS[0]?.id;
const SECOND_STEP_ID = CASE_WORKFLOW_STEPS[1]?.id;

export type SequentialStepMeta = {
  stepId: string;
  index: number;
  status: WorkflowStepStatus;
  locked: boolean;
  current: boolean;
};

function cloneWorkflowSelectionState(state: WorkflowSelectionState): WorkflowSelectionState {
  return Object.fromEntries(
    Object.entries(state).map(([stepId, values]) => [stepId, { ...values }]),
  );
}

function ensureLegacyWorkflowCompatibility(state: WorkflowSelectionState): void {
  state.case_created = {
    intake_status: state.case_created?.intake_status || "created",
  };

  state.risk_identified = {
    risk_level: state.risk_identified?.risk_level || "",
    barrier_type: state.risk_identified?.barrier_type || "",
  };
}

function getFieldValueWithLegacyFallback(
  stepId: string,
  fieldId: string,
  state: WorkflowSelectionState,
): string {
  const directValue = state[stepId]?.[fieldId];
  if (directValue) {
    return directValue;
  }

  if (stepId === FIRST_STEP_ID) {
    return state.case_created?.intake_status || "";
  }

  if (stepId === SECOND_STEP_ID) {
    if (fieldId === "barrier_type") {
      return state.risk_identified?.barrier_type || "";
    }

    if (fieldId === "patient_notified" || fieldId === "refusal_type") {
      return state.risk_identified?.risk_level || "";
    }
  }

  return "";
}

export function createDefaultWorkflowSelectionState(): WorkflowSelectionState {
  const state: WorkflowSelectionState = {};

  for (const step of CASE_WORKFLOW_STEPS) {
    state[step.id] = {};
    for (const field of step.fields) {
      state[step.id][field.id] = "";
    }
  }

  const firstStep = CASE_WORKFLOW_STEPS[0];
  if (firstStep) {
    for (const field of firstStep.fields) {
      state[firstStep.id][field.id] = field.options[0]?.value || "created";
    }
  }

  ensureLegacyWorkflowCompatibility(state);
  return state;
}

export function mergeWorkflowSelectionState(
  input: unknown,
  fallback: WorkflowSelectionState,
): WorkflowSelectionState {
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const sourceInput = input as Record<string, unknown>;
  const next = cloneWorkflowSelectionState(fallback);

  for (const step of CASE_WORKFLOW_STEPS) {
    const stepValue = sourceInput[step.id];
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

  const legacyCaseCreated = sourceInput.case_created;
  if (legacyCaseCreated && typeof legacyCaseCreated === "object") {
    const intakeStatus = (legacyCaseCreated as Record<string, unknown>).intake_status;
    if (typeof intakeStatus === "string" && intakeStatus) {
      next.case_created = { intake_status: intakeStatus };
    }
  }

  const legacyRiskIdentified = sourceInput.risk_identified;
  if (legacyRiskIdentified && typeof legacyRiskIdentified === "object") {
    const legacySource = legacyRiskIdentified as Record<string, unknown>;
    next.risk_identified = {
      risk_level:
        typeof legacySource.risk_level === "string" ? legacySource.risk_level : next.risk_identified?.risk_level || "",
      barrier_type:
        typeof legacySource.barrier_type === "string"
          ? legacySource.barrier_type
          : next.risk_identified?.barrier_type || "",
    };
  }

  ensureLegacyWorkflowCompatibility(next);
  return next;
}

export function getStepStatus(step: WorkflowStep, state: WorkflowSelectionState): WorkflowStepStatus {
  const total = step.fields.length;

  if (total === 0) {
    return "completed";
  }

  const selectedCount = step.fields.reduce((count, field) => {
    return getFieldValueWithLegacyFallback(step.id, field.id, state) ? count + 1 : count;
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
