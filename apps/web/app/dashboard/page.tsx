"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Building2,
  CheckCircle2,
  Clock3,
  Layers3,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type DepartmentPoint = {
  department: string;
  label: string;
  count: number;
  breachCount: number;
  status: "on_track" | "at_risk" | "breached";
};

type ThroughputPoint = {
  day: string;
  opened: number;
  closed: number;
};

type DashboardPayload = {
  generatedAt: string;
  summary: {
    totalActiveCases: number;
    delayedCases: number;
    atRiskCases: number;
    withinSlaCases: number;
    escalatedCases: number;
    unassignedCases: number;
    completionRate: number;
    averageDischargeHours: number;
  };
  pendingByDepartment: DepartmentPoint[];
  averageCycleTimeByDepartment: Array<{ department: string; label: string; averageHours: number }>;
  throughputTrend: ThroughputPoint[];
  bottlenecks: Array<{ stage: string; count: number }>;
  timelineAging: Array<{ bucket: string; count: number }>;
};

function StatCard(props: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "default" | "good" | "warn" | "danger";
  hint?: string;
}) {
  const toneClass =
    props.tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : props.tone === "warn"
        ? "border-amber-200 bg-amber-50"
        : props.tone === "danger"
          ? "border-rose-200 bg-rose-50"
          : "border-slate-200 bg-white";

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{props.label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{props.value}</p>
          {props.hint ? <p className="mt-1 text-xs text-slate-500">{props.hint}</p> : null}
        </div>
        <div className="rounded-xl border border-white/70 bg-white/70 p-2 text-slate-700">{props.icon}</div>
      </div>
    </article>
  );
}

function widthClass(percent: number): string {
  if (percent >= 100) return "w-full";
  if (percent >= 92) return "w-11/12";
  if (percent >= 84) return "w-10/12";
  if (percent >= 75) return "w-9/12";
  if (percent >= 67) return "w-8/12";
  if (percent >= 59) return "w-7/12";
  if (percent >= 50) return "w-6/12";
  if (percent >= 42) return "w-5/12";
  if (percent >= 34) return "w-4/12";
  if (percent >= 25) return "w-3/12";
  if (percent >= 17) return "w-2/12";
  if (percent >= 9) return "w-1/12";
  return "w-[4%]";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    apiFetch<DashboardPayload>("/api/operations/dashboard", { signal })
      .then((payload) => setData(payload))
      .catch(() => setData(null))
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const maxDept = useMemo(() => {
    if (!data?.pendingByDepartment?.length) return 1;
    return Math.max(...data.pendingByDepartment.map((item) => item.count), 1);
  }, [data]);

  const maxThroughput = useMemo(() => {
    if (!data?.throughputTrend?.length) return 1;
    return Math.max(...data.throughputTrend.map((item) => Math.max(item.opened, item.closed)), 1);
  }, [data]);

  return (
    <AuthGuard>
      <AppShell
        title="Hospital Operations Command Center"
        subtitle="Real-time orchestration, SLA monitoring, escalation controls, and executive visibility"
      >
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading operations dashboard...
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Unable to load dashboard metrics.
          </div>
        ) : (
          <div className="space-y-5">
            <section className="sticky top-[88px] z-[5] rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Active Cases" value={data.summary.totalActiveCases} icon={<Layers3 className="h-4 w-4" />} />
                <StatCard
                  label="Within SLA"
                  value={data.summary.withinSlaCases}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="good"
                />
                <StatCard
                  label="At Risk + Delayed"
                  value={data.summary.atRiskCases + data.summary.delayedCases}
                  icon={<AlertTriangle className="h-4 w-4" />}
                  tone="warn"
                />
                <StatCard
                  label="Escalated"
                  value={data.summary.escalatedCases}
                  icon={<BellRing className="h-4 w-4" />}
                  tone="danger"
                />
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Department Queue Status</h2>
                    <p className="text-xs text-slate-500">Transactions currently with each hospital department</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 cursor-not-allowed" title="Monitoring only">
                    Monitoring only
                  </span>
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" />
                      Dashboard is monitoring-only
                    </div>
                    <p className="mt-1 text-amber-800">
                      No actions or workflow entry are available here. All execution and case management must be performed in <b>Cases</b>.
                    </p>
                  </section>
                </div>
                <div className="space-y-2">
                  {data.pendingByDepartment.map((item) => {
                    const width = Math.max(4, Math.round((item.count / maxDept) * 100));
                    const widthTone = widthClass(width);
                    const stateTone =
                      item.status === "breached"
                        ? "bg-rose-500"
                        : item.status === "at_risk"
                          ? "bg-amber-500"
                          : "bg-emerald-500";
                    return (
                      <div key={item.department} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-800">{item.label}</span>
                          <span className="text-slate-600">
                            {item.count} active, {item.breachCount} breached
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200">
                          <div className={`h-2 rounded-full ${stateTone} ${widthTone}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Executive Summary</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">Completion rate</span>
                    <span className="font-semibold text-slate-900">{data.summary.completionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">Avg discharge time</span>
                    <span className="font-semibold text-slate-900">{data.summary.averageDischargeHours}h</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">Unassigned</span>
                    <span className="font-semibold text-slate-900">{data.summary.unassignedCases}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">Breached SLA</span>
                    <span className="font-semibold text-rose-700">{data.summary.delayedCases}</span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">Updated {new Date(data.generatedAt).toLocaleString()}</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Daily Throughput (7 days)</h2>
                <div className="mt-3 space-y-2">
                  {data.throughputTrend.map((point) => {
                    const openedWidth = Math.max(2, Math.round((point.opened / maxThroughput) * 100));
                    const closedWidth = Math.max(2, Math.round((point.closed / maxThroughput) * 100));
                    const openedWidthTone = widthClass(openedWidth);
                    const closedWidthTone = widthClass(closedWidth);
                    return (
                      <div key={point.day} className="rounded-xl border border-slate-100 p-2">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">{point.day}</span>
                          <span className="text-slate-500">Open {point.opened} / Closed {point.closed}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 rounded-full bg-slate-200">
                            <div className={`h-1.5 rounded-full bg-cyan-600 ${openedWidthTone}`} />
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200">
                            <div className={`h-1.5 rounded-full bg-emerald-600 ${closedWidthTone}`} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-slate-900">Bottlenecks & Aging</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Most delayed stages</p>
                    <div className="space-y-1.5 text-sm">
                      {data.bottlenecks.length ? (
                        data.bottlenecks.map((item) => (
                          <div key={item.stage} className="flex items-center justify-between">
                            <span className="text-slate-600">{item.stage}</span>
                            <span className="font-semibold text-rose-700">{item.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No bottlenecks detected.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Queue aging</p>
                    <div className="space-y-1.5 text-sm">
                      {data.timelineAging.map((item) => (
                        <div key={item.bucket} className="flex items-center justify-between">
                          <span className="text-slate-600">{item.bucket}</span>
                          <span className="font-semibold text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Cycle Time" value={data.averageCycleTimeByDepartment[0]?.averageHours ?? 0 + "h"} icon={<Clock3 className="h-4 w-4" />} />
              <StatCard label="Operations" value={data.summary.totalActiveCases} icon={<Activity className="h-4 w-4" />} />
              <StatCard label="SLA Watch" value={data.summary.atRiskCases} icon={<Timer className="h-4 w-4" />} tone="warn" />
              <StatCard label="Escalations" value={data.summary.escalatedCases} icon={<AlertTriangle className="h-4 w-4" />} tone="danger" />
              <StatCard label="Department Load" value={data.pendingByDepartment.filter((item) => item.count > 0).length} icon={<Building2 className="h-4 w-4" />} />
              <StatCard label="Operators" value={data.summary.totalActiveCases - data.summary.unassignedCases} icon={<Users className="h-4 w-4" />} />
            </section>

            <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              <div className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Leadership Insight
              </div>
              <p className="mt-1 text-cyan-800">
                The command center is live with real-time department queues, SLA status, bottleneck tracking, and escalation signals.
                Use Department Inboxes for operational intervention and case-level orchestration actions.
              </p>
            </section>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
