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
        "min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_rgba(220,232,247,0.95),_rgba(242,247,252,0.96)_42%,_rgba(249,251,254,1)_72%)] text-slate-950",
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
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:gap-6">
          <div className="rounded-[28px] border border-white/70 bg-white/70 p-3 shadow-[0_24px_80px_rgba(12,37,74,0.10)] backdrop-blur md:p-4">
            <div className="rounded-[24px] border border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,255,0.96))] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </div>
        </div>
      </main>
      <PatientJourneyFooter lang={lang} />
    </div>
  );
}
