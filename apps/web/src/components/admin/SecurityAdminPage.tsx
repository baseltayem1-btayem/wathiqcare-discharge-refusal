"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { apiFetch } from "@/utils/api";

type SecurityDashboard = {
  settings?: {
    mfaRequiredForAdmins?: boolean;
    mfaRequiredForPrivileged?: boolean;
    privilegedStepUpEnabled?: boolean;
    enforceKsaResidency?: boolean;
    exportApprovalRequired?: boolean;
    sessionTimeoutMinutes?: number;
    allowedAnalyticsRegion?: string;
  };
  privilegedRoles?: string[];
  recentPrivilegedAccess?: Array<{
    id: string;
    actionKey: string;
    result: string;
    actorRole?: string | null;
    stepUpVerified?: boolean;
    createdAt?: string;
    reason?: string | null;
  }>;
  recentAuditExports?: Array<{
    id: string;
    reportKey: string;
    exportFormat?: string | null;
    accessedByRole?: string | null;
    accessedAt?: string;
  }>;
  metrics?: {
    privilegedEventCount?: number;
    deniedEventCount?: number;
    auditExportCount?: number;
    mfaRequiredForPrivileged?: boolean;
    privilegedStepUpEnabled?: boolean;
  };
};

function resultVariant(value: string) {
  return value === "denied" ? "warning" as const : "success" as const;
}

export default function SecurityAdminPage() {
  const [dashboard, setDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<SecurityDashboard>("/api/admin/security", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Failed to load security dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: "Privileged events", value: dashboard?.metrics?.privilegedEventCount ?? 0 },
      { label: "Denied events", value: dashboard?.metrics?.deniedEventCount ?? 0 },
      { label: "Audit exports", value: dashboard?.metrics?.auditExportCount ?? 0 },
      { label: "Session timeout", value: dashboard?.settings?.sessionTimeoutMinutes ?? 30 },
    ],
    [dashboard],
  );

  return (
    <AuthGuard>
      <AppShell
        title="Security Controls"
        subtitle="Phase 3 security console for step-up posture, privileged actions, and evidence access review."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      >
        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

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
              <CardTitle>Security policy posture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={dashboard?.settings?.mfaRequiredForPrivileged ? 'success' : 'warning'}>MFA for privileged: {dashboard?.settings?.mfaRequiredForPrivileged ? 'required' : 'off'}</Badge>
                <Badge variant={dashboard?.settings?.privilegedStepUpEnabled ? 'success' : 'warning'}>Step-up: {dashboard?.settings?.privilegedStepUpEnabled ? 'enabled' : 'disabled'}</Badge>
                <Badge variant={dashboard?.settings?.enforceKsaResidency ? 'success' : 'warning'}>KSA residency: {dashboard?.settings?.enforceKsaResidency ? 'enforced' : 'review'}</Badge>
                <Badge variant={dashboard?.settings?.exportApprovalRequired ? 'success' : 'outline'}>Export approval: {dashboard?.settings?.exportApprovalRequired ? 'required' : 'not required'}</Badge>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                <ShieldCheck className="mr-2 inline h-4 w-4" /> Allowed analytics region: {dashboard?.settings?.allowedAnalyticsRegion || 'saudi-arabia-riyadh'}
              </div>
              <div className="text-slate-600">Privileged roles: {(dashboard?.privilegedRoles ?? []).join(', ') || 'No roles configured'}</div>
              <StepUpVerificationPanel
                actionKey="security_console_review"
                description="Use the live step-up flow here to validate the privileged session needed for sensitive exports and administration."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent privileged access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(dashboard?.recentPrivilegedAccess ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.actionKey}</span>
                    <Badge variant={resultVariant(item.result)}>{item.result}</Badge>
                  </div>
                  <div className="text-slate-500">Role: {item.actorRole || 'system'} · Step-up: {item.stepUpVerified ? 'verified' : 'missing'}</div>
                  <div className="text-slate-400">{item.reason || 'No reason recorded.'}</div>
                </div>
              ))}
              {(dashboard?.recentPrivilegedAccess ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No privileged access events recorded yet.</div> : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit export activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(dashboard?.recentAuditExports ?? []).slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-800">{item.reportKey}</span>
                  <Badge variant="outline">{item.exportFormat || 'view'}</Badge>
                </div>
                <div className="text-slate-500">Role: {item.accessedByRole || 'unknown'} · {item.accessedAt ? new Date(item.accessedAt).toLocaleString() : 'No timestamp'}</div>
              </div>
            ))}
            {(dashboard?.recentAuditExports ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">No report or evidence access events have been captured yet.</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
