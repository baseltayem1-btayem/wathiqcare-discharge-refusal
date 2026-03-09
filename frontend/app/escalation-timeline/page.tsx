"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

function readString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  if (!metadata) {
    return "";
  }
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

export default function EscalationTimelinePage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=200")
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return cases.map((item) => {
      const decisionAt = readString(item.metadata, "discharge_decision_at");
      const parsedDecision = decisionAt ? new Date(decisionAt) : null;
      const escalationDueAt =
        parsedDecision && !Number.isNaN(parsedDecision.getTime())
          ? new Date(parsedDecision.getTime() + 24 * 60 * 60 * 1000)
          : null;
      const overdue = (item.status || "").toUpperCase() === "IN_PROGRESS";

      return {
        id: item.id,
        caseNumber: item.caseNumber || item.id,
        patientName: item.patientName || "-",
        status: item.status || "-",
        decisionAt: decisionAt || "-",
        escalationDueAt: escalationDueAt ? escalationDueAt.toLocaleString() : "-",
        overdue,
      };
    });
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title="Escalation Timeline"
        subtitle="Operational watchlist for refusal cases approaching legal escalation deadlines."
      >
        {loading ? <p className="text-sm text-slate-600">Loading timeline...</p> : null}

        {!loading ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Case</th>
                  <th className="px-3 py-2 text-left">Patient</th>
                  <th className="px-3 py-2 text-left">Decision At</th>
                  <th className="px-3 py-2 text-left">Escalation Due</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.caseNumber}</td>
                    <td className="px-3 py-2">{item.patientName}</td>
                    <td className="px-3 py-2">{item.decisionAt}</td>
                    <td className="px-3 py-2">
                      <span className={item.overdue ? "font-semibold text-rose-700" : "text-slate-700"}>
                        {item.escalationDueAt}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/cases/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open Case
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                      No cases found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
