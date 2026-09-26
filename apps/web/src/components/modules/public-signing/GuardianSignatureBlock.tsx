"use client";

import { cn, dirFor, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type GuardianSignatureBlockProps = {
  lang: PublicSigningLang;
  relationship: string;
  onRelationshipChange: (value: string) => void;
  className?: string;
};

export default function GuardianSignatureBlock({
  lang,
  relationship,
  onRelationshipChange,
  className,
}: GuardianSignatureBlockProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  const isRtl = lang === "ar" || lang === "bilingual";

  return (
    <section
      className={cn(
        "rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <h3 className={cn("text-sm font-semibold text-indigo-900", textAlign(uiLang))}>
        {uiLang === "ar" ? "تفاصيل ولي الأمر / مَن يتخذ القرار البديل" : "Guardian / substitute decision-maker details"}
      </h3>
      <p className={cn("mt-1 text-xs text-indigo-800/80", textAlign(uiLang))}>
        {uiLang === "ar"
          ? "أنت توقع بصفة ولي أمر أو مَن يتخذ قراراً بديلاً عن المريض. لا يُسمح بوضع توقيعك في حقل توقيع المريض."
          : "You are signing as a guardian or substitute decision-maker. Your signature must not be placed in the patient signature field."}
      </p>
      <label className={cn("mt-3 block text-sm font-medium text-indigo-900", textAlign(uiLang))} htmlFor="guardianRelationship">
        {uiLang === "ar" ? "العلاقة بالمريض" : "Relationship to patient"}
      </label>
      <input
        id="guardianRelationship"
        type="text"
        value={relationship}
        onChange={(event) => onRelationshipChange(event.target.value)}
        className={cn(
          "mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900",
          "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200",
          isRtl ? "text-right" : "text-left",
        )}
        placeholder={uiLang === "ar" ? "مثال: الوالد، الوالدة، الوصي" : "e.g. Parent, Legal Guardian"}
      />
    </section>
  );
}
