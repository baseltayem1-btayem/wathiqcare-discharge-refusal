"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { apiFetch } from "@/utils/api";

type ConsentRecordItem = {
  id: string;
  processingPurpose?: string;
  consentMethod?: string;
  lawfulBasis?: string;
  consentedAt?: string;
};

type ConsentSummary = {
  total?: number;
  byMethod?: Record<string, number>;
  records?: ConsentRecordItem[];
};

type DsrItem = {
  id: string;
  requestType: string;
  requesterName: string;
  requestReason?: string | null;
  status: string;
  dueAt: string;
  extendedDueAt?: string | null;
  slaState?: string;
};

type DsrSummary = {
  total?: number;
  openCount?: number;
  byStatus?: Record<string, number>;
  bySlaState?: Record<string, number>;
};

type PrivacyDashboard = {
  metrics?: {
    consentCount?: number;
    dsrCount?: number;
    pendingRetentionActions?: number;
  };
  consent?: ConsentSummary;
  dsr?: DsrItem[];
  dsrSummary?: DsrSummary;
};

const DSR_TYPE_OPTIONS = ["ACCESS", "CORRECTION", "DELETION", "RESTRICTION_OBJECTION", "EXPORT"];
const DSR_STATUS_OPTIONS = ["REQUESTED", "IDENTITY_VERIFIED", "LEGAL_REVIEW", "EXECUTED", "CLOSED", "REJECTED"];

function getSlaVariant(state: string | undefined) {
  switch ((state || "").toLowerCase()) {
    case "on_track":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "breached":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function PrivacyAdminPage() {
  const [dashboard, setDashboard] = useState<PrivacyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"create" | "update" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createForm, setCreateForm] = useState({
    requesterName: "",
    requesterIdNumber: "",
    caseId: "",
    requestType: "ACCESS",
    requestReason: "",
  });
  const [updateForm, setUpdateForm] = useState({
    requestId: "",
    status: "LEGAL_REVIEW",
    extendByDays: "",
    extensionReason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<PrivacyDashboard>("/api/admin/privacy", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
      setUpdateForm((current) => ({
        ...current,
        requestId: current.requestId || response.dsr?.[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load privacy workspace.");
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dsrItems = dashboard?.dsr ?? [];
  const consentRecords = dashboard?.consent?.records ?? [];
  const dsrSummary = dashboard?.dsrSummary;

  const metrics = useMemo(
    () => [
      { label: "Consent records", value: dashboard?.metrics?.consentCount ?? dashboard?.consent?.total ?? 0 },
      { label: "DSR requests", value: dashboard?.metrics?.dsrCount ?? dsrSummary?.total ?? 0 },
      { label: "Open DSRs", value: dsrSummary?.openCount ?? 0 },
      { label: "Pending retention actions", value: dashboard?.metrics?.pendingRetentionActions ?? 0 },
    ],
    [dashboard, dsrSummary],
  );

  async function handleCreateDsr() {
    setBusy("create");
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/privacy/dsr", {
        method: "POST",
        body: JSON.stringify({
          requesterName: createForm.requesterName,
          requesterIdNumber: createForm.requesterIdNumber || undefined,
          caseId: createForm.caseId || undefined,
          requestType: createForm.requestType,
          requestReason: createForm.requestReason || undefined,
        }),
      });
      setCreateForm({
        requesterName: "",
        requesterIdNumber: "",
        caseId: "",
        requestType: "ACCESS",
        requestReason: "",
      });
      setSuccess("DSR request created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create DSR request.");
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdateDsr() {
    if (!updateForm.requestId) {
      setError("Select a DSR request to update.");
      return;
    }

    setBusy("update");
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/privacy/dsr/${updateForm.requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: updateForm.status,
          extendByDays: updateForm.extendByDays ? Number(updateForm.extendByDays) : undefined,
          extensionReason: updateForm.extensionReason || undefined,
        }),
      });
      setUpdateForm((current) => ({
        ...current,
        extendByDays: "",
        extensionReason: "",
      }));
      setSuccess("DSR request updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update DSR request.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Privacy & PDPL"
        subtitle="Phase 2 workspace for consent evidence, DSR handling, and privacy governance execution."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Consent evidence stays case-linked and hashable.",
            "DSR SLA moves from REQUESTED to CLOSED with review checkpoints.",
            "Retention exposure remains visible for privacy officers.",
            "Every dashboard and export view is traceable.",
          ].map((item) => (
            <Card key={item}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-cyan-50 p-2 text-cyan-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardTitle className="text-sm text-slate-600">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Create DSR request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Requester name" value={createForm.requesterName} onChange={(e) => setCreateForm((current) => ({ ...current, requesterName: e.target.value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Requester ID number" value={createForm.requesterIdNumber} onChange={(e) => setCreateForm((current) => ({ ...current, requesterIdNumber: e.target.value }))} />
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Case ID (optional)" value={createForm.caseId} onChange={(e) => setCreateForm((current) => ({ ...current, caseId: e.target.value }))} />
              </div>
              <select aria-label="DSR request type" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={createForm.requestType} onChange={(e) => setCreateForm((current) => ({ ...current, requestType: e.target.value }))}>
                {DSR_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Reason / scope" value={createForm.requestReason} onChange={(e) => setCreateForm((current) => ({ ...current, requestReason: e.target.value }))} />
              <Button onClick={() => void handleCreateDsr()} disabled={busy === "create" || loading}>Create request</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Update DSR status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select aria-label="DSR request selector" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={updateForm.requestId} onChange={(e) => setUpdateForm((current) => ({ ...current, requestId: e.target.value }))}>
                <option value="">Select request</option>
                {dsrItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.requesterName} · {item.requestType} · {item.status}</option>
                ))}
              </select>
              <select aria-label="DSR status" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={updateForm.status} onChange={(e) => setUpdateForm((current) => ({ ...current, status: e.target.value }))}>
                {DSR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Extend by days (optional)" value={updateForm.extendByDays} onChange={(e) => setUpdateForm((current) => ({ ...current, extendByDays: e.target.value }))} />
              <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Extension reason / legal review note" value={updateForm.extensionReason} onChange={(e) => setUpdateForm((current) => ({ ...current, extensionReason: e.target.value }))} />
              <Button variant="outline" onClick={() => void handleUpdateDsr()} disabled={busy === "update" || loading}>Save update</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Consent evidence summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {Object.entries(dashboard?.consent?.byMethod ?? {}).map(([key, value]) => (
                  <Badge key={key} variant="outline">{key}: {value}</Badge>
                ))}
                {Object.keys(dashboard?.consent?.byMethod ?? {}).length === 0 ? <Badge variant="outline">No consent records yet</Badge> : null}
              </div>
              <div className="space-y-2">
                {consentRecords.slice(0, 6).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium text-slate-800">{record.processingPurpose || "Discharge refusal consent"}</div>
                    <div className="text-slate-500">{record.consentMethod || "N/A"} • {record.lawfulBasis || "Lawful basis pending"}</div>
                    <div className="text-slate-400">{record.consentedAt ? new Date(record.consentedAt).toLocaleString() : "No timestamp"}</div>
                  </div>
                ))}
                {consentRecords.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">Consent capture will appear here after case teams record it.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DSR queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {Object.entries(dsrSummary?.bySlaState ?? {}).map(([key, value]) => (
                  <Badge key={key} variant={getSlaVariant(key)}>{key}: {value}</Badge>
                ))}
              </div>
              <div className="space-y-2">
                {dsrItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{item.requesterName} · {item.requestType}</div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{item.status}</Badge>
                        <Badge variant={getSlaVariant(item.slaState)}>{item.slaState || "unknown"}</Badge>
                      </div>
                    </div>
                    <div className="text-slate-500">Due: {new Date(item.extendedDueAt || item.dueAt).toLocaleDateString()}</div>
                    <div className="text-slate-500">{item.requestReason || "No reason supplied."}</div>
                  </div>
                ))}
                {dsrItems.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No DSR requests have been raised yet.</div> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
