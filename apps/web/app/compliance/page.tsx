"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  status?: string | null;
  signer?: string | null;
};

type ComplianceDashboardData = {
  totals: {
    cases: number;
    cbahiCompliant: number;
    jciCompliant: number;
    pdplLogIndicators: number;
    missingConsents: number;
  };
  rates: {
    cbahi: number;
    jci: number;
  };
  tables: {
    cbahi: CaseItem[];
    jci: CaseItem[];
    missingConsents: CaseItem[];
  };
};

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<ComplianceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCompliance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<ComplianceDashboardData>("/api/discharge/reports/compliance-dashboard");
      setDashboard(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load legal compliance reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompliance();
  }, [loadCompliance]);

  const compliance = useMemo(() => dashboard, [dashboard]);

  const cbahiRate = compliance?.rates.cbahi ?? 0;
  const jciRate = compliance?.rates.jci ?? 0;

  return (
    <AuthGuard>
      <AppShell
        title="واجهة الامتثال القانوني"
        subtitle="تقارير امتثال تشغيلية لرفع جودة التوثيق القانوني الطبي على مستوى المنشأة"
        actions={
          <button
            type="button"
            onClick={() => void loadCompliance()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            تحديث التقارير
          </button>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">جار تحميل بيانات الامتثال...</div>
        ) : (
          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">CBAHI compliance</span>
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{cbahiRate}%</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">JCI consent compliance</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{jciRate}%</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">PDPL logs</span>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{compliance?.totals.pdplLogIndicators ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Missing consents</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-3xl font-semibold text-rose-700">{compliance?.totals.missingConsents ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">CBAHI compliance report</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Case</th>
                        <th className="px-3 py-2 text-left">Patient</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(compliance?.tables.cbahi ?? []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.caseNumber || item.id}</td>
                          <td className="px-3 py-2">{item.patientName || "-"}</td>
                          <td className="px-3 py-2 text-emerald-700">Compliant</td>
                        </tr>
                      ))}
                      {(compliance?.tables.cbahi ?? []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-slate-500" colSpan={3}>No compliant records yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">JCI consent compliance report</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Case</th>
                        <th className="px-3 py-2 text-left">Signer</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(compliance?.tables.jci ?? []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.caseNumber || item.id}</td>
                          <td className="px-3 py-2">{item.signer || "-"}</td>
                          <td className="px-3 py-2 text-emerald-700">Compliant</td>
                        </tr>
                      ))}
                      {(compliance?.tables.jci ?? []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-slate-500" colSpan={3}>No consent-compliant records yet.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">PDPL logs</h2>
                <p className="mt-2 text-sm text-slate-600">
                  تم احتساب المؤشر من سجلات `pdpl_logs` و`pdpl_events` في بيانات الحالة مع وجود أثر تدقيق لكل حالة.
                </p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Total PDPL-related log indicators: <span className="font-semibold">{compliance?.totals.pdplLogIndicators ?? 0}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Missing consents</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Case</th>
                        <th className="px-3 py-2 text-left">Patient</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(compliance?.tables.missingConsents ?? []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.caseNumber || item.id}</td>
                          <td className="px-3 py-2">{item.patientName || "-"}</td>
                          <td className="px-3 py-2 text-rose-700">Missing Consent Signature</td>
                        </tr>
                      ))}
                      {(compliance?.tables.missingConsents ?? []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-slate-500" colSpan={3}>No missing consents.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
