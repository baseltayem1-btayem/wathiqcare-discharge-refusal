"use client";

import { AlertTriangle, Check, Circle } from "lucide-react";
import { cn } from "@/components/design-system/utils";

export type WorkflowProgressState = "completed" | "current" | "upcoming" | "warning" | "blocked";

export type WorkflowProgressDirection = "rtl" | "ltr";

export type WorkflowProgressStep = {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  state?: WorkflowProgressState;
  clickable?: boolean;
  href?: string;
};

type WorkflowProgressResolvedStep = WorkflowProgressStep & {
  index: number;
  state: WorkflowProgressState;
  title: string;
  subtitle?: string;
};

type WorkflowProgressProps = {
  steps: WorkflowProgressStep[];
  language?: "ar" | "en";
  direction?: WorkflowProgressDirection;
  currentStepId?: string;
  currentStepIndex?: number;
  onStepClick?: (step: WorkflowProgressResolvedStep) => void;
  className?: string;
  ariaLabel?: string;
};

function resolveActiveIndex(steps: WorkflowProgressStep[], currentStepId?: string, currentStepIndex?: number) {
  if (typeof currentStepIndex === "number") {
    return currentStepIndex;
  }

  if (currentStepId) {
    return steps.findIndex((step) => step.id === currentStepId);
  }

  return steps.findIndex((step) => step.state === "current" || step.state === "warning");
}

function deriveState(index: number, activeIndex: number): WorkflowProgressState {
  if (activeIndex < 0) {
    return "upcoming";
  }
  if (index < activeIndex) {
    return "completed";
  }
  if (index === activeIndex) {
    return "current";
  }
  return "upcoming";
}

function markerClasses(state: WorkflowProgressState) {
  switch (state) {
    case "completed":
      return "border-emerald-500 bg-emerald-50 text-emerald-600";
    case "current":
      return "border-sky-500 bg-sky-50 text-sky-700";
    case "warning":
    case "blocked":
      return "border-amber-500 bg-amber-50 text-amber-700";
    default:
      return "border-slate-300 bg-slate-50 text-slate-500";
  }
}

function connectorClasses(state: WorkflowProgressState, direction: WorkflowProgressDirection) {
  if (state === "completed") {
    return "after:bg-emerald-400";
  }

  if (state === "current") {
    return direction === "rtl"
      ? "after:bg-gradient-to-l after:from-sky-500 after:to-slate-200"
      : "after:bg-gradient-to-r after:from-sky-500 after:to-slate-200";
  }

  if (state === "warning" || state === "blocked") {
    return "after:bg-amber-300";
  }

  return "after:bg-slate-200";
}

export default function WorkflowProgress({
  steps,
  language = "ar",
  direction,
  currentStepId,
  currentStepIndex,
  onStepClick,
  className,
  ariaLabel = "Workflow progress tracker",
}: WorkflowProgressProps) {
  const resolvedDirection = direction || (language === "ar" ? "rtl" : "ltr");
  const activeIndex = resolveActiveIndex(steps, currentStepId, currentStepIndex);

  const resolvedSteps: WorkflowProgressResolvedStep[] = steps.map((step, index) => {
    const state = step.state ?? deriveState(index, activeIndex);
    return {
      ...step,
      index,
      state,
      title: language === "ar" ? step.titleAr : step.titleEn,
      subtitle: language === "ar" ? step.subtitleAr : step.subtitleEn,
    };
  });

  return (
    <section
      dir={resolvedDirection}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 scrollbar-thin",
        className
      )}
    >
      <ol className="flex min-w-max items-start gap-0" role="list">
        {resolvedSteps.map((step, index) => {
          const clickable = Boolean(step.clickable && onStepClick);

          return (
            <li key={step.id} className="flex min-w-40 items-start sm:min-w-44 lg:min-w-48">
              <button
                type="button"
                disabled={!clickable}
                aria-current={step.state === "current" || step.state === "warning" ? "step" : undefined}
                onClick={() => {
                  if (clickable) {
                    onStepClick?.(step);
                  }
                }}
                className={cn(
                  "inline-flex items-start gap-3 bg-transparent text-start",
                  clickable ? "cursor-pointer" : "cursor-default",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                    markerClasses(step.state)
                  )}
                >
                  {step.state === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : step.state === "warning" || step.state === "blocked" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : step.state === "current" ? (
                    <Circle className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    step.index + 1
                  )}
                </span>

                <span className="max-w-32 pt-0.5 sm:max-w-36 lg:max-w-40">
                  <span
                    className={cn(
                      "block text-sm leading-5",
                      step.state === "current" || step.state === "warning"
                        ? "font-bold text-slate-950"
                        : step.state === "completed"
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-600",
                      clickable && "transition-colors hover:text-sky-800"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.subtitle ? (
                    <span className="mt-1 block text-xs leading-4 text-slate-500">{step.subtitle}</span>
                  ) : null}
                </span>
              </button>

              {index < resolvedSteps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative h-8 w-10 shrink-0 sm:w-12 lg:w-16",
                    "after:absolute after:start-1 after:end-1 after:top-4 after:h-0.5 after:rounded-full",
                    connectorClasses(step.state, resolvedDirection)
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
