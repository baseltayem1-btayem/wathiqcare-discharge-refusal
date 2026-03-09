"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { apiFetch } from "@/utils/api";

type SubscriptionContext = {
  tenantId: string;
  plan: string;
  status: string;
  user_limit: number;
  case_limit: number;
  signature_quota: number;
};

export default function PlatformAdminPage() {
  const [context, setContext] = useState<SubscriptionContext | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ ok: boolean; context: SubscriptionContext }>("/api/platform/v1/subscription/context")
      .then((response) => setContext(response.context))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load platform context"));
  }, []);

  return (
    <AuthGuard>
      <AppShell title="Platform Admin" subtitle="Production SaaS module layer controls and readiness">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Tenant Management</h3>
            <p className="mt-2 text-sm text-slate-600">Tenant lifecycle remains managed by existing SaaS admin endpoints.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Subscription Management</h3>
            <p className="mt-2 text-sm text-slate-600">Active plan context and limits are enforced by platform middleware.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Usage Monitoring</h3>
            <p className="mt-2 text-sm text-slate-600">Document, case and signature quotas are available in subscription context.</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Plan Configuration Snapshot</h3>
          {context ? (
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div><dt className="text-slate-500">Tenant</dt><dd className="font-medium">{context.tenantId}</dd></div>
              <div><dt className="text-slate-500">Plan</dt><dd className="font-medium">{context.plan}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{context.status}</dd></div>
              <div><dt className="text-slate-500">User Limit</dt><dd className="font-medium">{context.user_limit}</dd></div>
              <div><dt className="text-slate-500">Case Limit</dt><dd className="font-medium">{context.case_limit}</dd></div>
              <div><dt className="text-slate-500">Signature Quota</dt><dd className="font-medium">{context.signature_quota}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Loading plan configuration...</p>
          )}
        </section>
      </AppShell>
    </AuthGuard>
  );
}
