"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type TrainingComplianceItem = {
  id: string;
  moduleKey: string;
  moduleName: string;
  targetRole: string;
  ownerName: string;
  criticality: string;
  status: string;
  mandatory: boolean;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  notes?: string | null;
  completedBy?: string | null;
};

type TrainingDashboard = {
  items?: TrainingComplianceItem[];
  summary?: {
    total: number;
    completedCount: number;
    overdueCount: number;
    criticalGapCount: number;
    notStartedCount: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    completedCount?: number;
    overdueCount?: number;
    criticalGapCount?: number;
    notStartedCount?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "COMPLETED":
      return "success" as const;
    case "NOT_STARTED":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function criticalityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function TrainingComplianceAdminPage() {
  const [dashboard, setDashboard] = useState<TrainingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    moduleKey: "",
    moduleName: "",
    targetRole: "all_staff",
    ownerName: "",
    criticality: "standard",
    status: "NOT_STARTED",
    mandatory: true,
    dueAt: "",
    evidenceLink: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<TrainingDashboard>("/api/admin/training-compliance", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load training readiness dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Modules", value: dashboard?.metrics?.total ?? 0 },
      { label: "Completed", value: dashboard?.metrics?.completedCount ?? 0 },
      { label: "Overdue", value: dashboard?.metrics?.overdueCount ?? 0 },
      { label: "Critical gaps", value: dashboard?.metrics?.criticalGapCount ?? 0 },
    ],
    [dashboard],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/training-compliance", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        }),
      });
      setSuccess("Training item saved.");
      setForm({
        moduleKey: "",
        moduleName: "",
        targetRole: "all_staff",
        ownerName: "",
        criticality: "standard",
        status: "NOT_STARTED",
        mandatory: true,
        dueAt: "",
        evidenceLink: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save training item.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const updateStatus = useCallback(async (item: TrainingComplianceItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/training-compliance", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          moduleKey: item.moduleKey,
          moduleName: item.moduleName,
          targetRole: item.targetRole,
          ownerName: item.ownerName,
          criticality: item.criticality,
          mandatory: item.mandatory,
          dueAt: item.dueAt,
          evidenceLink: item.evidenceLink,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(`Training item marked as ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update training item.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <AuthGuard>
      <AppShell
        title="Training Readiness"
        subtitle="Phase 9 workspace for mandatory medico-legal and PDPL training readiness across accountable teams."
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
              <CardTitle>Register a training obligation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="training_compliance_review"
                description="Verify the privileged session before recording critical workforce readiness evidence."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title="Module key" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="module-key" value={form.moduleKey} onChange={(event) => setForm((current) => ({ ...current, moduleKey: event.target.value }))} />
                <input title="Module name" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Training module name" value={form.moduleName} onChange={(event) => setForm((current) => ({ ...current, moduleName: event.target.value }))} />
                <input title="Target role" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Target role or team" value={form.targetRole} onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value }))} />
                <input title="Owner" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Owner or coordinator" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label="Training criticality" title="Training criticality" className="rounded-xl border border-slate-200 px-3 py-2" value={form.criticality} onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select aria-label="Training status" title="Training status" className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="NOT_STARTED">Not started</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="EXEMPTED">Exempted</option>
                </select>
                <input aria-label="Due date" title="Due date" className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
                <input title="Evidence link" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Certificate or evidence link" value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <textarea title="Notes" className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Notes or drill remarks" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <input type="checkbox" checked={form.mandatory} onChange={(event) => setForm((current) => ({ ...current, mandatory: event.target.checked }))} />
                Mandatory for this role/team
              </label>

              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> Save training item
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Readiness attention queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(dashboard?.summary?.attention ?? []).map((item) => (
                <div key={item.code} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.label}</span>
                    <Badge variant={item.severity === "critical" ? "warning" : "outline"}>{item.severity}</Badge>
                  </div>
                  <div className="text-slate-500">Open items: {item.value}</div>
                </div>
              ))}
              {(dashboard?.summary?.attention ?? []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No overdue or critical training gaps are currently open.</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <Users className="mr-2 inline h-4 w-4 text-cyan-700" />
                Keep role-based training evidence and completion state visible for legal, privacy, and security readiness.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Training register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.moduleName}</div>
                    <div className="text-slate-500">Role: {item.targetRole} · Owner: {item.ownerName} · Key: {item.moduleKey}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={criticalityVariant(item.criticality)}>{item.criticality}</Badge>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    <Badge variant={item.mandatory ? "warning" : "outline"}>{item.mandatory ? "mandatory" : "optional"}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  Due: {item.dueAt ? new Date(item.dueAt).toLocaleDateString() : "not scheduled"} · Completed: {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "pending"}
                </div>
                {item.evidenceLink ? <div className="mt-2 text-slate-500">Evidence: {item.evidenceLink}</div> : null}
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "COMPLETED")} disabled={busyId === `${item.id}:COMPLETED`}>
                    Mark completed
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "IN_PROGRESS")} disabled={busyId === `${item.id}:IN_PROGRESS`}>
                    Re-open
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No training items recorded yet.</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
