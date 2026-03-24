"use client";

import { useMemo, useState } from "react";
import WorkflowDropdownField from "@/components/cases/WorkflowDropdownField";
import { buildWorkflowSteps } from "@/components/cases/workflowTreeConfig";
import WorkflowStepCard from "@/components/cases/WorkflowStepCard";
import Modal from "@/components/ui/Modal";
import {
  createDefaultWorkflowSelectionState,
  getSequentialStepMeta,
  mergeWorkflowSelectionState,
} from "@/components/cases/workflowTreeState";
import type { WorkflowSelectionState } from "@/components/cases/workflowTreeTypes";
import { useI18n } from "@/i18n/I18nProvider";

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
  const { t } = useI18n();
  const workflowSteps = useMemo(() => buildWorkflowSteps(t), [t]);
  const [selectionState, setSelectionState] = useState<WorkflowSelectionState>(() =>
    loadSelectionState(caseId),
  );
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const sequentialMeta = useMemo(() => getSequentialStepMeta(selectionState), [selectionState]);

  const progressSummary = useMemo(() => {
    const total = workflowSteps.length;
    const completed = sequentialMeta.filter((step) => step.status === "completed").length;
    const current = sequentialMeta.find((step) => step.current) || null;
    const remaining = total - completed;

    return { total, completed, remaining, current };
  }, [sequentialMeta, workflowSteps]);

  const activeStep = useMemo(
    () => workflowSteps.find((step) => step.id === activeStepId) || null,
    [activeStepId, workflowSteps],
  );

  const activeStepMeta = useMemo(
    () => sequentialMeta.find((step) => step.stepId === activeStepId) || null,
    [sequentialMeta, activeStepId],
  );

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
    setSaveMessage(t("workflowTree.savedLocally"));
    window.setTimeout(() => setSaveMessage(""), 2000);
  }

  function handleOpenStep(stepId: string) {
    const stepMeta = sequentialMeta.find((item) => item.stepId === stepId);
    if (!stepMeta || stepMeta.locked) {
      return;
    }

    setActiveStepId(stepId);
  }

  function handleCloseModal() {
    setActiveStepId(null);
  }

  function handleSaveAndNext() {
    if (!activeStep) {
      return;
    }

    const currentIndex = workflowSteps.findIndex((step) => step.id === activeStep.id);
    const nextStep = workflowSteps[currentIndex + 1];

    handleSave();

    if (!nextStep) {
      setActiveStepId(null);
      return;
    }

    const nextMeta = sequentialMeta.find((item) => item.stepId === nextStep.id);
    if (nextMeta?.locked) {
      setActiveStepId(null);
      return;
    }

    setActiveStepId(nextStep.id);
  }

  const completedSteps = sequentialMeta.filter((step) => step.status === "completed");
  const remainingSteps = sequentialMeta.filter((step) => step.status !== "completed");

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t("workflowTree.title")}</h2>
          <p className="text-sm text-slate-600">{t("workflowTree.subtitle")}</p>
        </div>

        <div className="text-sm text-slate-600">
          <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
            {t("workflowTree.stepsCompleted", {
              completed: progressSummary.completed,
              total: progressSummary.total,
            })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {workflowSteps.map((step, index) => {
            const stepMeta = sequentialMeta.find((item) => item.stepId === step.id);
            if (!stepMeta) {
              return null;
            }

            return (
              <div key={step.id} className="relative">
                {index < workflowSteps.length - 1 ? (
                  <span className="pointer-events-none absolute left-4 top-[4.1rem] h-[calc(100%-1.2rem)] w-px bg-slate-300 md:left-5" />
                ) : null}
                <WorkflowStepCard
                  step={step}
                  index={index}
                  status={stepMeta.status}
                  locked={stepMeta.locked}
                  current={stepMeta.current}
                  values={selectionState}
                  onOpenStep={handleOpenStep}
                />
              </div>
            );
          })}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">{t("workflowTree.dischargePlanStatus")}</h3>
          <p className="mt-1 text-xs text-slate-600">{t("workflowTree.sequentialNote")}</p>

          <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-xs text-indigo-700">{t("workflowTree.currentStep")}</p>
            <p className="mt-1 text-sm font-semibold text-indigo-900">
              {progressSummary.current
                ? workflowSteps[progressSummary.current.index]?.title
                : t("workflowTree.allStepsCompleted")}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-emerald-700">
              {t("workflowTree.completedSteps", { count: completedSteps.length })}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {completedSteps.length === 0 ? (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">{t("workflowTree.noCompletedSteps")}</li>
              ) : (
                completedSteps.map((step) => (
                  <li key={step.stepId} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                    {step.index + 1}. {workflowSteps[step.index]?.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-amber-700">
              {t("workflowTree.remainingSteps", { count: progressSummary.remaining })}
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {remainingSteps.length === 0 ? (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">{t("workflowTree.noRemainingSteps")}</li>
              ) : (
                remainingSteps.map((step) => (
                  <li key={step.stepId} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                    {step.index + 1}. {workflowSteps[step.index]?.title}
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t("workflowTree.saveSelections")}
        </button>
        {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
      </div>

      <Modal
        isOpen={Boolean(activeStep)}
        onClose={handleCloseModal}
        title={activeStep
          ? t("workflowTree.stepModalTitle", {
            index: activeStepMeta ? activeStepMeta.index + 1 : "",
            title: activeStep.title,
          })
          : t("workflowTree.currentStep")}
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t("workflowTree.close")}
            </button>
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {t("workflowTree.saveAndNext")}
            </button>
          </div>
        }
      >
        {activeStep ? (
          <div className="space-y-3">
            {activeStep.fields.map((field) => (
              <WorkflowDropdownField
                key={`${activeStep.id}-${field.id}`}
                label={field.label}
                value={selectionState[activeStep.id]?.[field.id] || ""}
                options={field.options}
                onChange={(value) => handleFieldChange(activeStep.id, field.id, value)}
              />
            ))}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
