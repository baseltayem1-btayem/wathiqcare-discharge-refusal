"use client";

import type { ReactNode } from "react";
import type { DischargeWorkflow, WorkflowDocumentItem } from "@/types/dischargeWorkflow";
import CaseDocumentsPanel from "@/components/cases/CaseDocumentsPanel";
import DischargeRefusalStatusBadge from "@/components/workflows/DischargeRefusalStatusBadge";
import DischargeRefusalTimeline from "@/components/workflows/DischargeRefusalTimeline";
import EscalationAlert from "@/components/workflows/EscalationAlert";
import WorkflowAuditTrail from "@/components/workflows/WorkflowAuditTrail";

type AuditItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
};

type DischargeRefusalWorkflowPanelProps = {
  caseId: string;
  workflow: DischargeWorkflow | null;
  documents: WorkflowDocumentItem[];
  auditTrail: AuditItem[];
  actionBar?: ReactNode;
};

export default function DischargeRefusalWorkflowPanel({
  caseId,
  workflow,
  documents,
  auditTrail,
  actionBar,
}: DischargeRefusalWorkflowPanelProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-slate-900">سير عمل رفض الخروج</h3>
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-slate-500">معرّف الحالة: {caseId}</span>
          <DischargeRefusalStatusBadge status={workflow?.status} />
        </div>
      </div>

      <EscalationAlert
        escalationRequired={Boolean(workflow?.escalation_required)}
        escalationDueAt={workflow?.escalation_due_at}
      />

      {actionBar || null}

      <DischargeRefusalTimeline workflow={workflow} />
      <WorkflowAuditTrail items={auditTrail} />
      <CaseDocumentsPanel documents={documents} />
    </section>
  );
}
