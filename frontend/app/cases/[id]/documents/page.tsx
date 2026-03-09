"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type ArchiveRow = {
  id: string;
  formTitle?: string | null;
  archiveStatus: string;
  pdfAttachmentId?: string | null;
};

export default function CaseDocumentsPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<ArchiveRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiFetch<ArchiveRow[]>(`/api/v1/archive?caseId=${params.id}`).then(setRows);
  }, [enabled, params.id]);

  return (
    <AuthGuard>
      <AppShell title="Case Documents" subtitle={`Archive documents for case ${params.id}`}>
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <ul className="space-y-2 text-sm">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span>{row.formTitle ?? "Document"} ({row.archiveStatus})</span>
                  <button type="button" className="rounded-lg border border-slate-300 px-2 py-1">Open PDF</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
