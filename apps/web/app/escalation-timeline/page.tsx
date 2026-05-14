"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  patient_name?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  signer_name?: string | null;
  signer_role?: string | null;
  signed_at?: string | null;
  pdf_file?: string | null;
};

function readString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  if (!metadata) {
    return "";
  }
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function statusClass(status: string, overdue: boolean): string {
  const normalized = status.toUpperCase();

  if (overdue) {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "CLOSED" || normalized === "COMPLETED") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "IN_PROGRESS") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border border-slate-200 bg-slate-100 text-slate-700";
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
      const workflow = buildMetadataWorkflowProgress({
        caseId: item.id,
        status: item.status,
        patientName: item.patientName,
        patient_name: item.patient_name,
        signer_name: item.signer_name,
        signer_role: item.signer_role,
        signed_at: item.signed_at,
        pdf_file: item.pdf_file,
        metadata: item.metadata,
        clickable: true,
      });
      const currentStep = workflow.steps.find((step) => step.id === workflow.currentStepId);

      return {
        id: item.id,
        caseNumber: item.caseNumber || item.id,
        patientName: item.patientName || item.patient_name || "-",
        status: item.status || "-",
        decisionAt: decisionAt || "-",
        escalationDueAt: escalationDueAt ? escalationDueAt.toLocaleString() : "-",
        overdue,
        workflow,
        currentStep,
      };
    });
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title="Escalation Timeline"
        subtitle="Operational watchlist for refusal cases approaching legal escalation deadlines."
      >
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            <div className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          </div>
        ) : null}

        {!loading && rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No cases found.
          </div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="space-y-4">
            {rows.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Case {item.caseNumber}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">{item.patientName}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status, item.overdue)}`}>
                      {item.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                      {item.status}
                    </span>
                    <Link
                      href={`/cases/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Open Case
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Decision At</p>
                    <p className="mt-1 font-medium text-slate-800">{item.decisionAt}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Escalation Due</p>
                    <p className={item.overdue ? "mt-1 font-semibold text-rose-700" : "mt-1 font-medium text-slate-800"}>{item.escalationDueAt}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Current Stage</p>
                    <p className="mt-1 font-medium text-slate-800">{item.currentStep?.titleEn || item.currentStep?.titleAr || "-"}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {item.workflow.steps.length > 0 ? (
                    <WorkflowProgress
                      className="max-w-full border-0 bg-transparent p-0"
                      layout="scroll"
                      steps={item.workflow.steps}
                      language="en"
                      direction="ltr"
                      currentStepId={item.workflow.currentStepId}
                    />
                  ) : (
                    <span className="text-xs text-slate-500">No saved stages</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
