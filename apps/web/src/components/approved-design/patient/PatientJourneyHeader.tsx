"use client";

import { ArrowLeft, Globe, Shield } from "lucide-react";
import { cls, T, type Lang } from "../shared";
import { PatientJourneyStepper } from "./PatientJourneyStepper";

export function PatientJourneyHeader({
  lang,
  facilityName,
  step,
  onLangToggle,
  onBack,
}: {
  lang: Lang;
  facilityName?: string | null;
  step?: number;
  onLangToggle: () => void;
  onBack?: () => void;
}) {
  const isAr = lang === "ar";
  const t = T[lang];

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 shadow-sm">
      <div
        className={cls(
          "mx-auto flex max-w-md flex-col gap-2.5",
        )}
      >
        <div
          className={cls(
            "flex items-center justify-between gap-3",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <div
            className={cls(
              "flex items-center gap-2.5",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={isAr ? "رجوع" : "Back"}
                title={isAr ? "رجوع" : "Back"}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft size={18} className={isAr ? "rotate-180" : ""} />
              </button>
            ) : null}
            <div className="h-8 w-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Shield size={15} />
            </div>
            <div className={isAr ? "text-right" : "text-left"}>
              <p className="text-sm font-bold leading-none text-primary">
                {t.platformName}
              </p>
              {facilityName ? (
                <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[140px]">
                  {facilityName}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onLangToggle}
            className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <Globe size={12} />
            {t.language}
          </button>
        </div>

        {step !== undefined && step >= 1 && step <= 5 ? (
          <PatientJourneyStepper activeStep={step} lang={lang} />
        ) : null}
      </div>
    </header>
  );
}
