"use client";

import { cn, dirFor, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type RefusalReasonInputProps = {
  lang: PublicSigningLang;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function RefusalReasonInput({
  lang,
  value,
  onChange,
  className,
}: RefusalReasonInputProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  const isRtl = lang === "ar" || lang === "bilingual";

  return (
    <section
      className={cn(
        "rounded-2xl border border-rose-200 bg-white p-5 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <h2 className={cn("text-base font-semibold text-rose-900", textAlign(uiLang))}>
        {uiLang === "ar" ? "سبب الرفض" : "Reason for refusal"}
      </h2>
      <p className={cn("mt-1 text-sm text-rose-800/80", textAlign(uiLang))}>
        {uiLang === "ar"
          ? "يُرجى توضيح سبب رفضك الإجراء. هذا لا يُعدّ بديلاً عن النقاش مع طبيبك."
          : "Please briefly explain why you are refusing the procedure. This does not replace discussion with your physician."}
      </p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-3 min-h-[120px] w-full rounded-xl border border-rose-200 bg-white p-3 text-sm text-slate-900",
          "focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200",
          isRtl ? "text-right" : "text-left",
        )}
        placeholder={
          uiLang === "ar"
            ? "اكتب سبب الرفض هنا..."
            : "Type your reason for refusal here..."
        }
      />
      <p className={cn("mt-2 text-xs text-slate-500", textAlign(uiLang))}>
        {uiLang === "ar" ? "الحد الأقصى 1000 حرف" : "Maximum 1000 characters"}
      </p>
    </section>
  );
}
