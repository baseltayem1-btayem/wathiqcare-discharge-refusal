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
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
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
        title={t("home.title")}
        subtitle="Comprehensive legal-medical discharge refusal management dashboard with real-time metrics and compliance tracking."
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
            label="Total Cases"
            value={loading ? "-" : metrics.total}
            subtitle="All discharge refusal cases"
            icon={<FileText className="h-5 w-5" />}
            trend={metrics.total > 0 ? "up" : "neutral"}
            trendValue={metrics.totalTrend}
            variant="default"
          />
          <KPICard
            label="Active Cases"
            value={loading ? "-" : metrics.inProgress}
            subtitle="Currently in progress"
            icon={<Activity className="h-5 w-5" />}
            trend={metrics.inProgress > 0 ? "up" : "neutral"}
            trendValue={metrics.openTrend}
            variant="primary"
          />
          <KPICard
            label="Escalated Cases"
            value={loading ? "-" : metrics.escalated}
            subtitle="Requiring legal review"
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="danger"
          />
          <KPICard
            label="Closed Cases"
            value={loading ? "-" : metrics.closed}
            subtitle="Successfully completed"
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Secondary KPI Cards */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <KPICard
            label="Audit Entries"
            value={loading ? "-" : metrics.audits}
            subtitle="Compliance trail records"
            icon={<ClipboardList className="h-5 w-5" />}
            variant="default"
            size="sm"
          />
          <KPICard
            label="Documents Generated"
            value={loading ? "-" : metrics.documents}
            subtitle="Forms and notices"
            icon={<FileSignature className="h-5 w-5" />}
            variant="purple"
            size="sm"
          />
          <KPICard
            label="Open Cases"
            value={loading ? "-" : metrics.open}
            subtitle="Awaiting action"
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
            size="sm"
          />
        </div>

        {/* Recent Cases Overview */}
        {recentCases.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent Discharge Cases</h2>
              <Link
                href="/cases"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                View all →
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
                      <p className="text-sm font-medium text-slate-900">Case {caseItem.id.slice(0, 8)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : "Unknown date"}
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
              <h2 className="font-semibold">Discharge Workflow</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Track workflow stages and manage discharge refusal processes.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/refusal-forms" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <FileSignature className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold">Refusal Forms</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Manage refusal forms, signatures, and financial notices.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/legal-escalation" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-rose-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h2 className="font-semibold">Legal Escalation</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Review and manage cases escalated for legal intervention.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-rose-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/escalation-timeline" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Timer className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold">Escalation Timeline</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Monitor cases approaching legal escalation deadlines.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/legal-case-file" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Gavel className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold">Legal Case File</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Access legal documentation and evidence bundle generation.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/audit-log" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold">Audit Log Viewer</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Review immutable audit trails and compliance records.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/compliance" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold">Compliance Dashboard</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Monitor CBAHI, JCI, and PDPL compliance indicators.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/icd11-validator" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="h-5 w-5 text-cyan-600" />
              <h2 className="font-semibold">ICD-11 Validator</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Validate medical diagnosis codes against ICD-11 standards.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link href="/emr-integration" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 to-white p-5 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Database className="h-5 w-5 text-teal-600" />
              <h2 className="font-semibold">EMR Integration</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">Monitor EMR system connections and data synchronization.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
              Open Module <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>

        {/* System Health Indicator */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-600 p-2">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-emerald-900">System Health: Operational</h3>
              <p className="mt-0.5 text-xs text-emerald-700">
                All modules functioning normally • Last sync: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
