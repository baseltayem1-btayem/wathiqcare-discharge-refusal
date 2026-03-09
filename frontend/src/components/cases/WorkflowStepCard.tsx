import WorkflowDropdownField from "@/components/cases/WorkflowDropdownField";
import type {
  WorkflowSelectionState,
  WorkflowStep,
  WorkflowStepStatus,
} from "@/components/cases/workflowTreeTypes";

type WorkflowStepCardProps = {
  step: WorkflowStep;
  index: number;
  status: WorkflowStepStatus;
  values: WorkflowSelectionState;
  onFieldChange: (stepId: string, fieldId: string, value: string) => void;
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
  values,
  onFieldChange,
}: WorkflowStepCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {index + 1}. {step.title}
        </h3>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles(status)}`}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {step.fields.map((field) => (
          <WorkflowDropdownField
            key={`${step.id}-${field.id}`}
            label={field.label}
            value={values[step.id]?.[field.id] || ""}
            options={field.options}
            onChange={(value) => onFieldChange(step.id, field.id, value)}
          />
        ))}
      </div>
    </article>
  );
}
