"use client";

import { Check } from "lucide-react";
import { cls, T, type Lang } from "../shared";

const TOTAL_STEPS = 5;

export function PatientJourneyStepper({
  activeStep,
  lang,
}: {
  activeStep: number;
  lang: Lang;
}) {
  const labels = T[lang].journeySteps || [
    "",
    "",
    "",
    "",
    "",
  ];
  const isAr = lang === "ar";

  return (
    <div
      className={cls(
        "flex items-start justify-between gap-1",
        isAr ? "flex-row-reverse" : "flex-row",
      )}
      aria-label={isAr ? "مؤشر التقدم" : "Progress indicator"}
    >
      {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
        const step = idx + 1;
        const completed = step < activeStep;
        const current = step === activeStep;

        return (
          <div
            key={step}
            className={cls(
              "flex-1 flex flex-col items-center gap-1.5 min-w-0",
              isAr ? "rtl" : "ltr",
            )}
          >
            <div
              className={cls(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                completed
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : current
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              {completed ? <Check size={14} /> : step}
            </div>
            <span
              className={cls(
                "text-[10px] font-medium leading-tight text-center px-0.5 line-clamp-2",
                current ? "text-primary" : "text-muted-foreground",
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
