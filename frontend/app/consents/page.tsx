"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type ConsentRow = {
  id: string;
  patientId: string;
  caseId?: string | null;
  status: string;
  signerName?: string | null;
  signatureMethod?: string | null;
  createdAt: string;
};

export default function ConsentsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const [rows, setRows] = useState<ConsentRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiFetch<ConsentRow[]>("/api/v1/consents").then(setRows);
  }, [enabled]);

  return (
    <AuthGuard>
      <AppShell
        title="Consents"
        subtitle="Case-linked consent lifecycle"
        actions={<Link href="/consents/new" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">New Consent</Link>}
      >
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Case</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Signature</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{row.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">{row.patientId}</td>
                    <td className="px-3 py-2">{row.caseId ?? "-"}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.signatureMethod ?? "-"}</td>
                    <td className="px-3 py-2"><Link href={`/consents/${row.id}`} className="rounded-lg border border-slate-300 px-2 py-1">View</Link></td>
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
