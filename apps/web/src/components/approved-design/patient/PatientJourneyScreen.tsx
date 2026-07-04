"use client";

import type { ReactNode } from "react";
import { cls, type Lang } from "../shared";
import { PatientJourneyFooter } from "./PatientJourneyFooter";
import { PatientJourneyHeader } from "./PatientJourneyHeader";

export function PatientJourneyScreen({
  lang,
  facilityName,
  step,
  onLangToggle,
  onBack,
  children,
}: {
  lang: Lang;
  facilityName?: string | null;
  step?: number;
  onLangToggle: () => void;
  onBack?: () => void;
  children: ReactNode;
}) {
  const isAr = lang === "ar";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={cls(
        "min-h-screen bg-background flex flex-col",
        isAr ? "font-ar" : "font-en",
      )}
    >
      <PatientJourneyHeader
        lang={lang}
        facilityName={facilityName}
        step={step}
        onLangToggle={onLangToggle}
        onBack={onBack}
      />
      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-4">
        {children}
      </main>
      <PatientJourneyFooter lang={lang} />
    </div>
  );
}
