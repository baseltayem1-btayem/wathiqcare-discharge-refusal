"use client";

import { Check, Clock3, ShieldX } from "lucide-react";
import { type WorkflowStep } from "./types";

type WorkflowStepperProps = {
  steps: WorkflowStep[];
};

const STATUS_STYLES: Record<WorkflowStep["status"], string> = {
  completed: "wc-status-ready",
  pending: "wc-status-pending",
  blocked: "wc-status-blocked",
};

export default function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <section className="wc-panel border-slate-200 bg-white">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="wc-panel-heading !mb-0">سير العمل | Workflow Control Panel</h2>
          <p className="text-[11px] text-slate-500">Horizontal legal-clinical status tracking for consent issuance lifecycle.</p>
        </div>
        <span className="wc-module-pill">{steps.filter((step) => step.status === "completed").length}/{steps.length} complete</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[980px] items-start gap-2">
          {steps.map((step, index) => {
            const isCompleted = step.status === "completed";
            const isBlocked = step.status === "blocked";
            return (
              <div key={step.id} className="flex flex-1 items-start gap-2">
                <div className="min-w-[130px] space-y-1 text-center">
                  <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${STATUS_STYLES[step.status]}`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : isBlocked ? <ShieldX className="h-3 w-3" /> : step.id}
                  </div>
                  <p className="text-[10px] font-semibold text-slate-800">{step.title.ar}</p>
                  <p className="text-[10px] text-slate-500">{step.title.en}</p>
                  <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500"><Clock3 className="h-3 w-3" /> {step.timestamp}</p>
                  <p className="text-[10px] text-slate-500">{step.responsibleUser}</p>
                </div>
                {index < steps.length - 1 ? (
                  <div className={`mt-3 h-[2px] flex-1 ${isCompleted ? "bg-emerald-400" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
