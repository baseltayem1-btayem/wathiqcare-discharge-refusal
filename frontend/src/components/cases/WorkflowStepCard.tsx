import type {
  WorkflowSelectionState,
  WorkflowStep,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";
import { CheckCircle2, CircleDashed, Lock, PlayCircle } from "lucide-react";

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

function StatusIcon({ status, locked, current }: { status: WorkflowStepStatus; locked: boolean; current: boolean }) {
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

  const cardClassName = locked
    ? "rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm"
    : current
      ? "rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm"
      : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

  return (
    <article className={cardClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700">
              {index + 1}
            </span>
            <h3 className="min-w-0 flex-1 text-sm font-semibold leading-6 text-slate-900">
              {step.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {current ? (
              <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                الحالية
              </span>
            ) : null}
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                <Lock className="h-3.5 w-3.5" />
                مقفلة
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles(status)}`}
              >
                <StatusIcon status={status} locked={locked} current={current} />
                {statusLabel(status)}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-center">
          <p className="text-[11px] text-slate-500">الحقول</p>
          <p className="text-sm font-bold text-slate-900">
            {selectedCount}/{step.fields.length}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
        <p className="text-xs leading-6 text-slate-600">
          افتح الخطوة لتحديث القيم المطلوبة ثم المتابعة للمرحلة التالية بالتسلسل.
        </p>
        <button
          type="button"
          disabled={locked}
          onClick={() => onOpenStep(step.id)}
          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          فتح الخطوة
        </button>
      </div>
    </article>
  );
}
