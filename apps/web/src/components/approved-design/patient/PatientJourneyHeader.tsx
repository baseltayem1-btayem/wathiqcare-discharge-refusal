"use client";

import Image from "next/image";
import { ArrowLeft, Globe, Sparkles } from "lucide-react";
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
  const totalSteps = t.journeySteps.length;

  return (
    <header className="sticky top-0 z-20 border-b border-[#dbe7f5] bg-[linear-gradient(180deg,#0d2c57_0%,#123a6f_100%)] px-4 py-4 text-white shadow-[0_16px_40px_rgba(8,29,58,0.24)]">
      <div
        className={cls(
          "mx-auto flex max-w-5xl flex-col gap-3",
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
                className="rounded-full border border-white/15 bg-white/10 p-2 text-white/90 transition-colors hover:bg-white/15"
              >
                <ArrowLeft size={18} className={isAr ? "rotate-180" : ""} />
              </button>
            ) : null}
            <div className="flex shrink-0 items-center justify-center rounded-[18px] border border-white/15 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(10,24,48,0.24)]">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                width={118}
                height={32}
                priority
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className={isAr ? "text-right" : "text-left"}>
              <p className="text-sm font-bold leading-none text-white">
                {lang === "ar" ? "توثيق الرعاية، حماية المريض" : "Secure digital consent journey"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#d6e3f5]">
                {lang === "ar" ? "واثق كير" : "International Medical Center patient signing"}
              </p>
              {facilityName ? (
                <p className="mt-1 max-w-[220px] truncate text-[10px] leading-tight text-white/65">
                  {facilityName}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onLangToggle}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            <Globe size={12} />
            {t.language}
          </button>
        </div>

        <div className={cls("flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur", isAr ? "flex-row-reverse" : "flex-row") }>
          <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#19a974]/15 text-[#8ce0b4]">
              <Sparkles size={15} />
            </div>
            <div className={isAr ? "text-right" : "text-left"}>
              <p className="text-xs font-semibold text-white">
                {lang === "ar" ? "مراجعة قانونية موثقة" : "Legally defensible review"}
              </p>
              <p className="text-[11px] text-white/70">
                {lang === "ar" ? "OTP + توقيع إلكتروني + سجل تدقيق" : "OTP + eSignature + audit trail"}
              </p>
            </div>
          </div>
          {step !== undefined && step >= 1 && step <= totalSteps ? (
            <span className="rounded-full border border-white/10 bg-[#0a2547] px-2.5 py-1 text-[11px] font-semibold text-[#d6b15f]">
              {lang === "ar" ? `الخطوة ${step}/${totalSteps}` : `Step ${step}/${totalSteps}`}
            </span>
          ) : null}
        </div>

        {step !== undefined && step >= 1 && step <= totalSteps ? (
          <PatientJourneyStepper activeStep={step} lang={lang} />
        ) : null}
      </div>
    </header>
  );
}
