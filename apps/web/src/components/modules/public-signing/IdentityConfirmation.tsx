"use client";

import { User, Stethoscope, FileBadge } from "lucide-react";
import { cn, dirFor, rowDir, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type IdentityConfirmationProps = {
  lang: PublicSigningLang;
  patientName: string;
  physicianName?: string | null;
  procedure?: string | null;
  consentReference?: string | null;
  confirmed: boolean;
  onConfirm: (confirmed: boolean) => void;
  className?: string;
};

export default function IdentityConfirmation({
  lang,
  patientName,
  physicianName,
  procedure,
  consentReference,
  confirmed,
  onConfirm,
  className,
}: IdentityConfirmationProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  const isRtl = lang === "ar" || lang === "bilingual";

  const labelPatient = uiLang === "ar" ? "اسم المريض/ة" : "Patient name";
  const labelPhysician = uiLang === "ar" ? "الطبيب المعالج" : "Physician";
  const labelProcedure = uiLang === "ar" ? "الإجراء المقترح" : "Planned procedure";
  const labelReference = uiLang === "ar" ? "الرقم المرجعي" : "Reference";

  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-200 bg-white p-5 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <h2 className={cn("text-lg font-semibold text-slate-900", textAlign(uiLang))}>
        {uiLang === "ar" ? "تأكيد الهوية" : "Confirm your identity"}
      </h2>
      <p className={cn("mt-1 text-sm text-slate-600", textAlign(uiLang))}>
        {uiLang === "ar"
          ? "تحقق من صحة المعلومات أدناه قبل متابعة رحلة الموافقة."
          : "Verify the information below before continuing your consent journey."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3",
            rowDir(uiLang),
          )}
        >
          <User size={18} className="shrink-0 text-sky-700" aria-hidden />
          <div className={cn("min-w-0", textAlign(uiLang))}>
            <p className="text-xs text-slate-500">{labelPatient}</p>
            <p className="truncate text-sm font-semibold text-slate-900">{patientName}</p>
          </div>
        </div>

        {physicianName ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3",
              rowDir(uiLang),
            )}
          >
            <Stethoscope size={18} className="shrink-0 text-sky-700" aria-hidden />
            <div className={cn("min-w-0", textAlign(uiLang))}>
              <p className="text-xs text-slate-500">{labelPhysician}</p>
              <p className="truncate text-sm font-semibold text-slate-900">{physicianName}</p>
            </div>
          </div>
        ) : null}

        {procedure ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3",
              rowDir(uiLang),
            )}
          >
            <FileBadge size={18} className="shrink-0 text-sky-700" aria-hidden />
            <div className={cn("min-w-0", textAlign(uiLang))}>
              <p className="text-xs text-slate-500">{labelProcedure}</p>
              <p className="truncate text-sm font-semibold text-slate-900">{procedure}</p>
            </div>
          </div>
        ) : null}

        {consentReference ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3",
              rowDir(uiLang),
            )}
          >
            <FileBadge size={18} className="shrink-0 text-sky-700" aria-hidden />
            <div className={cn("min-w-0", textAlign(uiLang))}>
              <p className="text-xs text-slate-500">{labelReference}</p>
              <p className="truncate text-sm font-semibold text-slate-900" dir="ltr">{consentReference}</p>
            </div>
          </div>
        ) : null}
      </div>

      <label
        className={cn(
          "mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700",
          rowDir(uiLang),
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={confirmed}
          onChange={(event) => onConfirm(event.target.checked)}
        />
        <span className={isRtl ? "text-right" : "text-left"}>
          {uiLang === "ar"
            ? `أؤكد أنني ${patientName} وأن المعلومات أعلاه صحيحة.`
            : `I confirm that I am ${patientName} and that the information above is correct.`}
        </span>
      </label>
    </section>
  );
}
