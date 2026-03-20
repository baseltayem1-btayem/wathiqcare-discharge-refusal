export type WorkflowStepStatus = "not_started" | "in_progress" | "completed";

export type WorkflowOption = {
  label: string;
  value: string;
};

export type WorkflowField = {
  id: string;
  label: string;
  options: WorkflowOption[];
};

export type WorkflowStep = {
  id: string;
  title: string;
  fields: WorkflowField[];
};

export type WorkflowSelectionState = Record<string, Record<string, string>>;
