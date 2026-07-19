"use client";

import { Check } from "lucide-react";
import { cn } from "@/components/design-system";
import type { Readiness, WorkspaceStep } from "../hooks/useProductionWorkspace";

type WorkflowStepperProps = {
  currentStep: WorkspaceStep;
  readiness: Readiness;
  lang?: "en" | "ar";
};

type StepDefinition = {
  id: WorkspaceStep;
  label: string;
  labelAr: string;
  complete: (readiness: Readiness) => boolean;
};

const STEPS: StepDefinition[] = [
  { id: "patient", label: "Verify patient", labelAr: "التحقق من المريض", complete: (readiness) => readiness.patientReady },
  { id: "encounter", label: "Confirm recipient", labelAr: "تأكيد المستلم", complete: (readiness) => readiness.contactAvailable },
  { id: "procedure", label: "Select procedure", labelAr: "اختيار الإجراء", complete: (readiness) => readiness.procedureSelected },
  { id: "review", label: "Readiness review", labelAr: "مراجعة الجاهزية", complete: (readiness) => readiness.assemblyReady },
  { id: "sent", label: "Send consent", labelAr: "إرسال الموافقة", complete: (readiness) => readiness.sendReady },
];

export function WorkflowStepper({ currentStep, readiness, lang = "en" }: WorkflowStepperProps) {
  const activeIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Consent workflow" className="w-full">
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((step, index) => {
          const complete = step.complete(readiness);
          const isActive = index === activeIndex;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors",
                  isActive && "border-blue-200 bg-blue-50/60",
                  complete && "border-emerald-200 bg-emerald-50/60",
                  !complete && !isActive && "border-slate-200 bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    complete && "bg-emerald-500 text-white",
                    isActive && "bg-blue-600 text-white ring-4 ring-blue-100",
                    !complete && !isActive && "bg-slate-100 text-slate-500",
                  )}
                >
                  {complete ? <Check className="size-3.5" /> : index + 1}
                </span>
                <div className="min-w-0">
                  <p className={cn("truncate text-xs font-semibold", isActive ? "text-blue-700" : complete ? "text-slate-900" : "text-slate-500")}>
                    {lang === "ar" ? step.labelAr : step.label}
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-wide text-slate-400">
                    {complete ? "Complete" : isActive ? "In progress" : "Pending"}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 ? (
                <span className={cn("hidden h-px w-4 shrink-0 sm:block", complete ? "bg-emerald-200" : "bg-slate-200")} aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}