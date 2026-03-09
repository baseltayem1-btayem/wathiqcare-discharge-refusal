"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
};

type AuditItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
};

export default function AuditLogPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAuditLogs = useCallback(async (caseId: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<AuditItem[]>(`/api/discharge/audit/${encodeURIComponent(caseId)}`);
      setAuditItems(Array.isArray(data) ? data : []);
    } catch {
      setAuditItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=100")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCases(list);
        if (list.length > 0) {
          setSelectedCaseId(list[0].id);
        }
      })
      .catch(() => setCases([]));
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      return;
    }

    void loadAuditLogs(selectedCaseId);
  }, [loadAuditLogs, selectedCaseId]);

  return (
    <AuthGuard>
      <AppShell
        title="Audit Log Viewer"
        subtitle="Review case-level audit events captured by the discharge refusal workflow."
        actions={
          <button
            type="button"
            onClick={() => {
              if (!selectedCaseId) {
                return;
              }
              void loadAuditLogs(selectedCaseId);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Case</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedCaseId}
            onChange={(event) => setSelectedCaseId(event.target.value)}
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.caseNumber || item.id) + " - " + (item.patientName || "-")}
              </option>
            ))}
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-600">Loading audit records...</p> : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Details</th>
                <th className="px-3 py-2 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {auditItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-900">{item.action}</td>
                  <td className="px-3 py-2 text-slate-700">{item.details || "-"}</td>
                  <td className="px-3 py-2 text-slate-700">{item.created_at || "-"}</td>
                </tr>
              ))}

              {auditItems.length === 0 && !loading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={3}>
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4" />
                      No audit records found for the selected case.
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
