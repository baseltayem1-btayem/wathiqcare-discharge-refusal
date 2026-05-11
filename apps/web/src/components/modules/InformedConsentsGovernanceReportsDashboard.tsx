"use client";

import { useCallback, useEffect, useState } from "react";
import ModuleShell from "@/components/ModuleShell";
import { apiFetch } from "@/utils/api";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type ReportResponse = {
  cards: {
    activeTemplates: number;
    pendingApprovals: number;
    finalizedConsentsToday: number;
    pendingSignatures: number;
    highRiskProcedures: number;
    complianceAlerts: number;
    failedSyncs: number;
    expiredLinks: number;
  };
  totals: {
    consentsCreated: number;
    consentsFinalized: number;
    pendingSignatures: number;
    expiredSignatures: number;
    rejectedConsents: number;
    aiAssistedConsents: number;
  };
  rows: Array<Record<string, string | number>>;
};

export default function InformedConsentsGovernanceReportsDashboard({ auth }: { auth: ModuleAuth }) {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<ReportResponse>("/api/modules/informed-consents/reports/governance");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "تقارير حوكمة الموافقات", en: "Consent Governance Reporting" }}
      subtitle={{ ar: "لوحة تنفيذية وتقارير تشغيلية قانونية وطبية للموافقات المستنيرة.", en: "Executive and operational legal/medical reporting for informed consents." }}
    >
      <div className="space-y-4">
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          <a className="rounded border border-slate-300 px-3 py-2 text-sm" href="/api/modules/informed-consents/reports/governance?format=csv" target="_blank" rel="noreferrer">Export CSV</a>
          <a className="rounded border border-slate-300 px-3 py-2 text-sm" href="/api/modules/informed-consents/reports/governance?format=excel" target="_blank" rel="noreferrer">Export Excel</a>
          <a className="rounded border border-slate-300 px-3 py-2 text-sm" href="/api/modules/informed-consents/reports/governance?format=pdf" target="_blank" rel="noreferrer">Export PDF</a>
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Active Templates</div><div className="text-2xl font-semibold">{data?.cards.activeTemplates ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Approvals</div><div className="text-2xl font-semibold">{data?.cards.pendingApprovals ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Finalized Today</div><div className="text-2xl font-semibold">{data?.cards.finalizedConsentsToday ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Signatures</div><div className="text-2xl font-semibold">{data?.cards.pendingSignatures ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">High-Risk Procedures</div><div className="text-2xl font-semibold">{data?.cards.highRiskProcedures ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Compliance Alerts</div><div className="text-2xl font-semibold">{data?.cards.complianceAlerts ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Failed Syncs</div><div className="text-2xl font-semibold">{data?.cards.failedSyncs ?? 0}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Expired Links</div><div className="text-2xl font-semibold">{data?.cards.expiredLinks ?? 0}</div></div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold">Operational Rows</div>
          {!loading ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Specialty</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Physician</th>
                    <th className="px-3 py-2 text-left">Template</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Finalized</th>
                    <th className="px-3 py-2 text-left">Signatures</th>
                    <th className="px-3 py-2 text-left">AI</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.rows || []).map((row, idx) => (
                    <tr key={`${row.consentReference || idx}`} className="border-t border-slate-200">
                      <td className="px-3 py-2">{String(row.consentReference || "-")}</td>
                      <td className="px-3 py-2">{String(row.status || "-")}</td>
                      <td className="px-3 py-2">{String(row.specialty || "-")}</td>
                      <td className="px-3 py-2">{String(row.department || "-")}</td>
                      <td className="px-3 py-2">{String(row.physician || "-")}</td>
                      <td className="px-3 py-2">{String(row.template || "-")}</td>
                      <td className="px-3 py-2">{String(row.consentType || "-")}</td>
                      <td className="px-3 py-2">{String(row.createdAt || "-")}</td>
                      <td className="px-3 py-2">{String(row.finalizedAt || "-")}</td>
                      <td className="px-3 py-2">{String(row.signatureCount || "0")}</td>
                      <td className="px-3 py-2">{String(row.aiAssisted || "NO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Loading reports...</div>
          )}
        </section>
      </div>
    </ModuleShell>
  );
}
