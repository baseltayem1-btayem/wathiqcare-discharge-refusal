"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Rocket, XCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type LaunchCheck = {
  key: string;
  label: string;
  ok: boolean;
};

type LaunchMetrics = {
  openCases: number;
  inProgressCases: number;
  closedCases: number;
  pendingDocuments: number;
  signedDocuments: number;
  archivedDocuments: number;
  recentErrors: number;
};

type LaunchResponse = {
  goNoGo: boolean;
  checks: LaunchCheck[];
  metrics: LaunchMetrics;
  integrations: {
    his: boolean;
    fhir: boolean;
    docuWare: boolean;
    sharePoint: boolean;
    erp: boolean;
  };
  recentAudits: Array<{
    id: string;
    action: string;
    details?: string | null;
    createdAt: string;
  }>;
  generatedAt: string;
};

export default function LaunchStatusPage() {
  const [data, setData] = useState<LaunchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiFetch<LaunchResponse>("/api/launch/status");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load launch status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const gateSummary = useMemo(() => {
    if (!data) {
      return { passed: 0, failed: 0 };
    }

    const passed = data.checks.filter((item) => item.ok).length;
    return {
      passed,
      failed: data.checks.length - passed,
    };
  }, [data]);

  const integrationRows: Array<[string, boolean]> = data
    ? [
        ["HIS", data.integrations.his],
        ["FHIR", data.integrations.fhir],
        ["DocuWare", data.integrations.docuWare],
        ["SharePoint", data.integrations.sharePoint],
        ["ERP", data.integrations.erp],
      ]
    : [];

  return (
    <AuthGuard>
      <AppShell
        title="Internal Soft Launch Status"
        subtitle="Live Go/No-Go gates, launch telemetry, and operational audit pulse"
        actions={
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Launch Status
          </button>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Loading launch telemetry...</div>
        ) : null}

        {!loading && data ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Launch Gate Decision</h2>
                  <p className="mt-1 text-sm text-slate-600">Generated at {new Date(data.generatedAt).toLocaleString()}</p>
                </div>
                <div
                  className={
                    data.goNoGo
                      ? "inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800"
                      : "inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800"
                  }
                >
                  <Rocket className="h-4 w-4" />
                  {data.goNoGo ? "GO" : "NO-GO"}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-700">
                Passed gates: <span className="font-semibold">{gateSummary.passed}</span> | Failed gates: <span className="font-semibold">{gateSummary.failed}</span>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Open Cases", value: data.metrics.openCases },
                { label: "Pending Documents", value: data.metrics.pendingDocuments },
                { label: "Signed Documents", value: data.metrics.signedDocuments },
                { label: "Archived Documents", value: data.metrics.archivedDocuments },
              ].map((item) => (
                <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Go/No-Go Checks</h2>
                <div className="mt-3 space-y-2">
                  {data.checks.map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-800">{item.label}</span>
                      <span className={item.ok ? "inline-flex items-center gap-1 text-emerald-700" : "inline-flex items-center gap-1 text-rose-700"}>
                        {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {item.ok ? "Pass" : "Fail"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Hospital Integration Health</h2>
                <div className="mt-3 space-y-2 text-sm">
                  {integrationRows.map(([label, enabled]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-slate-800">{label}</span>
                      <span className={enabled ? "text-emerald-700" : "text-amber-700"}>{enabled ? "Connected" : "Pending"}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  Recent critical errors (24h): <span className="font-semibold">{data.metrics.recentErrors}</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Audit Pulse (24h)</h2>
              {data.recentAudits.length === 0 ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    No audit activity captured in the last 24h.
                  </div>
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Action</th>
                        <th className="px-3 py-2 text-left">Details</th>
                        <th className="px-3 py-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAudits.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.action}</td>
                          <td className="px-3 py-2 text-slate-600">{item.details || "-"}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(item.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
