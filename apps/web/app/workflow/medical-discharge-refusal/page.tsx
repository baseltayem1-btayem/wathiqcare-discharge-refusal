"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import {
  fetchMedicalFormsLibrary,
  fetchRefusalCases,
  fetchRefusalQualityMetrics,
  type RefusalQualityMetrics,
} from "@/lib/services/medicalDischargeRefusal.service";

type RefusalCaseItem = {
  id: string;
  patient_name?: string;
  status?: string;
  refusal_reason?: string;
};

const EMPTY_METRICS: RefusalQualityMetrics = {
  total_refusal_cases: 0,
  active_refusal_cases: 0,
  cases_escalated_after_24_hours: 0,
  average_resolution_time_hours: 0,
  refusal_reasons_distribution: {},
  cases_by_department: {},
  monthly_review_reports: {},
  quarterly_reports: {},
};

export default function MedicalDischargeRefusalDashboardPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<RefusalCaseItem[]>([]);
  const [metrics, setMetrics] = useState<RefusalQualityMetrics>(EMPTY_METRICS);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [caseData, qualityData, libraryData] = await Promise.all([
        fetchRefusalCases(120),
        fetchRefusalQualityMetrics(),
        fetchMedicalFormsLibrary(),
      ]);
      setCases(caseData as RefusalCaseItem[]);
      setMetrics(qualityData);
      setTemplatesCount(libraryData.templates.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("mdrw.error.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const activeCases = useMemo(
    () => cases.filter((item) => (item.status || "").toLowerCase().includes("active")).length,
    [cases],
  );

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.dashboard.title")}
        subtitle={t("mdrw.dashboard.subtitle")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/workflow/medical-discharge-refusal/create-case"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Start New Legal Case
            </Link>
            <button
              type="button"
              onClick={() => void loadAll()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </button>
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.totalCases")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : metrics.total_refusal_cases}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.activeCases")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : activeCases}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.escalated24h")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {loading ? "-" : metrics.cases_escalated_after_24_hours}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.formsLibrary")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? "-" : templatesCount}</p>
          </article>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.dashboard.caseList")}</h2>
            <Link
              href="/workflow/medical-discharge-refusal/quality-monitoring"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {t("mdrw.dashboard.qualityLink")}
            </Link>
          </div>

          {cases.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {loading ? t("mdrw.dashboard.loading") : t("mdrw.dashboard.empty")}
            </div>
          ) : (
            <ul className="space-y-2">
              {cases.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.patient_name || t("common.na")}</p>
                      <p className="text-xs text-slate-600">{item.refusal_reason || t("common.na")}</p>
                    </div>
                    <Link
                      href={`/workflow/medical-discharge-refusal/case/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                    >
                      {t("workflow.viewDetails")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {t("mdrw.dashboard.escalationHint")}
          </p>
          <p className="mt-2 text-xs">
            Seven-screen legal path: dashboard, create case, clinical decision, mandatory risk disclosure, patient interaction,
            refusal confirmation, final review.
          </p>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
