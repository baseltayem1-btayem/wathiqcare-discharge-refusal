"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { aggregateTrackingEvents, clampAnalyticsRangeDays, hasAnalyticsData, type AnalyticsDayRollup } from "@/lib/analytics";
import { isTrackingEnabled, readTrackingBuffer } from "@/lib/tracking";
import { apiFetch } from "@/utils/api";

type AnalyticsResponse = {
  generatedAt: string;
  rangeDays: 7 | 30;
  source: "stored" | "fallback";
  days: AnalyticsDayRollup[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [selectedDay, setSelectedDay] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics(): Promise<void> {
      setLoading(true);
      try {
        const stored = await apiFetch<AnalyticsResponse>(`/api/analytics/events?days=${rangeDays}`, {
          cache: "no-store",
          authFailureMode: "inline",
        });

        if (cancelled) {
          return;
        }

        if (hasAnalyticsData(stored.days)) {
          setData(stored);
          return;
        }
      } catch {
        // local fallback below
      }

      const fallbackDays = aggregateTrackingEvents(readTrackingBuffer(), rangeDays);
      if (!cancelled) {
        setData({
          generatedAt: new Date().toISOString(),
          rangeDays,
          source: "fallback",
          days: fallbackDays,
        });
      }
    }

    void loadAnalytics().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rangeDays]);

  const days = useMemo(() => data?.days.map((item) => item.day) ?? [], [data]);

  useEffect(() => {
    if (!selectedDay && days.length > 0) {
      setSelectedDay(days[0]);
      return;
    }

    if (selectedDay && !days.includes(selectedDay)) {
      setSelectedDay(days[0] ?? "");
    }
  }, [days, selectedDay]);

  const selectedDaySummary = useMemo(
    () => data?.days.find((item) => item.day === selectedDay) ?? null,
    [data, selectedDay],
  );

  const dailySummary = useMemo(
    () =>
      (data?.days ?? []).map((row) => ({
        day: row.day,
        totalEvents: row.totalEvents,
        pageViews: row.pageViews,
        actions: row.actions,
        errors: row.errors,
        avgCompletionMinutes:
          row.completionCount > 0
            ? Math.round((row.completionTotalMs / row.completionCount / 60000) * 10) / 10
            : null,
      })),
    [data],
  );

  const trackingOn = isTrackingEnabled();

  return (
    <AuthGuard>
      <AppShell
        title="Analytics"
        subtitle="Aggregated daily tracking metrics only (no personal or medical data)"
      >
        <div className="space-y-5">
          {loading ? (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading analytics history...
            </section>
          ) : null}

          {!trackingOn ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Tracking is currently disabled. Enable NEXT_PUBLIC_ENABLE_TRACKING to collect dashboard data.
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Daily Summary View</h2>
                <p className="text-xs text-slate-500">
                  Aggregated counts by day, with completion averages. Source: {data?.source ?? "stored"}.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Window
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    value={rangeDays}
                    onChange={(event) => setRangeDays(clampAnalyticsRangeDays(event.target.value))}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Day
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    value={selectedDay}
                    onChange={(event) => setSelectedDay(event.target.value)}
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Day</th>
                    <th className="px-3 py-2">Total Events</th>
                    <th className="px-3 py-2">Page Views</th>
                    <th className="px-3 py-2">Actions</th>
                    <th className="px-3 py-2">Errors</th>
                    <th className="px-3 py-2">Avg Completion (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {dailySummary.map((row) => (
                    <tr key={row.day} className="border-b border-slate-100 text-slate-700 last:border-b-0">
                      <td className="px-3 py-2 font-medium">{row.day}</td>
                      <td className="px-3 py-2">{row.totalEvents}</td>
                      <td className="px-3 py-2">{row.pageViews}</td>
                      <td className="px-3 py-2">{row.actions}</td>
                      <td className="px-3 py-2">{row.errors}</td>
                      <td className="px-3 py-2">{row.avgCompletionMinutes ?? "-"}</td>
                    </tr>
                  ))}
                  {dailySummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                        No tracking data available yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
              <h3 className="text-sm font-semibold text-slate-900">Top Pages Visited</h3>
              <p className="mt-1 text-xs text-slate-500">Based on page_view events for selected day.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Route</th>
                      <th className="px-2 py-2">Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDaySummary?.topPages ?? []).map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs text-slate-700">{item.key}</td>
                        <td className="px-2 py-2 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                    {(selectedDaySummary?.topPages ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-4 text-center text-sm text-slate-500">
                          No page views for selected day.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
              <h3 className="text-sm font-semibold text-slate-900">Average Time To Complete Case</h3>
              <p className="mt-1 text-xs text-slate-500">From aggregated closure completion events.</p>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">Selected Day Average</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {selectedDaySummary && selectedDaySummary.completionCount > 0
                    ? Math.round((selectedDaySummary.completionTotalMs / selectedDaySummary.completionCount / 60000) * 10) / 10
                    : "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">minutes</p>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
              <h3 className="text-sm font-semibold text-slate-900">Most Used Actions</h3>
              <p className="mt-1 text-xs text-slate-500">From primary_action_clicked event counts.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Action</th>
                      <th className="px-2 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDaySummary?.mostUsedActions ?? []).map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs text-slate-700">{item.key}</td>
                        <td className="px-2 py-2 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                    {(selectedDaySummary?.mostUsedActions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-4 text-center text-sm text-slate-500">
                          No action events for selected day.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)]">
              <h3 className="text-sm font-semibold text-slate-900">Drop-off Steps In Workspace</h3>
              <p className="mt-1 text-xs text-slate-500">Derived from drop_off_step attached to route_change events.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Step</th>
                      <th className="px-2 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDaySummary?.dropOffSteps ?? []).map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs text-slate-700">{item.key}</td>
                        <td className="px-2 py-2 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                    {(selectedDaySummary?.dropOffSteps ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-4 text-center text-sm text-slate-500">
                          No drop-off events for selected day.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-sm)] lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900">Error Frequency</h3>
              <p className="mt-1 text-xs text-slate-500">Grouped API/UI errors by category for selected day.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Error Group</th>
                      <th className="px-2 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDaySummary?.errorFrequency ?? []).map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-2 font-mono text-xs text-slate-700">{item.key}</td>
                        <td className="px-2 py-2 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                    {(selectedDaySummary?.errorFrequency ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-2 py-4 text-center text-sm text-slate-500">
                          No errors for selected day.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
