"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type PolicyAttestationItem = {
  id: string;
  policyKey: string;
  policyName: string;
  framework: string;
  ownerName: string;
  criticality: string;
  status: string;
  reviewFrequencyDays: number;
  nextReviewDueAt?: string | null;
  evidenceLink?: string | null;
  exceptionReason?: string | null;
  exceptionExpiresAt?: string | null;
  notes?: string | null;
  attestedBy?: string | null;
  updatedAt?: string | null;
};

type PolicyAttestationDashboard = {
  items?: PolicyAttestationItem[];
  summary?: {
    total: number;
    attestedCount: number;
    overdueAttestations: number;
    openExceptions: number;
    criticalFindings: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    attestedCount?: number;
    overdueAttestations?: number;
    openExceptions?: number;
    criticalFindings?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "ATTESTED":
      return "success" as const;
    case "EXCEPTION":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function criticalityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function PolicyAttestationAdminPage() {
  const [dashboard, setDashboard] = useState<PolicyAttestationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    policyKey: "",
    policyName: "",
    framework: "PDPL",
    ownerName: "",
    criticality: "standard",
    status: "PENDING_REVIEW",
    reviewFrequencyDays: "365",
    nextReviewDueAt: "",
    evidenceLink: "",
    exceptionReason: "",
    exceptionExpiresAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<PolicyAttestationDashboard>("/api/admin/policy-attestations", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load policy governance dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Policy items", value: dashboard?.metrics?.total ?? 0 },
      { label: "Attested", value: dashboard?.metrics?.attestedCount ?? 0 },
      { label: "Overdue", value: dashboard?.metrics?.overdueAttestations ?? 0 },
      { label: "Open exceptions", value: dashboard?.metrics?.openExceptions ?? 0 },
    ],
    [dashboard],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/policy-attestations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          reviewFrequencyDays: Number(form.reviewFrequencyDays || 365),
          nextReviewDueAt: form.nextReviewDueAt ? new Date(form.nextReviewDueAt).toISOString() : null,
          exceptionExpiresAt: form.exceptionExpiresAt ? new Date(form.exceptionExpiresAt).toISOString() : null,
        }),
      });
      setSuccess("Policy governance item saved.");
      setForm({
        policyKey: "",
        policyName: "",
        framework: "PDPL",
        ownerName: "",
        criticality: "standard",
        status: "PENDING_REVIEW",
        reviewFrequencyDays: "365",
        nextReviewDueAt: "",
        evidenceLink: "",
        exceptionReason: "",
        exceptionExpiresAt: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save policy item.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const updateStatus = useCallback(async (item: PolicyAttestationItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/policy-attestations", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          policyKey: item.policyKey,
          policyName: item.policyName,
          framework: item.framework,
          ownerName: item.ownerName,
          criticality: item.criticality,
          reviewFrequencyDays: item.reviewFrequencyDays,
          nextReviewDueAt: item.nextReviewDueAt,
          evidenceLink: item.evidenceLink,
          exceptionReason: item.exceptionReason,
          exceptionExpiresAt: item.exceptionExpiresAt,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(`Policy item marked as ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update policy item.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <AuthGuard>
      <AppShell
        title="Policy Attestations"
        subtitle="Phase 8 workspace for governance reviews, exception tracking, and accountable control attestations."
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
              <CardTitle>Record an attestation or exception</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="policy_attestation_review"
                description="Verify the privileged session before attesting policies or granting temporary exceptions."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title="Policy key" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="policy-key" value={form.policyKey} onChange={(event) => setForm((current) => ({ ...current, policyKey: event.target.value }))} />
                <input title="Policy name" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Policy or control name" value={form.policyName} onChange={(event) => setForm((current) => ({ ...current, policyName: event.target.value }))} />
                <input title="Framework" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="PDPL / CBAHI / JCI" value={form.framework} onChange={(event) => setForm((current) => ({ ...current, framework: event.target.value }))} />
                <input title="Owner name" className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Owner or accountable team" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label="Policy criticality" title="Policy criticality" className="rounded-xl border border-slate-200 px-3 py-2" value={form.criticality} onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value }))}>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select aria-label="Policy status" title="Policy status" className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="PENDING_REVIEW">Pending review</option>
                  <option value="ATTESTED">Attested</option>
                  <option value="EXCEPTION">Exception</option>
                  <option value="RETIRED">Retired</option>
                </select>
                <input title="Review frequency in days" className="rounded-xl border border-slate-200 px-3 py-2" type="number" min={30} placeholder="365" value={form.reviewFrequencyDays} onChange={(event) => setForm((current) => ({ ...current, reviewFrequencyDays: event.target.value }))} />
                <input aria-label="Next review due date" title="Next review due date" className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.nextReviewDueAt} onChange={(event) => setForm((current) => ({ ...current, nextReviewDueAt: event.target.value }))} />
                <input title="Evidence link" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Evidence link or review minutes" value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <input title="Exception reason" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Required when status is Exception" value={form.exceptionReason} onChange={(event) => setForm((current) => ({ ...current, exceptionReason: event.target.value }))} />
                <input aria-label="Exception expiry" title="Exception expiry" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" type="date" value={form.exceptionExpiresAt} onChange={(event) => setForm((current) => ({ ...current, exceptionExpiresAt: event.target.value }))} />
                <textarea title="Notes" className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Notes or committee remarks" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> Save attestation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governance attention queue</CardTitle>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No overdue attestations or open exceptions are currently active.</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <ClipboardCheck className="mr-2 inline h-4 w-4 text-cyan-700" />
                Keep policy owners, review dates, evidence links, and temporary waivers in one auditable register.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Policy review register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.policyName}</div>
                    <div className="text-slate-500">{item.framework} · Owner: {item.ownerName} · Key: {item.policyKey}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={criticalityVariant(item.criticality)}>{item.criticality}</Badge>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  Review every {item.reviewFrequencyDays} day(s) · Next due: {item.nextReviewDueAt ? new Date(item.nextReviewDueAt).toLocaleDateString() : "not scheduled"}
                </div>
                {item.exceptionReason ? <div className="mt-2 text-amber-700">Exception: {item.exceptionReason}</div> : null}
                {item.exceptionExpiresAt ? <div className="text-slate-500">Exception expires: {new Date(item.exceptionExpiresAt).toLocaleDateString()}</div> : null}
                {item.evidenceLink ? <div className="mt-2 text-slate-500">Evidence: {item.evidenceLink}</div> : null}
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "ATTESTED")} disabled={busyId === `${item.id}:ATTESTED`}>
                    Mark attested
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "PENDING_REVIEW")} disabled={busyId === `${item.id}:PENDING_REVIEW`}>
                    Re-open review
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No policy review items recorded yet.</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
