"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Lock, PlayCircle } from "lucide-react";
import WorkflowDropdownField from "@/components/cases/WorkflowDropdownField";
import { CASE_WORKFLOW_STEPS } from "@/components/cases/workflowTreeConfig";
import WorkflowStepCard from "@/components/cases/WorkflowStepCard";
import Modal from "@/components/ui/Modal";
import {
  createDefaultWorkflowSelectionState,
  getSequentialStepMeta,
  mergeWorkflowSelectionState,
} from "@/components/cases/workflowTreeState";
import type {
  WorkflowSelectionState,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";

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

function StepIndicator({ status, locked, current }: { status: WorkflowStepStatus; locked: boolean; current: boolean }) {
  if (locked) {
    return <Lock className="h-4 w-4" />;
  }

  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (current || status === "in_progress") {
    return <PlayCircle className="h-4 w-4" />;
  }

  return <CircleDashed className="h-4 w-4" />;
}

export default function CaseWorkflowTree({ caseId }: CaseWorkflowTreeProps) {
  const [selectionState, setSelectionState] = useState<WorkflowSelectionState>(() =>
    loadSelectionState(caseId),
  );
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const sequentialMeta = useMemo(() => getSequentialStepMeta(selectionState), [selectionState]);

  const progressSummary = useMemo(() => {
    const total = CASE_WORKFLOW_STEPS.length;
    const completed = sequentialMeta.filter((step) => step.status === "completed").length;
    const current = sequentialMeta.find((step) => step.current) || null;
    const remaining = total - completed;

    return { total, completed, remaining, current };
  }, [sequentialMeta]);

  const activeStep = useMemo(
    () => CASE_WORKFLOW_STEPS.find((step) => step.id === activeStepId) || null,
    [activeStepId],
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
    setSaveMessage("تم حفظ اختيارات سير العمل محليًا.");
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

    const currentIndex = CASE_WORKFLOW_STEPS.findIndex((step) => step.id === activeStep.id);
    const nextStep = CASE_WORKFLOW_STEPS[currentIndex + 1];

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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">شجرة سير عمل الحالة</h2>
          <p className="text-sm text-slate-600">
            سير عمل منظم بالقوائم المنسدلة للتعامل مع حالات رفض الخروج.
          </p>
        </div>

        <div className="text-sm text-slate-600">
          <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-700">
            {progressSummary.completed}/{progressSummary.total} خطوة مكتملة
          </span>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Patient Discharge Plan Workflow</h3>
            <p className="text-xs text-slate-500">شريط تقدم مرن ومحتوى بالكامل داخل النافذة.</p>
          </div>
          <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:block">
            {progressSummary.remaining} خطوات متبقية
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sequentialMeta.map((stepMeta, index) => {
            const step = CASE_WORKFLOW_STEPS[index];

            return (
              <button
                key={step.id}
                type="button"
                disabled={stepMeta.locked}
                onClick={() => handleOpenStep(step.id)}
                className="group min-w-0 rounded-2xl border px-3 py-3 text-right transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: stepMeta.current ? "#67e8f9" : stepMeta.status === "completed" ? "#86efac" : "#cbd5e1",
                  background: stepMeta.current ? "#ecfeff" : stepMeta.status === "completed" ? "#f0fdf4" : "#ffffff",
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white text-slate-700 shadow-sm">
                    <StepIndicator status={stepMeta.status} locked={stepMeta.locked} current={stepMeta.current} />
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-500">الخطوة {index + 1}</span>
                </div>

                <p className="line-clamp-2 min-h-11 text-sm font-semibold leading-5 text-slate-900">
                  {step.title}
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: stepMeta.status === "completed" ? "100%" : stepMeta.current || stepMeta.status === "in_progress" ? "60%" : "16%",
                      background: stepMeta.status === "completed" ? "#22c55e" : stepMeta.current || stepMeta.status === "in_progress" ? "#06b6d4" : "#cbd5e1",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
          <div className="space-y-3">
            {CASE_WORKFLOW_STEPS.map((step, index) => {
              const stepMeta = sequentialMeta.find((item) => item.stepId === step.id);
              if (!stepMeta) {
                return null;
              }

              return (
                <div key={step.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm"
                      style={{
                        borderColor: stepMeta.current ? "#67e8f9" : stepMeta.status === "completed" ? "#86efac" : "#cbd5e1",
                        background: stepMeta.current ? "#ecfeff" : stepMeta.status === "completed" ? "#f0fdf4" : "#ffffff",
                      }}
                    >
                      <StepIndicator status={stepMeta.status} locked={stepMeta.locked} current={stepMeta.current} />
                    </span>
                    {index < CASE_WORKFLOW_STEPS.length - 1 ? (
                      <span className="mt-2 h-full min-h-8 w-px bg-slate-200" />
                    ) : null}
                  </div>

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
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 xl:sticky xl:top-24 xl:self-start">
          <h3 className="text-sm font-semibold text-slate-900">حالة خطة الخروج</h3>
          <p className="mt-1 text-xs text-slate-600">المكتملة مقابل المتبقية بالتسلسل الإجباري.</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
              <p className="text-[11px] text-slate-500">إجمالي</p>
              <p className="text-sm font-bold text-slate-900">{progressSummary.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
              <p className="text-[11px] text-emerald-700">منجز</p>
              <p className="text-sm font-bold text-emerald-900">{progressSummary.completed}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-[11px] text-amber-700">متبقٍ</p>
              <p className="text-sm font-bold text-amber-900">{progressSummary.remaining}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-3">
            <p className="text-xs text-cyan-700">الخطوة الحالية</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-cyan-950">
              {progressSummary.current
                ? CASE_WORKFLOW_STEPS[progressSummary.current.index]?.title
                : "تم إكمال جميع الخطوات"}
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-emerald-700">خطوات منجزة ({completedSteps.length})</p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {completedSteps.length === 0 ? (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">لا توجد خطوات منجزة بعد.</li>
              ) : (
                completedSteps.map((step) => (
                  <li key={step.stepId} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                    {step.index + 1}. {CASE_WORKFLOW_STEPS[step.index]?.title}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-amber-700">خطوات متبقية ({progressSummary.remaining})</p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {remainingSteps.length === 0 ? (
                <li className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">لا توجد خطوات متبقية.</li>
              ) : (
                remainingSteps.map((step) => (
                  <li key={step.stepId} className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                    {step.index + 1}. {CASE_WORKFLOW_STEPS[step.index]?.title}
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
          حفظ اختيارات سير العمل
        </button>
        {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
      </div>

      <Modal
        isOpen={Boolean(activeStep)}
        onClose={handleCloseModal}
        title={activeStep ? `الخطوة ${activeStepMeta ? activeStepMeta.index + 1 : ""}: ${activeStep.title}` : "الخطوة"}
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSaveAndNext}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              حفظ ومتابعة
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
