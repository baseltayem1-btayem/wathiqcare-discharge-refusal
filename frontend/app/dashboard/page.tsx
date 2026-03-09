"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, ClipboardList, FileText, Gavel, PlusCircle, ShieldCheck, Timer } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  status?: string | null;
  _count?: {
    auditLogs?: number;
    documents?: number;
  };
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=200")
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const total = cases.length;
    const open = cases.filter((item) => (item.status || "").toUpperCase() === "OPEN").length;
    const inProgress = cases.filter((item) => (item.status || "").toUpperCase() === "IN_PROGRESS").length;
    const audits = cases.reduce((sum, item) => sum + (item._count?.auditLogs || 0), 0);

    return { total, open, inProgress, audits };
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title={t("home.title")}
        subtitle="Operational landing page for discharge refusal, escalation, legal review, and audit readiness."
        actions={
          <>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <PlusCircle className="h-4 w-4" />
              {t("cases.newCase")}
            </Link>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <FileText className="h-4 w-4" />
              {t("nav.cases")}
            </Link>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Cases</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : metrics.total}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Open Cases</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : metrics.open}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">In Progress</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : metrics.inProgress}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Audit Entries</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "-" : metrics.audits}</p>
          </article>
        </div>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Link href="/workflow" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Activity className="h-4 w-4" />
              <h2 className="font-semibold">Refusal Workflow</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Capture refusal actions and generate policy documents.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900">Open <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link href="/escalation-timeline" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Timer className="h-4 w-4" />
              <h2 className="font-semibold">Escalation Timeline</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Track cases approaching legal escalation windows.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900">Open <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link href="/legal-case-file" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Gavel className="h-4 w-4" />
              <h2 className="font-semibold">Legal Case File</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Review legal artifacts and evidence bundle readiness.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900">Open <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link href="/audit-log" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ClipboardList className="h-4 w-4" />
              <h2 className="font-semibold">Audit Log Viewer</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Inspect immutable workflow and medico-legal activity traces.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900">Open <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>

          <Link href="/compliance" className="rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-4 w-4" />
              <h2 className="font-semibold">Compliance</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Review CBAHI, JCI, and PDPL indicators.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900">Open <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        </section>
      </AppShell>
    </AuthGuard>
  );
}
