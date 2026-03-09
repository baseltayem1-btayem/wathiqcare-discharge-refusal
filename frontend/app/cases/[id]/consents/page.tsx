"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import RequiredConsentsPanel from "@/components/governance/RequiredConsentsPanel";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type ConsentRow = {
  id: string;
  caseId?: string | null;
  status: string;
};

export default function CaseConsentsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<ConsentRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiFetch<ConsentRow[]>("/api/v1/consents").then((all) => setRows(all.filter((item) => item.caseId === params.id)));
  }, [enabled, params.id]);

  return (
    <AuthGuard>
      <AppShell title="Case Consents" subtitle={`Consents linked to case ${params.id}`}>
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="space-y-4">
            <RequiredConsentsPanel requiredConsents={["GENERAL_TREATMENT", "ADMISSION", "SURGERY_INVASIVE"]} />
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <ul className="space-y-2 text-sm">
                {rows.map((row) => (
                  <li key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span>{row.id.slice(0, 8)} - {row.status}</span>
                    <Link href={`/consents/${row.id}`} className="rounded-lg border border-slate-300 px-2 py-1">Open</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
