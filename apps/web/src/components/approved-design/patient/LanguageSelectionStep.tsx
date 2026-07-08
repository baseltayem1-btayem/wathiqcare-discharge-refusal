"use client";

import { Check, Globe2, Languages, ShieldCheck } from "lucide-react";
import { Card, cls, type Lang } from "../shared";

type LanguageOption = {
  value: Lang;
  label: string;
  description: string;
};

export function LanguageSelectionStep({
  lang,
  selectedLang,
  onSelect,
  onContinue,
}: {
  lang: Lang;
  selectedLang: Lang;
  onSelect: (value: Lang) => void;
  onContinue: () => void;
}) {
  const isAr = lang === "ar";

  const options: LanguageOption[] = [
    {
      value: "en",
      label: isAr ? "الإنجليزية" : "English",
      description: isAr ? "اعرض جميع الشاشات والمحتوى بالإنجليزية." : "Display all screens and content in English.",
    },
    {
      value: "ar",
      label: isAr ? "العربية" : "Arabic",
      description: isAr ? "اعرض جميع الشاشات والمحتوى بالعربية." : "Display all screens and content in Arabic.",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className={cls("flex flex-col gap-1", isAr ? "items-end text-right" : "items-start text-left")}>
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#dbe7f4] bg-[linear-gradient(180deg,#edf4fd_0%,#dfeefc_100%)] text-[#1b4f8a] shadow-[0_14px_30px_rgba(14,41,78,0.08)]">
          <Languages size={26} />
        </div>
        <h1 className="text-2xl font-bold leading-tight text-[#102c56]">
          {isAr ? "اختر اللغة" : "Choose your language"}
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          {isAr
            ? "يمكنك متابعة الرحلة كاملة بالعربية أو الإنجليزية. يمكنك التبديل لاحقاً من الشريط العلوي."
            : "Continue the full journey in Arabic or English. You can switch again later from the top bar."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const selected = selectedLang === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cls(
                "w-full rounded-[24px] border p-5 text-start transition-colors shadow-[0_14px_34px_rgba(12,39,74,0.05)]",
                selected
                  ? "border-[#2d68b2] bg-[linear-gradient(180deg,#f7fbff_0%,#edf5ff_100%)] shadow-[0_16px_30px_rgba(45,104,178,0.10)]"
                  : "border-[#dbe7f4] bg-white hover:border-[#9ec0e3] hover:bg-[#fbfdff]",
              )}
            >
              <div className={cls("flex items-start justify-between gap-3", isAr ? "flex-row-reverse text-right" : "flex-row text-left")}>
                <div className="flex flex-col gap-1">
                  <div className={cls("flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
                    <div className={cls("flex h-10 w-10 items-center justify-center rounded-2xl", selected ? "bg-[#1f5fae] text-white" : "bg-[#edf4fd] text-[#1b4f8a]")}>
                      <Globe2 size={18} />
                    </div>
                    <span className="text-lg font-semibold text-[#133863]">{option.label}</span>
                  </div>
                  <p className="text-sm leading-7 text-slate-500">{option.description}</p>
                </div>
                <div
                  className={cls(
                    "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-[#2d68b2] bg-[#2d68b2] text-white" : "border-[#d3dfed] bg-white text-transparent",
                  )}
                  aria-hidden="true"
                >
                  <Check size={13} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="rounded-[24px] border border-[#dbe7f4] bg-white p-4 shadow-[0_14px_34px_rgba(12,39,74,0.05)]">
        <div className={cls("mb-2 flex items-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
          <ShieldCheck size={15} className="text-emerald-600" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            {isAr ? "لغة آمنة ومعتمدة" : "Verified language mode"}
          </span>
        </div>
        <p className={cls("text-sm leading-7 text-slate-500", isAr ? "text-right" : "text-left")}>
          {isAr
            ? "سيتم استخدام اللغة المحددة في شرح الإجراء، المخاطر، أسئلة المريض، ونسخة الـ PDF التي يمكنك تنزيلها لاحقاً."
            : "Your selected language will be used for the procedure explanation, risks, patient prompts, and the PDF copy you can download later."}
        </p>
      </Card>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-[18px] bg-[#1f5fae] py-4 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(31,95,174,0.24)] transition-colors hover:bg-[#184d90] active:scale-[0.99]"
      >
        {isAr ? "متابعة" : "Continue"}
      </button>
    </div>
  );
}