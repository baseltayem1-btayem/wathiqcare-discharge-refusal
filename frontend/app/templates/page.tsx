"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { apiFetch } from "@/utils/api";

type TemplateRow = {
  id: string;
  templateName: string;
  templateType: string;
  formNumber?: string | null;
  version: string;
  active: boolean;
};

export default function TemplatesPage() {
  const enabled = isGovernanceModuleEnabledClient();
  const [rows, setRows] = useState<TemplateRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    void apiFetch<TemplateRow[]>("/api/v1/templates").then(setRows);
  }, [enabled]);

  return (
    <AuthGuard>
      <AppShell title="Templates" subtitle="Versioned legal template registry">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Template</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Form #</th>
                  <th className="px-3 py-2 text-left">Version</th>
                  <th className="px-3 py-2 text-left">Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{row.templateName}</td>
                    <td className="px-3 py-2">{row.templateType}</td>
                    <td className="px-3 py-2">{row.formNumber ?? "-"}</td>
                    <td className="px-3 py-2">{row.version}</td>
                    <td className="px-3 py-2">{row.active ? "Yes" : "No"}</td>
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
