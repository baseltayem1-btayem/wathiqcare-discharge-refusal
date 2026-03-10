"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, FileText, PlayCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchRefusalCaseWorkflow } from "@/lib/services/medicalDischargeRefusal.service";

export default function MedicalDischargeRefusalCaseWorkflowPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { t } = useI18n();
  const [workflow, setWorkflow] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!caseId) return;
    void fetchRefusalCaseWorkflow(caseId)
      .then((data) => setWorkflow(data))
      .catch((err: Error) => setError(err.message));
  }, [caseId]);

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.case.title")}
        subtitle={t("mdrw.case.subtitle", { caseId })}
        actions={
          <Link
            href="/workflow/medical-discharge-refusal"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <ArrowRight className="h-4 w-4" />
            {t("mdrw.case.backDashboard")}
          </Link>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.case.statusSection")}</h2>
          <p className="mt-2 text-sm text-slate-700">
            {t("mdrw.case.currentStatus")}: {String(workflow?.case_status || workflow?.status || t("common.na"))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("mdrw.case.currentStage")}: {String(workflow?.current_stage || t("common.na"))}
          </p>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.initialCommunication")}</p>
          </Link>
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/social-services`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.socialServices")}</p>
          </Link>
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/signature`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.signature")}</p>
          </Link>
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/witness`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.witness")}</p>
          </Link>
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/financial-notice`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.financialNotice")}</p>
          </Link>
          <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">{t("mdrw.screens.escalation")}</p>
          </Link>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/cases/${caseId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <FileText className="h-4 w-4" />
            {t("mdrw.case.openLegacyCase")}
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => {
              window.location.href = `/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`;
            }}
          >
            <PlayCircle className="h-4 w-4" />
            {t("mdrw.case.continueWorkflow")}
          </button>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
