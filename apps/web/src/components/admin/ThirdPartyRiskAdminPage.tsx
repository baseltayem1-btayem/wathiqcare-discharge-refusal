"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type ThirdPartyRiskItem = {
  id: string;
  processorName: string;
  serviceType: string;
  hostingRegion: string;
  residencyScope: string;
  crossBorderTransfer: boolean;
  transferMechanism?: string | null;
  contractInPlace: boolean;
  securityReviewCompleted: boolean;
  containsPatientData: boolean;
  riskTier: string;
  status: string;
  ownerName?: string | null;
  notes?: string | null;
  nextReviewDueAt?: string | null;
  approvedBy?: string | null;
  updatedAt?: string | null;
};

type ThirdPartyRiskDashboard = {
  items?: ThirdPartyRiskItem[];
  summary?: {
    total: number;
    approvedCount: number;
    overdueReviews: number;
    crossBorderFlags: number;
    highRiskCount: number;
    missingContracts: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    approvedCount?: number;
    overdueReviews?: number;
    crossBorderFlags?: number;
    highRiskCount?: number;
    missingContracts?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "APPROVED":
      return "success" as const;
    case "RESTRICTED":
    case "REJECTED":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function riskVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function ThirdPartyRiskAdminPage() {
  const [dashboard, setDashboard] = useState<ThirdPartyRiskDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    processorName: "",
    serviceType: "analytics",
    hostingRegion: "saudi-arabia-riyadh",
    residencyScope: "KSA_ONLY",
    riskTier: "medium",
    status: "PENDING_REVIEW",
    crossBorderTransfer: false,
    contractInPlace: false,
    securityReviewCompleted: false,
    containsPatientData: true,
    transferMechanism: "",
    ownerName: "",
    nextReviewDueAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ThirdPartyRiskDashboard>("/api/admin/third-party-risk", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load third-party risk dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Processors", value: dashboard?.metrics?.total ?? 0 },
      { label: "Approved", value: dashboard?.metrics?.approvedCount ?? 0 },
      { label: "Overdue reviews", value: dashboard?.metrics?.overdueReviews ?? 0 },
      { label: "Cross-border flags", value: dashboard?.metrics?.crossBorderFlags ?? 0 },
    ],
    [dashboard],
  );

  const createEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/third-party-risk", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          nextReviewDueAt: form.nextReviewDueAt ? new Date(form.nextReviewDueAt).toISOString() : null,
        }),
      });
      setSuccess("Third-party processor saved.");
      setForm({
        processorName: "",
        serviceType: "analytics",
        hostingRegion: "saudi-arabia-riyadh",
        residencyScope: "KSA_ONLY",
        riskTier: "medium",
        status: "PENDING_REVIEW",
        crossBorderTransfer: false,
        contractInPlace: false,
        securityReviewCompleted: false,
        containsPatientData: true,
        transferMechanism: "",
        ownerName: "",
        nextReviewDueAt: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save processor record.");
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const updateStatus = useCallback(async (item: ThirdPartyRiskItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/third-party-risk", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          status,
          notes: item.notes,
          nextReviewDueAt: item.nextReviewDueAt,
        }),
      });
      setSuccess(`Processor marked as ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update processor status.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  return (
    <AuthGuard>
      <AppShell
        title="Third-Party Risk"
        subtitle="Phase 7 workspace for processor due diligence, cross-border review, and PDPL transfer safeguards."
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
              <CardTitle>Register or review a processor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="third_party_risk_register"
                description="Verify the privileged session before approving processors or cross-border transfer safeguards."
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Processor name" value={form.processorName} onChange={(event) => setForm((current) => ({ ...current, processorName: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Service type" value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Hosting region" value={form.hostingRegion} onChange={(event) => setForm((current) => ({ ...current, hostingRegion: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder="Owner / accountable team" value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label="Risk tier" title="Risk tier" className="rounded-xl border border-slate-200 px-3 py-2" value={form.riskTier} onChange={(event) => setForm((current) => ({ ...current, riskTier: event.target.value }))}>
                  <option value="low">Low risk</option>
                  <option value="medium">Medium risk</option>
                  <option value="high">High risk</option>
                  <option value="critical">Critical risk</option>
                </select>
                <select aria-label="Residency scope" title="Residency scope" className="rounded-xl border border-slate-200 px-3 py-2" value={form.residencyScope} onChange={(event) => setForm((current) => ({ ...current, residencyScope: event.target.value }))}>
                  <option value="KSA_ONLY">KSA only</option>
                  <option value="CONTROLLED_EXPORT">Controlled export</option>
                  <option value="GLOBAL_NON_PERSONAL">Global non-personal</option>
                </select>
                <input className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Transfer mechanism (required if approved + cross-border)" value={form.transferMechanism} onChange={(event) => setForm((current) => ({ ...current, transferMechanism: event.target.value }))} />
                <input aria-label="Next review due date" title="Next review due date" className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" type="date" value={form.nextReviewDueAt} onChange={(event) => setForm((current) => ({ ...current, nextReviewDueAt: event.target.value }))} />
                <textarea className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.crossBorderTransfer} onChange={(event) => setForm((current) => ({ ...current, crossBorderTransfer: event.target.checked }))} />
                  Cross-border transfer
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.contractInPlace} onChange={(event) => setForm((current) => ({ ...current, contractInPlace: event.target.checked }))} />
                  Contract / DPA in place
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.securityReviewCompleted} onChange={(event) => setForm((current) => ({ ...current, securityReviewCompleted: event.target.checked }))} />
                  Security review completed
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.containsPatientData} onChange={(event) => setForm((current) => ({ ...current, containsPatientData: event.target.checked }))} />
                  Contains patient data
                </label>
              </div>

              <Button onClick={() => void createEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> Save processor
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current attention queue</CardTitle>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No third-party governance issues are currently open.</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <Globe2 className="mr-2 inline h-4 w-4 text-cyan-700" />
                Track Saudi residency scope, cross-border approvals, and overdue vendor reviews in one place.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Processor register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.processorName}</div>
                    <div className="text-slate-500">{item.serviceType} · {item.hostingRegion} · Owner: {item.ownerName || "unassigned"}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={riskVariant(item.riskTier)}>{item.riskTier}</Badge>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                    <Badge variant={item.crossBorderTransfer ? "warning" : "success"}>{item.crossBorderTransfer ? "cross-border" : "ksa-only"}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  DPA: {item.contractInPlace ? "in place" : "missing"} · Security review: {item.securityReviewCompleted ? "completed" : "pending"} · Next review: {item.nextReviewDueAt ? new Date(item.nextReviewDueAt).toLocaleDateString() : "not scheduled"}
                </div>
                <div className="mt-2 text-slate-500">{item.transferMechanism || "No transfer mechanism recorded."}</div>
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "APPROVED")} disabled={busyId === `${item.id}:APPROVED`}>
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "RESTRICTED")} disabled={busyId === `${item.id}:RESTRICTED`}>
                    Restrict
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No processors registered yet.</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
