"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import AccessDenied from "@/components/AccessDenied";
import { isAdministrator, toShortSha } from "@/lib/release-governance";
import { apiFetch } from "@/utils/api";

type MeResponse = {
  userType?: string | null;
  platformRole?: string | null;
  user?: {
    role?: string | null;
  } | null;
};

type ReleaseSnapshot = {
  version: string;
  environment: string;
  buildDate: string;
  commitSha: string;
  currentBranch: string;
  deploymentDate: string;
  databaseIdentifier: string;
  lastSuccessfulRelease: string;
  rollbackTarget: string;
  productionSource: string;
};

type ReleaseResponse = {
  data?: ReleaseSnapshot;
};

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 break-all text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function ReleaseDashboardPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<ReleaseSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await apiFetch<MeResponse>("/api/auth/me", {
          cache: "no-store",
          authFailureMode: "inline",
        });

        const allowed = isAdministrator({
          userType: me?.userType,
          platformRole: me?.platformRole,
          role: me?.user?.role,
        });

        if (!allowed) {
          if (!cancelled) {
            setAuthorized(false);
          }
          return;
        }

        const release = await apiFetch<ReleaseResponse>("/api/admin/release-governance/summary", {
          cache: "no-store",
          authFailureMode: "inline",
        });

        if (!cancelled) {
          setSnapshot(release?.data ?? null);
          setAuthorized(true);
        }
      } catch {
        if (!cancelled) {
          setAuthorized(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authorized === false) {
    return <AccessDenied title="Access denied" message="Administrator permissions are required for release governance." />;
  }

  return (
    <AuthGuard>
      <AppShell title="Release Dashboard" subtitle="Authoritative production release metadata and rollback controls">
        {authorized === null ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading release governance status...</div>
        ) : null}

        {authorized && snapshot ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
              Production source is enforced as <strong>{snapshot.productionSource}</strong>. Current branch: <strong>{snapshot.currentBranch}</strong>.
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailCard label="Current Production Version" value={snapshot.version} />
              <DetailCard label="Current Commit" value={`${snapshot.commitSha} (${toShortSha(snapshot.commitSha)})`} />
              <DetailCard label="Current Environment" value={snapshot.environment} />
              <DetailCard label="Current Deployment Date" value={snapshot.deploymentDate} />
              <DetailCard label="Current Database Identifier" value={snapshot.databaseIdentifier} />
              <DetailCard label="Last Successful Release" value={snapshot.lastSuccessfulRelease} />
              <DetailCard label="Rollback Target" value={snapshot.rollbackTarget} />
              <DetailCard label="Build Date" value={snapshot.buildDate} />
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
