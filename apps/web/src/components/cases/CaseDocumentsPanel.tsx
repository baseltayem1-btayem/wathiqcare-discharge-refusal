"use client";

import WorkflowDocumentList from "@/components/workflow/WorkflowDocumentList";
import type { WorkflowDocumentItem } from "@/types/dischargeWorkflow";

type CaseDocumentsPanelProps = {
  documents: WorkflowDocumentItem[];
};

export default function CaseDocumentsPanel({ documents }: CaseDocumentsPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <WorkflowDocumentList documents={documents} />
    </section>
  );
}
