"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { cls, T, type Lang } from "../shared";

export function PatientJourneyFooter({ lang }: { lang: Lang }) {
  const isAr = lang === "ar";
  const t = T[lang];
  return (
    <footer className="border-t border-border bg-card px-4 py-4 mt-auto">
      <div
        className={cls(
          "mx-auto max-w-md flex flex-col items-center gap-2 text-center",
        )}
      >
        <div
          className={cls(
            "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <ShieldCheck size={12} />
          {t.secureNotice}
        </div>
        <div
          className={cls(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <Lock size={10} />
          <span>
            {isAr
              ? "توقيعك مشفّر ومختوم بالوقت وفق معايير eIDAS المعتمدة."
              : "Your signature is encrypted and timestamped to eIDAS standards."}
          </span>
        </div>
      </div>
    </footer>
  );
}
