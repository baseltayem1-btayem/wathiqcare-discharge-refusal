"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type IncidentItem = {
  id: string;
  caseId?: string | null;
  title: string;
  summary: string;
  severity: string;
  status: string;
  affectedScope?: string | null;
  detectedAt: string;
  clientNotificationDueAt?: string | null;
  regulatorNotificationDueAt?: string | null;
};

type IncidentDashboard = {
  summary?: {
    total?: number;
    openCount?: number;
    overdueNotificationCount?: number;
    bySeverity?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
  incidents?: IncidentItem[];
};

const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_OPTIONS = ["DETECTED", "TRIAGED", "CONTAINED", "RESOLVED", "CLOSED"];

function severityVariant(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "LOW") return "outline" as const;
  if (normalized === "RESOLVED" || normalized === "CLOSED") return "success" as const;
  return "warning" as const;
}

export default function IncidentAdminPage() {
  const [dashboard, setDashboard] = useState<IncidentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepUpVerified, setStepUpVerified] = useState(false);
  const [form, setForm] = useState({
    caseId: "",
    severity: "HIGH",
    status: "DETECTED",
    title: "",
    summary: "",
    affectedScope: "clinical_workflow",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<IncidentDashboard>("/api/admin/incidents", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Total incidents", value: dashboard?.summary?.total ?? 0 },
      { label: "Open incidents", value: dashboard?.summary?.openCount ?? 0 },
      { label: "Overdue notifications", value: dashboard?.summary?.overdueNotificationCount ?? 0 },
      { label: "Critical incidents", value: dashboard?.summary?.bySeverity?.CRITICAL ?? 0 },
    ],
    [dashboard],
  );

  async function handleCreateIncident() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/incidents", {
        method: "POST",
        body: JSON.stringify({
          caseId: form.caseId || undefined,
          severity: form.severity,
          status: form.status,
          title: form.title,
          summary: form.summary,
          affectedScope: form.affectedScope,
        }),
      });
      setForm({
        caseId: "",
        severity: "HIGH",
        status: "DETECTED",
        title: "",
        summary: "",
        affectedScope: "clinical_workflow",
      });
      setSuccess("Incident registered.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register incident.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Incident Response"
        subtitle="Phase 3 workspace for incident capture, deadlines, and breach-response coordination."
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create security incident</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StepUpVerificationPanel
              actionKey="incident_create"
              description="A verified privileged session is required before creating or updating incident records."
              onVerifiedChange={setStepUpVerified}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Case ID (optional)" value={form.caseId} onChange={(e) => setForm((current) => ({ ...current, caseId: e.target.value }))} />
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Affected scope" value={form.affectedScope} onChange={(e) => setForm((current) => ({ ...current, affectedScope: e.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select aria-label="Incident severity" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.severity} onChange={(e) => setForm((current) => ({ ...current, severity: e.target.value }))}>
                {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select aria-label="Incident status" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Incident title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
            <textarea className="min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Incident summary and evidence notes" value={form.summary} onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))} />
            <Button onClick={() => void handleCreateIncident()} disabled={busy || loading || !stepUpVerified}>Register incident</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.incidents ?? []).slice(0, 10).map((incident) => (
              <div key={incident.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-800">{incident.title}</div>
                  <div className="flex gap-2">
                    <Badge variant={severityVariant(incident.severity)}>{incident.severity}</Badge>
                    <Badge variant={severityVariant(incident.status)}>{incident.status}</Badge>
                  </div>
                </div>
                <div className="text-slate-500">{incident.summary}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-slate-400">
                  <span><AlertTriangle className="mr-1 inline h-4 w-4" /> Detected: {new Date(incident.detectedAt).toLocaleString()}</span>
                  {incident.clientNotificationDueAt ? <span>Client due: {new Date(incident.clientNotificationDueAt).toLocaleString()}</span> : null}
                  {incident.regulatorNotificationDueAt ? <span>Regulator due: {new Date(incident.regulatorNotificationDueAt).toLocaleString()}</span> : null}
                </div>
              </div>
            ))}
            {(dashboard?.incidents ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No incidents registered yet.</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
