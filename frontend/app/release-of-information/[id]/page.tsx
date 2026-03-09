"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type RoiRecord = Record<string, unknown>;

export default function RoiDetailsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<RoiRecord | null>(null);

  async function load() {
    if (!enabled || !params.id) return;
    const data = await apiFetch<RoiRecord>(`/api/v1/roi/${params.id}`);
    setRecord(data);
  }

  useEffect(() => {
    void load();
  }, [enabled, params.id]);

  async function action(name: string) {
    await apiFetch(`/api/v1/roi/${params.id}`, {
      method: "POST",
      body: JSON.stringify({ action: name }),
    });
    await load();
  }

  return (
    <AuthGuard>
      <AppShell title="ROI Request Detail" subtitle="Identity verification, approval and release package flow">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled && record ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(record, null, 2)}</pre>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void action("verify-identity")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Verify Identity</button>
              <button type="button" onClick={() => void action("approve")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Approve</button>
              <button type="button" onClick={() => void action("release")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Release Documents</button>
              <button type="button" onClick={() => void action("archive")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Archive</button>
              <button type="button" onClick={() => void action("reject")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Reject</button>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
