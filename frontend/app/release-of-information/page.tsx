"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type RoiRow = {
  id: string;
  patientId: string;
  requesterName: string;
  status: string;
  createdAt: string;
};

export default function RoiPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const [rows, setRows] = useState<RoiRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiFetch<RoiRow[]>("/api/v1/roi").then(setRows);
  }, [enabled]);

  return (
    <AuthGuard>
      <AppShell
        title="Release of Information"
        subtitle="Controlled disclosure workflow"
        actions={<Link href="/release-of-information/new" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">New Request</Link>}
      >
        {!enabled ? <GovernanceDisabledNotice /> : null}

        {enabled ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Requester</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{row.requesterName}</td>
                    <td className="px-3 py-2">{row.patientId}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => void apiFetch(`/api/v1/roi/${row.id}`, { method: "POST", body: JSON.stringify({ action: "verify-identity" }) }).then(() => apiFetch<RoiRow[]>("/api/v1/roi").then(setRows))} className="rounded-lg border border-slate-300 px-2 py-1">Verify Identity</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
