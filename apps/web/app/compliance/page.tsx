"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileCheck2, Globe2, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
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
    blockedCases?: CaseItem[];
  };
  controls?: Record<string, {
    status: "healthy" | "warning" | "critical";
    summary: string;
    metric: number;
  }>;
  attention?: Array<{
    code: string;
    severity: "healthy" | "warning" | "critical";
    label: string;
    value: number;
  }>;
  operational?: {
    overdueIncidents: number;
    failedBackups: number;
    overdueDsrs: number;
    deniedPrivilegedAccess: number;
    reportExportEvents: number;
    thirdPartyOverdueReviews?: number;
    thirdPartyCrossBorderFlags?: number;
    overduePolicyAttestations?: number;
    openPolicyExceptions?: number;
    overdueTraining?: number;
    criticalTrainingGaps?: number;
    overdueRemediations?: number;
    criticalOpenRemediations?: number;
  };
};

type ExportApprovalItem = {
  approvalRequestId: string;
  targetKey: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

type ExportApprovalDashboard = {
  items?: ExportApprovalItem[];
};

function controlVariant(status: "healthy" | "warning" | "critical") {
  if (status === "critical") return "warning" as const;
  if (status === "warning") return "outline" as const;
  return "success" as const;
}

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<ComplianceDashboardData | null>(null);
  const [exportApprovals, setExportApprovals] = useState<ExportApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCompliance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [response, approvals] = await Promise.all([
        apiFetch<ComplianceDashboardData>("/api/discharge/reports/compliance-dashboard"),
        apiFetch<ExportApprovalDashboard>("/api/admin/export-approvals", { authFailureMode: "inline", cache: "no-store" }),
      ]);
      setDashboard(response);
      setExportApprovals(approvals.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load legal compliance reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  const approvedComplianceExport = exportApprovals.find((item) => item.targetKey === "compliance_dashboard" && item.status === "APPROVED");

  const requestExportApproval = useCallback(async () => {
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/export-approvals", {
        method: "POST",
        body: JSON.stringify({
          targetKey: "compliance_dashboard",
          exportFormat: "CSV",
          reason: "Compliance dashboard CSV export",
        }),
      });
      setSuccess("Compliance dashboard export approval requested.");
      await loadCompliance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request export approval.");
    }
  }, [loadCompliance]);

  const downloadCsv = useCallback(async () => {
    try {
      if (!approvedComplianceExport?.approvalRequestId) {
        throw new Error("Export approval is required. Request approval first.");
      }

      const response = await fetch(`/api/discharge/reports/compliance-dashboard?format=csv&approvalId=${encodeURIComponent(approvedComplianceExport.approvalRequestId)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to export compliance dashboard.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "compliance-dashboard.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export compliance dashboard.");
    }
  }, [approvedComplianceExport]);

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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => window.location.assign("/admin/third-party-risk")}>
              مخاطر الأطراف الثالثة
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.assign("/admin/policy-attestations")}>
              حوكمة السياسات
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.assign("/admin/training-compliance")}>
              جاهزية التدريب
            </Button>
            <Button type="button" variant="outline" onClick={() => window.location.assign("/admin/remediation-tracker")}>
              الإجراءات التصحيحية
            </Button>
            <Button type="button" variant="outline" onClick={() => void requestExportApproval()}>
              طلب موافقة التصدير
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadCsv()}>
              <Download className="h-4 w-4" /> تصدير CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadCompliance()}>
              <RefreshCw className="h-4 w-4" /> تحديث التقارير
            </Button>
          </div>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
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

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Third-party reviews overdue</span>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.thirdPartyOverdueReviews ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Cross-border processors flagged</span>
                  <Globe2 className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.thirdPartyCrossBorderFlags ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Policy attestations overdue</span>
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.overduePolicyAttestations ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Open governance exceptions</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.openPolicyExceptions ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Mandatory training overdue</span>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.overdueTraining ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Critical workforce gaps</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.criticalTrainingGaps ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Remediation actions overdue</span>
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.overdueRemediations ?? 0}</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-sm">Critical remediation items</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{compliance?.operational?.criticalOpenRemediations ?? 0}</p>
              </article>
            </section>

            <section className="grid gap-3 xl:grid-cols-4">
              {Object.entries(compliance?.controls ?? {}).map(([key, control]) => (
                <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold capitalize text-slate-900">{key.replace(/([A-Z])/g, " $1").trim()}</h2>
                    <Badge variant={controlVariant(control.status)}>{control.status}</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-900">{control.metric}</p>
                  <p className="mt-2 text-sm text-slate-600">{control.summary}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Priority attention queue</h2>
                <div className="mt-3 space-y-2">
                  {(compliance?.attention ?? []).map((item) => (
                    <div key={item.code} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{item.label}</div>
                        <div className="text-slate-500">Code: {item.code}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={controlVariant(item.severity)}>{item.severity}</Badge>
                        <span className="font-semibold text-slate-900">{item.value}</span>
                      </div>
                    </div>
                  ))}
                  {(compliance?.attention ?? []).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No priority compliance issues are currently open.</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Blocked legal cases</h2>
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
                      {(compliance?.tables.blockedCases ?? []).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{item.caseNumber || item.id}</td>
                          <td className="px-3 py-2">{item.patientName || "-"}</td>
                          <td className="px-3 py-2 text-amber-700">{item.status || "Blocked"}</td>
                        </tr>
                      ))}
                      {(compliance?.tables.blockedCases ?? []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-slate-500" colSpan={3}>No legally blocked cases.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
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
