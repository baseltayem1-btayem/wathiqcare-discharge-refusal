"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { cls, T, type Lang } from "../shared";

export function PatientJourneyFooter({ lang }: { lang: Lang }) {
  const isAr = lang === "ar";
  const t = T[lang];
  const trustItems = lang === "ar"
    ? ["آمن ومشفر", "متوافق", "سهل الاستخدام", "موثوق"]
    : ["Secure", "Compliant", "Easy to use", "Trusted"];
  return (
    <footer className="mt-auto border-t border-[#d8e4f3] bg-[linear-gradient(180deg,#f8fbfe_0%,#eef4fb_100%)] px-4 py-4">
      <div
        className={cls(
          "mx-auto flex max-w-5xl flex-col gap-3 text-center",
        )}
      >
        <div className={cls("flex flex-wrap items-center justify-center gap-2", isAr ? "flex-row-reverse" : "flex-row")}>
          {trustItems.map((item) => (
            <span key={item} className="rounded-full border border-[#cfe0f0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#163b67] shadow-sm">
              {item}
            </span>
          ))}
        </div>
        <div className="rounded-[20px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_10px_30px_rgba(11,38,74,0.06)]">
          <div
            className={cls(
              "mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <ShieldCheck size={12} />
            {t.secureNotice}
          </div>
          <div
            className={cls(
              "flex items-center justify-center gap-1 text-[11px] text-slate-500",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Lock size={10} />
            <span>
              {isAr
                ? "تُحمى بياناتك الصحية وفق ضوابط الخصوصية المعتمدة داخل المنصة." 
                : "Your health information is protected under the platform's approved privacy controls."}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
