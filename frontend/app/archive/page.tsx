"use client";

import { FormEvent, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type ArchiveRow = {
  id: string;
  patientId?: string | null;
  caseId?: string | null;
  formTitle?: string | null;
  archiveStatus: string;
  legalDocumentFlag: boolean;
  pdfAttachmentId?: string | null;
};

export default function ArchivePage() {
  const enabled = isGovernanceModuleEnabledClient();
  const [query, setQuery] = useState({ patientId: "", caseId: "", formType: "", status: "", legal: false });
  const [rows, setRows] = useState<ArchiveRow[]>([]);

  async function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.patientId) params.set("patientId", query.patientId);
    if (query.caseId) params.set("caseId", query.caseId);
    if (query.formType) params.set("formType", query.formType);
    if (query.status) params.set("status", query.status);
    if (query.legal) params.set("legal", "true");

    const data = await apiFetch<ArchiveRow[]>(`/api/v1/archive?${params.toString()}`);
    setRows(data);
  }

  return (
    <AuthGuard>
      <AppShell title="Archive" subtitle="IMC-style indexing and retrieval">
        {!enabled ? <GovernanceDisabledNotice /> : null}

        {enabled ? (
          <>
            <form onSubmit={search} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="patient" value={query.patientId} onChange={(e) => setQuery({ ...query, patientId: e.target.value })} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="case" value={query.caseId} onChange={(e) => setQuery({ ...query, caseId: e.target.value })} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="form type" value={query.formType} onChange={(e) => setQuery({ ...query, formType: e.target.value })} />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="status" value={query.status} onChange={(e) => setQuery({ ...query, status: e.target.value })} />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={query.legal} onChange={(e) => setQuery({ ...query, legal: e.target.checked })} /> legal document flag</label>
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" type="submit">Search</button>
            </form>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Patient</th>
                    <th className="px-3 py-2 text-left">Case</th>
                    <th className="px-3 py-2 text-left">Form</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{row.patientId ?? "-"}</td>
                      <td className="px-3 py-2">{row.caseId ?? "-"}</td>
                      <td className="px-3 py-2">{row.formTitle ?? "-"}</td>
                      <td className="px-3 py-2">{row.archiveStatus}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded-lg border border-slate-300 px-2 py-1">Open PDF</button>
                          <button type="button" className="rounded-lg border border-slate-300 px-2 py-1">Verify Index</button>
                          <button type="button" className="rounded-lg border border-slate-300 px-2 py-1">Re-index</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
