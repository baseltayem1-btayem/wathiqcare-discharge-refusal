import { CheckCircle2, Circle, Clock } from "lucide-react";

type WorkflowStep = {
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
  timestamp?: string;
};

type WorkflowProgressProps = {
  steps: WorkflowStep[];
  orientation?: "horizontal" | "vertical";
};

export default function WorkflowProgress({ 
  steps, 
  orientation = "horizontal" 
}: WorkflowProgressProps) {
  if (orientation === "vertical") {
    return (
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                step.status === "completed"
                  ? "border-emerald-500 bg-emerald-50"
                  : step.status === "active"
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50"
              }`}>
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : step.status === "active" ? (
                  <Clock className="h-5 w-5 text-blue-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-8 w-0.5 ${
                  steps[index + 1].status === "completed" ? "bg-emerald-300" : "bg-slate-200"
                }`} />
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className={`text-sm font-medium ${
                step.status === "completed" 
                  ? "text-emerald-900" 
                  : step.status === "active"
                  ? "text-blue-900"
                  : "text-slate-600"
              }`}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="mt-0.5 text-xs text-slate-500">{step.timestamp}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {steps.map((step, index) => (
        <div key={step.id} className="flex flex-1 items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              step.status === "completed"
                ? "border-emerald-500 bg-emerald-50"
                : step.status === "active"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-slate-50"
            }`}>
              {step.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : step.status === "active" ? (
                <Clock className="h-4 w-4 text-blue-600" />
              ) : (
                <Circle className="h-3 w-3 text-slate-400" />
              )}
            </div>
            <p className={`text-xs font-medium ${
              step.status !== "pending" ? "text-slate-900" : "text-slate-500"
            }`}>
              {step.label}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 flex-1 ${
              steps[index + 1].status === "completed" ? "bg-emerald-300" : "bg-slate-200"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
