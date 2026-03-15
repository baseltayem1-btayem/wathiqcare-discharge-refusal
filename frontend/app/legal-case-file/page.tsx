"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FolderArchive } from "lucide-react";
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
  signer_name?: string | null;
  signer_role?: string | null;
  signed_at?: string | null;
  pdf_file?: string | null;
  _count?: {
    documents?: number;
    auditLogs?: number;
  };
};

export default function LegalCaseFilePage() {
  const [cases, setCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=100")
      .then((data) => setCases(Array.isArray(data) ? data : []))
      .catch(() => setCases([]));
  }, []);

  const rows = useMemo(
    () =>
      cases.map((item) => ({
        item,
        workflow: buildMetadataWorkflowProgress({
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
        }),
      })),
    [cases]
  );

  return (
    <AuthGuard>
      <AppShell
        title="Legal Case File"
        subtitle="Review documentation coverage and jump to evidence bundle generation for each case."
        actions={
          <Link
            href="/bundles"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <FolderArchive className="h-4 w-4" />
            Open Evidence Bundles
          </Link>
        }
      >
        <div className="space-y-3">
          {rows.map(({ item, workflow }) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">{item.caseNumber || item.id}</h2>
                  <p className="mt-1 text-sm text-slate-600">Patient: {item.patientName || "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Status: {item.status || "-"} | Documents: {item._count?.documents || 0} | Audit logs: {item._count?.auditLogs || 0}
                  </p>
                  {workflow.steps.length > 0 ? (
                    <WorkflowProgress
                      className="mt-3 border-0 bg-transparent p-0"
                      layout="scroll"
                      steps={workflow.steps}
                      language="en"
                      direction="ltr"
                      currentStepId={workflow.currentStepId}
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/cases/${item.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open Case
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/bundles"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Bundles
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {cases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No legal case files are available yet.
            </div>
          ) : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
