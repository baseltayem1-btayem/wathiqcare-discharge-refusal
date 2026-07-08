"use client";

import { Bell, Clock3, Languages, ShieldCheck, Stethoscope } from "lucide-react";
import { cn } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkspaceBadge } from "../WorkspaceAtoms";
import type { ClinicalKnowledgeAssembly, ProductionEncounter, ProductionPatient } from "../../types";

interface PhysicianWorkspaceHeaderProps {
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  selectedProcedureTitle?: string;
  assembly?: ClinicalKnowledgeAssembly;
}

export function PhysicianWorkspaceHeader({
  patient,
  encounter,
  selectedProcedureTitle,
  assembly,
}: PhysicianWorkspaceHeaderProps) {
  const { lang, setLang, isRtl } = useI18n();
  const procedureLabel = selectedProcedureTitle || assembly?.procedureNameEn || assembly?.procedureNameAr;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/88 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              {lang === "ar" ? "مركز قيادة الموافقات" : "Consent Command Center"}
            </p>
            <WorkspaceBadge tone="green">
              <ShieldCheck className="size-3.5" /> {lang === "ar" ? "حوكمة فعالة" : "Governance active"}
            </WorkspaceBadge>
            <WorkspaceBadge tone="gold">
              <Clock3 className="size-3.5" /> {lang === "ar" ? "وضع الطبيب" : "Physician mode"}
            </WorkspaceBadge>
          </div>
          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {lang === "ar" ? "مساحة عمل الموافقة المستنيرة" : "Informed Consent Workspace"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {lang === "ar"
                  ? "مراجعة نموذج IMC المعتمد، التحقق من الجاهزية، ثم إرسال جلسة التوقيع دون تغيير أي منطق تشغيلي."
                  : "Review the approved IMC consent, verify readiness, and dispatch secure signing without changing operational logic."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 shadow-sm">
              <span className="font-medium text-slate-900">{patient?.name || (lang === "ar" ? "لا يوجد مريض" : "No patient")}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>{encounter?.encounterId || (lang === "ar" ? "الزيارة غير محددة" : "Encounter pending")}</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>{procedureLabel || (lang === "ar" ? "الإجراء غير محدد" : "Procedure pending")}</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 shadow-sm xl:flex">
            <Stethoscope className="size-3.5 text-blue-700" />
            <span>{encounter?.physician || (lang === "ar" ? "الطبيب المعالج" : "Assigned physician")}</span>
          </div>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
            <span className="px-2 text-slate-400">
              <Languages className="size-4" />
            </span>
            {(["en", "ar"] as const).map((nextLang) => (
              <button
                key={nextLang}
                type="button"
                onClick={() => setLang(nextLang)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  lang === nextLang ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-900",
                )}
                aria-label={nextLang === "en" ? "Switch to English" : "Switch to Arabic"}
              >
                {nextLang === "en" ? "EN" : "ع"}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label={lang === "ar" ? "الإشعارات" : "Notifications"}
            className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900"
          >
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-amber-500" aria-hidden />
          </button>

          <div className="hidden items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm sm:flex">
            <span className="font-mono text-slate-500">{isRtl ? "RTL" : "LTR"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}