"use client";

import { useMemo, useState } from "react";
import { CASE_WORKFLOW_STEPS } from "@/components/cases/workflowTreeConfig";
import WorkflowStepCard from "@/components/cases/WorkflowStepCard";
import {
  createDefaultWorkflowSelectionState,
  getStepStatus,
  mergeWorkflowSelectionState,
} from "@/components/cases/workflowTreeState";
import type { WorkflowSelectionState } from "@/components/cases/workflowTreeTypes";

type CaseWorkflowTreeProps = {
  caseId: string;
};

function storageKey(caseId: string): string {
  return `wathiqcare:workflow-tree:${caseId}`;
}

function loadSelectionState(caseId: string): WorkflowSelectionState {
  const fallback = createDefaultWorkflowSelectionState();

  if (typeof window === "undefined") {
    return fallback;
  }

  const saved = window.localStorage.getItem(storageKey(caseId));
  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved) as unknown;
    return mergeWorkflowSelectionState(parsed, fallback);
  } catch {
    return fallback;
  }
}

export default function CaseWorkflowTree({ caseId }: CaseWorkflowTreeProps) {
  const [selectionState, setSelectionState] = useState<WorkflowSelectionState>(() =>
    loadSelectionState(caseId),
  );
  const [saveMessage, setSaveMessage] = useState("");

  const progressSummary = useMemo(() => {
    const total = CASE_WORKFLOW_STEPS.length;
    const completed = CASE_WORKFLOW_STEPS.filter(
      (step) => getStepStatus(step, selectionState) === "completed",
    ).length;

    return { total, completed };
  }, [selectionState]);

  function handleFieldChange(stepId: string, fieldId: string, value: string) {
    setSelectionState((prev) => ({
      ...prev,
      [stepId]: {
        ...prev[stepId],
        [fieldId]: value,
      },
    }));
  }

  function handleSave() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey(caseId), JSON.stringify(selectionState));
    setSaveMessage("Workflow selections saved locally.");
    window.setTimeout(() => setSaveMessage(""), 2000);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Case Workflow Tree</h2>
          <p className="text-sm text-slate-600">
            Structured dropdown workflow for discharge refusal case handling.
          </p>
        </div>

        <div className="text-sm text-slate-600">
          <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
            {progressSummary.completed}/{progressSummary.total} steps completed
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {CASE_WORKFLOW_STEPS.map((step, index) => (
          <div key={step.id} className="relative">
            {index < CASE_WORKFLOW_STEPS.length - 1 ? (
              <span className="pointer-events-none absolute left-4 top-[4.1rem] h-[calc(100%-1.2rem)] w-px bg-slate-300 md:left-5" />
            ) : null}
            <WorkflowStepCard
              step={step}
              index={index}
              status={getStepStatus(step, selectionState)}
              values={selectionState}
              onFieldChange={handleFieldChange}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Save Workflow Selections
        </button>
        {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
      </div>
    </section>
  );
}
