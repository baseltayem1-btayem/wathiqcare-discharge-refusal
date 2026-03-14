"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { 
  Activity, 
  ArrowRight, 
  ClipboardList, 
  FileText, 
  Gavel, 
  PlusCircle, 
  Rocket,
  ShieldCheck, 
  Timer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSignature,
  Database,
  Clock
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import KPICard from "@/components/ui/KPICard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  _count?: {
    auditLogs?: number;
    documents?: number;
  };
  createdAt?: string | null;
};

type SystemModule = {
  name: string;
  description: string;
  enabled: boolean;
};

type SystemInspectData = {
  status: "healthy" | "degraded";
  api: { title: string; version: string; inspected_at: string };
  database: { reachable: boolean; error: string | null };
  modules: SystemModule[];
  integrations: Record<string, { enabled: boolean; description: string }>;
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [launch, setLaunch] = useState<SystemInspectData | null>(null);
  const [launchLoading, setLaunchLoading] = useState(true);
  const [launchError, setLaunchError] = useState(false);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=200")
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));

    apiFetch<SystemInspectData>("/api/system/inspect")
      .then((data) => { setLaunch(data); setLaunchError(false); })
      .catch(() => setLaunchError(true))
      .finally(() => setLaunchLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const total = cases.length;
    const open = cases.filter((item) => (item.status || "").toUpperCase() === "OPEN").length;
    const inProgress = cases.filter((item) => (item.status || "").toUpperCase() === "IN_PROGRESS").length;
    const escalated = cases.filter((item) => 
      (item.status || "").toLowerCase() === "escalated" || item.metadata?.escalated_at
    ).length;
    const closed = cases.filter((item) => (item.status || "").toUpperCase() === "CLOSED").length;
    const audits = cases.reduce((sum, item) => sum + (item._count?.auditLogs || 0), 0);
    const documents = cases.reduce((sum, item) => sum + (item._count?.documents || 0), 0);
    
    // Calculate trends (mock for now - would compare with previous period)
    const totalTrend = total > 0 ? "+12% from last month" : "";
    const openTrend = open > 0 ? "+5% from last week" : "";

    return { total, open, inProgress, escalated, closed, audits, documents, totalTrend, openTrend };
  }, [cases]);

  // Recent cases for dashboard preview
  const recentCases = useMemo(() => {
    return cases
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title={t("dashboard.pageTitle")}
        subtitle={t("dashboard.pageSubtitle")}
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
        {/* Primary KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            label={t("dashboard.kpi.totalCases")}
            value={loading ? "-" : metrics.total}
            subtitle={t("dashboard.kpi.totalCasesSubtitle")}
            icon={<FileText className="h-5 w-5" />}
            trend={metrics.total > 0 ? "up" : "neutral"}
            trendValue={metrics.totalTrend}
            variant="default"
          />
          <KPICard
            label={t("dashboard.kpi.activeCases")}
            value={loading ? "-" : metrics.inProgress}
            subtitle={t("dashboard.kpi.activeCasesSubtitle")}
            icon={<Activity className="h-5 w-5" />}
            trend={metrics.inProgress > 0 ? "up" : "neutral"}
            trendValue={metrics.openTrend}
            variant="primary"
          />
          <KPICard
            label={t("dashboard.kpi.escalatedCases")}
            value={loading ? "-" : metrics.escalated}
            subtitle={t("dashboard.kpi.escalatedCasesSubtitle")}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="danger"
          />
          <KPICard
            label={t("dashboard.kpi.closedCases")}
            value={loading ? "-" : metrics.closed}
            subtitle={t("dashboard.kpi.closedCasesSubtitle")}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Secondary KPI Cards */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <KPICard
            label={t("dashboard.kpi.auditEntries")}
            value={loading ? "-" : metrics.audits}
            subtitle={t("dashboard.kpi.auditEntriesSubtitle")}
            icon={<ClipboardList className="h-5 w-5" />}
            variant="default"
            size="sm"
          />
          <KPICard
            label={t("dashboard.kpi.documentsGenerated")}
            value={loading ? "-" : metrics.documents}
            subtitle={t("dashboard.kpi.documentsSubtitle")}
            icon={<FileSignature className="h-5 w-5" />}
            variant="purple"
            size="sm"
          />
          <KPICard
            label={t("dashboard.kpi.openCases")}
            value={loading ? "-" : metrics.open}
            subtitle={t("dashboard.kpi.openCasesSubtitle")}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
            size="sm"
          />
        </div>

        {/* Recent Cases Overview */}
        {recentCases.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{t("dashboard.recentCases")}</h2>
              <Link
                href="/cases"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                  {t("dashboard.viewAll")} →
              </Link>
            </div>
            <div className="space-y-2">
              {recentCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                       <p className="text-sm font-medium text-slate-900">{t("dashboard.caseId", { id: caseItem.id.slice(0, 8) })}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : t("workflow.unknownDate")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      (caseItem.status || "").toUpperCase() === "CLOSED" ? "bg-emerald-50 text-emerald-700" :
                      (caseItem.status || "").toLowerCase() === "escalated" ? "bg-rose-50 text-rose-700" :
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {(caseItem.status || "draft").toUpperCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Module Navigation Cards */}
        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Link href="/workflow" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Activity className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold">{t("dashboard.module.workflow.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.workflow.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/refusal-forms" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <FileSignature className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold">{t("dashboard.module.refusalForms.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.refusalForms.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/legal-escalation" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h2 className="font-semibold">{t("dashboard.module.legalEscalation.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.legalEscalation.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rose-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/escalation-timeline" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Timer className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold">{t("nav.escalationTimeline")}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Monitor cases approaching escalation deadlines.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
              {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/legal-case-file" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Gavel className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold">{t("nav.legalCaseFile")}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Access legal documentation and evidence bundles.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
              {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/audit-log" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold">{t("dashboard.module.auditLog.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.auditLog.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/compliance" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">{t("nav.compliance")}</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Monitor compliance standards and governance metrics.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700">
              {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/icd11-validator" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-cyan-600" />
                <h2 className="font-semibold">{t("dashboard.module.icd11.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.icd11.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/emr-integration" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Database className="h-5 w-5 text-teal-600" />
                <h2 className="font-semibold">{t("dashboard.module.emr.title")}</h2>
            </div>
              <p className="mt-2 text-sm text-slate-600">{t("dashboard.module.emr.description")}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                {t("dashboard.module.workflow.action")} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>

        {/* System Health — live data from /api/system/inspect */}
        {launchLoading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading system health…
          </div>
        ) : launchError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            System health check unavailable. <Link href="/launch-status" className="underline">View Launch Status</Link>
          </div>
        ) : launch ? (
          <div
            className={`mt-6 rounded-2xl border p-4 ${
              launch.status === "healthy"
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    launch.status === "healthy" ? "bg-emerald-600" : "bg-amber-500"
                  }`}
                >
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3
                    className={`text-sm font-semibold ${
                      launch.status === "healthy" ? "text-emerald-900" : "text-amber-900"
                    }`}
                  >
                    {launch.api.title} v{launch.api.version} —{" "}
                    {launch.status === "healthy" ? "Healthy" : "Degraded"}
                  </h3>
                  <p
                    className={`mt-0.5 text-xs ${
                      launch.status === "healthy" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    DB {launch.database.reachable ? "reachable" : "unreachable"} •{" "}
                    {launch.modules.filter((m) => m.enabled).length}/{launch.modules.length} modules active •{" "}
                    Inspected at {new Date(launch.api.inspected_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Link
                href="/launch-status"
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  launch.status === "healthy"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                }`}
              >
                <Rocket className="h-3.5 w-3.5" />
                {t("nav.launchStatus")}
              </Link>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {launch.modules.map((mod) => (
                <div
                  key={mod.name}
                  className="flex items-center justify-between rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-xs"
                >
                  <span className="text-slate-700">{mod.description}</span>
                  <span
                    className={
                      mod.enabled ? "font-medium text-emerald-700" : "font-medium text-slate-400"
                    }
                  >
                    {mod.enabled ? "Active" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
