"use client";

import { Check } from "lucide-react";
import { cls, T, type Lang } from "../shared";

export function PatientJourneyStepper({
  activeStep,
  lang,
}: {
  activeStep: number;
  lang: Lang;
}) {
  const labels = T[lang].journeySteps || [];
  const totalSteps = Math.max(labels.length, 1);
  const isAr = lang === "ar";

  return (
    <div
      className={cls(
        "grid grid-cols-4 gap-2 rounded-[22px] border border-white/10 bg-[#0a2547]/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:grid-cols-7 sm:gap-3",
        isAr ? "flex-row-reverse" : "flex-row",
      )}
      aria-label={isAr ? "مؤشر التقدم" : "Progress indicator"}
    >
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const step = idx + 1;
        const completed = step < activeStep;
        const current = step === activeStep;

        return (
          <div
            key={step}
            className={cls(
              "flex min-w-0 flex-col items-center gap-2",
              isAr ? "rtl" : "ltr",
            )}
          >
            <div className="flex w-full items-center gap-2">
              {idx > 0 ? (
                <div className={cls("hidden h-px flex-1 sm:block", step <= activeStep ? "bg-emerald-400/70" : "bg-white/10")} aria-hidden="true" />
              ) : null}
              <div
                className={cls(
                  "mx-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                  completed
                    ? "border-emerald-400 bg-emerald-500 text-white"
                    : current
                      ? "border-[#7ab5ff] bg-[#1f5fae] text-white shadow-[0_0_0_4px_rgba(56,114,197,0.22)]"
                      : "border-white/18 bg-white/8 text-white/72",
                )}
                aria-current={current ? "step" : undefined}
              >
                {completed ? <Check size={15} /> : step}
              </div>
              {idx < totalSteps - 1 ? (
                <div className={cls("hidden h-px flex-1 sm:block", step < activeStep ? "bg-emerald-400/70" : "bg-white/10")} aria-hidden="true" />
              ) : null}
            </div>
            <span
              className={cls(
                "px-0.5 text-center text-[10px] font-medium leading-tight line-clamp-2 sm:text-[11px]",
                current ? "text-white" : completed ? "text-emerald-100" : "text-white/70",
              )}
            >
              {labels[idx]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
