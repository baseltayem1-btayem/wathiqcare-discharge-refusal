"use client";

import { Lock, Search, Stethoscope } from "lucide-react";
import { Button, Checkbox, Input } from "@/components/design-system";
import { useI18n } from "@/i18n/I18nProvider";
import type { ProductionEncounter, ProductionProcedure } from "../../types";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader, WorkspaceField } from "../WorkspaceAtoms";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

interface ProcedureSelectionPanelProps {
  encounter?: ProductionEncounter;
  selectedProcedureId?: string;
  selectedProcedureTitle?: string;
  selectedProcedure?: ProductionProcedure;
  procedureQuery: string;
  procedures: ProductionProcedure[];
  proceduresLoading: boolean;
  procedureSearchMessage: string;
  reviewMode: boolean;
  assemblyLoading: boolean;
  assemblyLoaded: boolean;
  assemblyError?: string;
  onProcedureQueryChange: (value: string) => void;
  onSelectProcedure: (procedureId: string) => void;
  onResolveAssembly: () => void;
  onReviewModeChange: (value: boolean) => void;
}

export function ProcedureSelectionPanel({
  encounter,
  selectedProcedureId,
  selectedProcedureTitle,
  selectedProcedure,
  procedureQuery,
  procedures,
  proceduresLoading,
  procedureSearchMessage,
  reviewMode,
  assemblyLoading,
  assemblyLoaded,
  assemblyError,
  onProcedureQueryChange,
  onSelectProcedure,
  onResolveAssembly,
  onReviewModeChange,
}: ProcedureSelectionPanelProps) {
  const { lang } = useI18n();

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<Stethoscope className="size-5" />}
        title={lang === "ar" ? "اختيار الإجراء والحزمة" : "Procedure selection & package load"}
        description={lang === "ar" ? "اختر الإجراء الحقيقي ثم حمّل الحزمة المعرفية والموافقة المعتمدة." : "Choose the real procedure, then load the knowledge package and approved consent."}
        action={selectedProcedureId ? <WorkspaceBadge tone="green">{lang === "ar" ? "محدد" : "Selected"}</WorkspaceBadge> : null}
      />

      <div className="space-y-4 px-5 py-5">
        {!encounter ? (
          <EmptyState
            compact
            title={lang === "ar" ? "لا يوجد encounter مرتبط بعد" : "No encounter bound yet"}
            message={lang === "ar" ? "اربط الزيارة أولاً حتى يتم تقييد اختيار الإجراء ضمن السياق الصحيح." : "Bind the encounter first so procedure resolution stays constrained to the correct clinical context."}
          />
        ) : proceduresLoading ? (
          <LoadingState
            compact
            title={lang === "ar" ? "جاري تحميل الإجراءات" : "Loading procedures"}
            message={lang === "ar" ? "يتم استرداد كتالوج الإجراءات الحالي للطبيب." : "Fetching the current physician procedure catalog."}
          />
        ) : (
          <>
            <select
              aria-label={lang === "ar" ? "اختر إجراءً سريرياً" : "Select clinical procedure"}
              value={selectedProcedureId || ""}
              onChange={(event) => onSelectProcedure(event.target.value)}
              disabled={!encounter || assemblyLoading}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{lang === "ar" ? "اختر الإجراء" : "Select a procedure"}</option>
              {procedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>
                  {procedure.titleEn}
                  {procedure.titleAr ? ` / ${procedure.titleAr}` : ""}
                  {procedure.specialty ? ` — ${procedure.specialty}` : ""}
                </option>
              ))}
            </select>

            <Input
              type="text"
              value={procedureQuery}
              onChange={(event) => onProcedureQueryChange(event.target.value)}
              placeholder={lang === "ar" ? "ابحث بالاسم أو التخصص أو العنوان العربي" : "Search by procedure, specialty, or Arabic title"}
              startIcon={<Search className="size-4" />}
              disabled={!encounter || assemblyLoading}
            />

            {procedureSearchMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {procedureSearchMessage}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <WorkspaceField label={lang === "ar" ? "الإجراء المحدد" : "Selected procedure"} value={selectedProcedureTitle || "—"} />
              <WorkspaceField label={lang === "ar" ? "رمز الإجراء" : "Procedure code"} value={selectedProcedure?.procedureCode || "—"} mono />
              <WorkspaceField label={lang === "ar" ? "الفئة" : "Category"} value={selectedProcedure?.categoryCode || selectedProcedure?.consentType || "—"} />
              <WorkspaceField label={lang === "ar" ? "التخصص" : "Specialty"} value={selectedProcedure?.specialty || "—"} />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <Checkbox checked={reviewMode} onChange={(event) => onReviewModeChange(event.target.checked)} />
              <span>
                {lang === "ar" ? "وضع المراجعة الداخلية" : "Internal review mode"}
                <span className="mt-1 block text-xs text-slate-500">
                  {lang === "ar"
                    ? "يعرض التفاصيل المخصصة للمراجعين السريريين مع إبقاء رحلة المريض والحوكمة كما هي."
                    : "Shows clinician-review details while leaving patient flow and governance unchanged."}
                </span>
              </span>
            </label>

            {assemblyError ? (
              <ErrorState compact title={lang === "ar" ? "تعذر تحميل الحزمة" : "Package load failed"} message={assemblyError} />
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="brand"
                size="sm"
                uppercase={false}
                onClick={onResolveAssembly}
                disabled={!encounter || !selectedProcedureId || assemblyLoading}
                className="h-11 rounded-2xl px-4"
              >
                {assemblyLoading
                  ? lang === "ar"
                    ? "جاري التحميل…"
                    : "Loading…"
                  : lang === "ar"
                    ? "تحميل الحزمة"
                    : "Load package"}
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Lock className="size-3.5" />
                {lang === "ar" ? "المسارات وـsend gating الحالية محفوظة" : "Existing routes and send gating preserved"}
              </p>
            </div>

            {assemblyLoaded ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {lang === "ar" ? "تم تحميل الحزمة بنجاح. راجع نموذج الـ PDF المعتمد في اللوحة المركزية." : "Package resolved successfully. Review the approved PDF in the central viewer."}
              </div>
            ) : null}
          </>
        )}
      </div>
    </WorkspaceCard>
  );
}