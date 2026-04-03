import type {
  WorkflowSelectionState,
  WorkflowStep,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";

type WorkflowStepCardProps = {
  step: WorkflowStep;
  index: number;
  status: WorkflowStepStatus;
  locked: boolean;
  current: boolean;
  values: WorkflowSelectionState;
  onOpenStep: (stepId: string) => void;
};

function statusStyles(status: WorkflowStepStatus): string {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusLabel(status: WorkflowStepStatus): string {
  if (status === "completed") return "مكتمل";
  if (status === "in_progress") return "قيد التنفيذ";
  return "لم يبدأ";
}

export default function WorkflowStepCard({
  step,
  index,
  status,
  locked,
  current,
  values,
  onOpenStep,
}: WorkflowStepCardProps) {
  const selectedCount = step.fields.reduce((count, field) => {
    return values[step.id]?.[field.id] ? count + 1 : count;
  }, 0);

  return (
    <article
      className={
        locked
          ? "rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
          : current
            ? "rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm"
            : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {index + 1}. {step.title}
        </h3>
        <div className="flex items-center gap-2">
          {current ? (
            <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              الحالية
            </span>
          ) : null}
          {locked ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              مقفلة
            </span>
          ) : (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles(status)}`}
            >
              {statusLabel(status)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          {selectedCount}/{step.fields.length} حقول مكتملة
        </p>
        <button
          type="button"
          disabled={locked}
          onClick={() => onOpenStep(step.id)}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          فتح الخطوة
        </button>
      </div>
    </article>
  );
}
