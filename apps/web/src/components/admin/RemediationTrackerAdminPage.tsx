"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type RemediationItem = {
  id: string;
  actionKey: string;
  actionTitle: string;
  sourceType: string;
  sourceRef?: string | null;
  category: string;
  severity: string;
  status: string;
  ownerName: string;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  rootCause?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  updatedAt?: string | null;
};

type RemediationTrackerDashboard = {
  items?: RemediationItem[];
  summary?: {
    total: number;
    openCount: number;
    overdueCount: number;
    criticalOpenCount: number;
    blockedCount: number;
    completedCount: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    openCount?: number;
    overdueCount?: number;
    criticalOpenCount?: number;
    blockedCount?: number;
    completedCount?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "COMPLETED":
      return "success" as const;
    case "BLOCKED":
    case "ACCEPTED_RISK":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function severityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function RemediationTrackerAdminPage() {
  const [dashboard, setDashboard] = useState<RemediationTrackerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    actionKey: "",
    actionTitle: "",
    sourceType: "audit_finding",
    sourceRef: "",
    category: "privacy",
    severity: "standard",
    status: "OPEN",
    ownerName: "",
    dueAt: "",
    evidenceLink: "",
    rootCause: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<RemediationTrackerDashboard>("/api/admin/remediation-tracker", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load remediation tracker.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Total actions", value: dashboard?.metrics?.total ?? 0 },
      { label: "Open", value: dashboard?.metrics?.openCount ?? 0 },
      { label: "Overdue", value: dashboard?.metrics?.overdueCount ?? 0 },
      { label: "Critical open", value: dashboard?.metrics?.criticalOpenCount ?? 0 },
    ],
    [dashboard],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/remediation-tracker", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        }),
      });
      setSuccess("Remediation action saved.");
      setForm({
        actionKey: "",
        actionTitle: "",
        sourceType: "audit_finding",
        sourceRef: "",
        category: "privacy",
        severity: "standard",
        status: "OPEN",
        ownerName: "",
        dueAt: "",
        evidenceLink: "",
        rootCause: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save remediation action.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const updateStatus = useCallback(async (item: RemediationItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/remediation-tracker", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          actionKey: item.actionKey,
          actionTitle: item.actionTitle,
          sourceType: item.sourceType,
          sourceRef: item.sourceRef,
          category: item.category,
          severity: item.severity,
          ownerName: item.ownerName,
          dueAt: item.dueAt,
          evidenceLink: item.evidenceLink,
          rootCause: item.rootCause,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(`Remediation action marked as ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update remediation action.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <AuthGuard>
      <AppShell
        title="Remediation Tracker"
        subtitle="Phase 10 workspace for corrective actions, accountable owners, and verified closure evidence."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      >
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
              <CardTitle>Register a corrective action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="remediation_tracker_review"
                description="Verify the privileged session before creating or closing corrective actions."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title="Action key" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="action-key" value={form.actionKey} onChange={(event) => setForm((current) => ({ ...current, actionKey: event.target.value }))} />
                <input title="Action title" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Corrective action title" value={form.actionTitle} onChange={(event) => setForm((current) => ({ ...current, actionTitle: event.target.value }))} />
                <input title="Source type" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="audit_finding / incident / training_gap" value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))} />
                <input title="Source reference" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Incident ID or finding ref" value={form.sourceRef} onChange={(event) => setForm((current) => ({ ...current, sourceRef: event.target.value }))} />
                <select aria-label="Remediation category" title="Remediation category" className="rounded-xl border border-slate-200 px-3 py-2" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  <option value="privacy">Privacy</option>
                  <option value="security">Security</option>
                  <option value="legal">Legal</option>
                  <option value="resilience">Resilience</option>
                  <option value="third_party">Third party</option>
                  <option value="workforce">Workforce</option>
                  <option value="operations">Operations</option>
                </select>
                <select aria-label="Remediation severity" title="Remediation severity" className="rounded-xl border border-slate-200 px-3 py-2" value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select aria-label="Remediation status" title="Remediation status" className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ACCEPTED_RISK">Accepted risk</option>
                </select>
                <input title="Owner name" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Accountable owner" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <input aria-label="Due date" title="Due date" className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
                <input title="Evidence link" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Evidence link or closure artifact" value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <textarea title="Root cause" className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Root cause or issue statement" value={form.rootCause} onChange={(event) => setForm((current) => ({ ...current, rootCause: event.target.value }))} />
                <textarea title="Notes" className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Closure notes or committee remarks" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> Save action
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Immediate attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(dashboard?.summary?.attention ?? []).map((item) => (
                <div key={item.code} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <span>{item.label}</span>
                  <Badge variant={item.severity === "critical" ? "warning" : "outline"}>{item.value}</Badge>
                </div>
              ))}
              {(dashboard?.summary?.attention ?? []).length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                  No overdue or critical remediation actions right now.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Corrective action register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.actionTitle}</span>
                      <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {item.category} • Owner: {item.ownerName} • Source: {item.sourceType}
                      {item.sourceRef ? ` (${item.sourceRef})` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-slate-500">
                      {item.dueAt ? <span><AlertTriangle className="mr-1 inline h-4 w-4" /> Due: {new Date(item.dueAt).toLocaleDateString()}</span> : null}
                      {item.completedAt ? <span><ClipboardCheck className="mr-1 inline h-4 w-4" /> Closed: {new Date(item.completedAt).toLocaleDateString()}</span> : null}
                      {item.completedBy ? <span>Closed by: {item.completedBy}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busyId === `${item.id}:IN_PROGRESS` || item.status === "IN_PROGRESS"} onClick={() => void updateStatus(item, "IN_PROGRESS")}>
                      In progress
                    </Button>
                    <Button disabled={busyId === `${item.id}:COMPLETED` || item.status === "COMPLETED"} onClick={() => void updateStatus(item, "COMPLETED")}>
                      Complete
                    </Button>
                  </div>
                </div>

                {item.rootCause ? <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Root cause: {item.rootCause}</p> : null}
                {item.notes ? <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Notes: {item.notes}</p> : null}
                {item.evidenceLink ? <p className="mt-2 text-slate-600">Evidence: <span className="font-mono text-xs">{item.evidenceLink}</span></p> : null}
              </div>
            ))}

            {(dashboard?.items ?? []).length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                No corrective actions registered yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
