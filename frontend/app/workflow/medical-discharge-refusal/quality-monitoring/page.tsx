"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { fetchRefusalQualityMetrics, type RefusalQualityMetrics } from "@/lib/services/medicalDischargeRefusal.service";

const EMPTY: RefusalQualityMetrics = {
  total_refusal_cases: 0,
  active_refusal_cases: 0,
  cases_escalated_after_24_hours: 0,
  average_resolution_time_hours: 0,
  refusal_reasons_distribution: {},
  cases_by_department: {},
  monthly_review_reports: {},
  quarterly_reports: {},
};

export default function QualityMonitoringDashboardPage() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<RefusalQualityMetrics>(EMPTY);

  useEffect(() => {
    void fetchRefusalQualityMetrics().then(setMetrics).catch(() => setMetrics(EMPTY));
  }, []);

  return (
    <AuthGuard>
      <AppShell
        title={t("mdrw.quality.title")}
        subtitle={t("mdrw.quality.subtitle")}
        actions={
          <Link href="/workflow/medical-discharge-refusal" className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">
            {t("mdrw.case.backDashboard")}
          </Link>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.totalCases")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.total_refusal_cases}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.activeCases")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.active_refusal_cases}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.escalated24h")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.cases_escalated_after_24_hours}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">{t("mdrw.metrics.avgResolution")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{metrics.average_resolution_time_hours}</p>
          </article>
        </div>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.quality.reasons")}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {Object.entries(metrics.refusal_reasons_distribution).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between"><span>{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.quality.departments")}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {Object.entries(metrics.cases_by_department).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between"><span>{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.quality.monthly")}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {Object.entries(metrics.monthly_review_reports).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between"><span>{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("mdrw.quality.quarterly")}</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {Object.entries(metrics.quarterly_reports).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between"><span>{k}</span><span>{v}</span></li>
              ))}
            </ul>
          </article>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
