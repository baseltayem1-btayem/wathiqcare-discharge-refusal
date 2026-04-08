"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type RefusalQualityMetrics = {
  total_refusal_cases: number;
  active_refusal_cases: number;
  cases_escalated_after_24_hours: number;
  average_resolution_time_hours: number;
  refusal_reasons_distribution: Record<string, number>;
  cases_by_department: Record<string, number>;
  monthly_review_reports: Record<string, number>;
  quarterly_reports: Record<string, number>;
};

type ReportsAccessDashboard = {
  summary?: {
    totalEvents?: number;
    exportEvents?: number;
    uniqueUsers?: number;
    caseLinkedEvents?: number;
  };
  recentLogs?: Array<{
    id: string;
    reportKey: string;
    exportFormat?: string | null;
    accessedByRole?: string | null;
    accessedAt?: string;
  }>;
};

type ExportApprovalItem = {
  approvalRequestId: string;
  targetKey: string;
  caseId?: string | null;
  exportFormat?: string | null;
  requestedByRole?: string | null;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverRole?: string | null;
  decidedAt?: string | null;
  reason?: string | null;
};

type ExportApprovalDashboard = {
  items?: ExportApprovalItem[];
  metrics?: {
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
  };
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function labelForTarget(targetKey: string) {
  switch (targetKey) {
    case "refusal_quality_report":
      return "Refusal Quality Report";
    case "compliance_dashboard":
      return "Compliance Dashboard";
    default:
      return targetKey;
  }
}

export default function ReportsWorkspacePage() {
  const [metrics, setMetrics] = useState<RefusalQualityMetrics | null>(null);
  const [accessData, setAccessData] = useState<ReportsAccessDashboard | null>(null);
  const [approvals, setApprovals] = useState<ExportApprovalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepUpVerified, setStepUpVerified] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [quality, reportsAccess, approvalData] = await Promise.all([
        apiFetch<RefusalQualityMetrics>("/api/discharge/reports/refusal-quality", { authFailureMode: "inline", cache: "no-store" }),
        apiFetch<ReportsAccessDashboard>("/api/admin/reports-access", { authFailureMode: "inline", cache: "no-store" }),
        apiFetch<ExportApprovalDashboard>("/api/admin/export-approvals", { authFailureMode: "inline", cache: "no-store" }),
      ]);
      setMetrics(quality);
      setAccessData(reportsAccess);
      setApprovals(approvalData);
    } catch (err) {
      setMetrics(null);
      setAccessData(null);
      setApprovals(null);
      setError(err instanceof Error ? err.message : "Failed to load reports workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const topReasons = useMemo(() => Object.entries(metrics?.refusal_reasons_distribution ?? {}).slice(0, 5), [metrics]);
  const topDepartments = useMemo(() => Object.entries(metrics?.cases_by_department ?? {}).slice(0, 5), [metrics]);
  const approvalItems = approvals?.items ?? [];
  const approvedRefusalExport = approvalItems.find((item) => item.targetKey === "refusal_quality_report" && item.status === "APPROVED");
  const approvedComplianceExport = approvalItems.find((item) => item.targetKey === "compliance_dashboard" && item.status === "APPROVED");

  async function requestApproval(targetKey: string, reason: string) {
    setBusyAction(`request-${targetKey}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/export-approvals", {
        method: "POST",
        body: JSON.stringify({ targetKey, exportFormat: "CSV", reason }),
      });
      setSuccess(`Export approval requested for ${labelForTarget(targetKey)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request export approval.");
    } finally {
      setBusyAction("");
    }
  }

  async function decideApproval(approvalRequestId: string, decision: "APPROVED" | "REJECTED") {
    setBusyAction(`${decision}-${approvalRequestId}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/export-approvals", {
        method: "PATCH",
        body: JSON.stringify({
          approvalRequestId,
          decision,
          note: decision === "APPROVED" ? "Approved from reports workspace" : "Rejected from reports workspace",
        }),
      });
      setSuccess(`Export request ${decision.toLowerCase()} successfully.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update export approval request.");
    } finally {
      setBusyAction("");
    }
  }

  function openApprovedExport(targetKey: "refusal_quality_report" | "compliance_dashboard") {
    const approvalId =
      targetKey === "refusal_quality_report"
        ? approvedRefusalExport?.approvalRequestId
        : approvedComplianceExport?.approvalRequestId;

    if (!approvalId) {
      setError(`Request and approve ${labelForTarget(targetKey)} export before downloading.`);
      return;
    }

    const href =
      targetKey === "refusal_quality_report"
        ? `/api/discharge/reports/refusal-quality?format=csv&approvalId=${encodeURIComponent(approvalId)}`
        : `/api/discharge/reports/compliance-dashboard?format=csv&approvalId=${encodeURIComponent(approvalId)}`;

    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <AuthGuard>
      <AppShell
        title="Compliance Reports"
        subtitle="Phase 6 reporting workspace for controlled exports, approval release, and auditable evidence usage."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            {metrics ? <Button variant="outline" onClick={() => downloadJson("refusal-quality-report.json", metrics)}><Download className="h-4 w-4" /> Export JSON</Button> : null}
            <Button variant="outline" onClick={() => openApprovedExport("refusal_quality_report")}>
              <Download className="h-4 w-4" /> Export Refusal CSV
            </Button>
            <Button variant="outline" onClick={() => openApprovedExport("compliance_dashboard")}>
              <Download className="h-4 w-4" /> Export Compliance CSV
            </Button>
          </div>
        }
      >
        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="mb-6">
          <StepUpVerificationPanel
            actionKey="export_approval_decision"
            description="Approval or rejection of evidence exports requires a verified step-up session."
            onVerifiedChange={setStepUpVerified}
          />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm text-slate-600">Total refusal cases</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{metrics?.total_refusal_cases ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-slate-600">Active cases</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{metrics?.active_refusal_cases ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-slate-600">Escalated after 24h</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{metrics?.cases_escalated_after_24_hours ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-slate-600">Avg. resolution hours</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-900">{metrics?.average_resolution_time_hours ?? 0}</div></CardContent></Card>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Controlled export approvals</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Pending: {approvals?.metrics?.pending ?? 0}</Badge>
                <Badge variant="outline">Approved: {approvals?.metrics?.approved ?? 0}</Badge>
                <Badge variant="outline">Rejected: {approvals?.metrics?.rejected ?? 0}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void requestApproval("refusal_quality_report", "Quarterly refusal quality export")} disabled={busyAction === "request-refusal_quality_report"}>
                  Request refusal CSV approval
                </Button>
                <Button variant="outline" onClick={() => void requestApproval("compliance_dashboard", "Executive compliance dashboard export")} disabled={busyAction === "request-compliance_dashboard"}>
                  Request compliance CSV approval
                </Button>
              </div>
              <div className="space-y-2">
                {approvalItems.slice(0, 6).map((item) => (
                  <div key={item.approvalRequestId} className="rounded-xl border border-slate-200 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{labelForTarget(item.targetKey)}</div>
                      <Badge variant={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "warning" : "outline"}>{item.status}</Badge>
                    </div>
                    <div className="mt-1 text-slate-500">Requested by {item.requestedByRole || "unknown"} · {new Date(item.requestedAt).toLocaleString()}</div>
                    <div className="text-slate-500">Reason: {item.reason || "No reason provided."}</div>
                    {item.status === "PENDING" ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void decideApproval(item.approvalRequestId, "APPROVED")} disabled={!stepUpVerified || busyAction === `APPROVED-${item.approvalRequestId}`}>
                          Approve
                        </Button>
                        <Button variant="outline" onClick={() => void decideApproval(item.approvalRequestId, "REJECTED")} disabled={!stepUpVerified || busyAction === `REJECTED-${item.approvalRequestId}`}>
                          Reject
                        </Button>
                      </div>
                    ) : item.decidedAt ? (
                      <div className="mt-2 text-slate-500">Decision by {item.approverRole || "unknown"} · {new Date(item.decidedAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                ))}
                {approvalItems.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No export approval requests have been recorded yet.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top refusal reasons</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {topReasons.map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"><span>{key}</span><Badge variant="outline">{value}</Badge></div>)}
              {topReasons.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No refusal trends available yet.</div> : null}
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Cases by department</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {topDepartments.map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"><span>{key}</span><Badge variant="outline">{value}</Badge></div>)}
              {topDepartments.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No department metrics available yet.</div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Report access activity</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Total events: {accessData?.summary?.totalEvents ?? 0}</Badge>
                <Badge variant="outline">Exports: {accessData?.summary?.exportEvents ?? 0}</Badge>
                <Badge variant="outline">Unique viewers: {accessData?.summary?.uniqueUsers ?? 0}</Badge>
                <Badge variant="outline">Case-linked: {accessData?.summary?.caseLinkedEvents ?? 0}</Badge>
              </div>
              {(accessData?.recentLogs ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.reportKey}</span>
                    <Badge variant="outline">{item.exportFormat || "view"}</Badge>
                  </div>
                  <div className="text-slate-500">Role: {item.accessedByRole || "unknown"} · {item.accessedAt ? new Date(item.accessedAt).toLocaleString() : "No timestamp"}</div>
                </div>
              ))}
              {(accessData?.recentLogs ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No report access activity has been logged yet.</div> : null}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
