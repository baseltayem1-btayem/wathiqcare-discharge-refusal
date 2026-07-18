"use client";

import { cn, dirFor, rowDir, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type LanguageSelectorProps = {
  lang: PublicSigningLang;
  onChange: (lang: PublicSigningLang) => void;
  className?: string;
};

const OPTIONS: Array<{ value: PublicSigningLang; labelAr: string; labelEn: string }> = [
  { value: "ar", labelAr: "العربية", labelEn: "Arabic" },
  { value: "en", labelEn: "English", labelAr: "English" },
  { value: "bilingual", labelAr: "عربي + English", labelEn: "Arabic + English" },
];

export default function LanguageSelector({ lang, onChange, className }: LanguageSelectorProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <h2 className={cn("text-sm font-semibold text-slate-900", textAlign(uiLang))}>
        {uiLang === "ar" ? "اختر لغة العرض" : "Choose display language"}
      </h2>
      <div className={cn("mt-3 flex flex-wrap gap-2", rowDir(uiLang))}>
        {OPTIONS.map((option) => {
          const active = lang === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-700 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {lang === "ar" ? option.labelAr : option.labelEn}
            </button>
          );
        })}
      </div>
    </section>
  );
}
