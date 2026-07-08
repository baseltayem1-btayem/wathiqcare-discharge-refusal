"use client";

import { FileText, Eye, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/design-system";
import type { Patient, Encounter, Procedure, MockClinicalKnowledgeAssembly } from "../types/workspace";

interface DraftPreviewPanelProps {
  patient?: Patient;
  encounter?: Encounter;
  procedure?: Procedure;
  assembly?: MockClinicalKnowledgeAssembly;
  educationIncluded: boolean;
  physicianNotes: string;
  onNotesChange: (notes: string) => void;
}

export function DraftPreviewPanel({
  patient,
  encounter,
  procedure,
  assembly,
  educationIncluded,
  physicianNotes,
  onNotesChange,
}: DraftPreviewPanelProps) {
  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="workspace-card-header">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[var(--wc-blue)]" />
          <CardTitle className="workspace-section-title">4. Draft Preview & Physician Notes</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {!assembly ? (
          <div className="text-sm text-[var(--wc-text-muted)]">Select a procedure to preview the draft consent.</div>
        ) : (
          <>
            <div className="p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] space-y-3">
              <div className="flex items-center gap-2 text-[var(--wc-navy)] font-bold">
                <FileText className="w-5 h-5" />
                <span>{assembly.consentForm?.titleEn}</span>
              </div>
              <div className="text-sm text-[var(--wc-text)]">
                <p className="mb-2">
                  I, <strong>{patient?.name}</strong> (MRN {patient?.mrn}), confirm that I have discussed the proposed
                  procedure, <strong>{procedure?.nameEn}</strong>, with Dr. {encounter?.physician}.
                </p>
                <p className="mb-2">
                  I understand the benefits, material risks including{" "}
                  {assembly.riskDisclosures.map((r) => r.titleEn).join(", ")}, and alternatives.
                </p>
                {educationIncluded && assembly.educationMaterials.length > 0 && (
                  <p className="mb-2">
                    I have been offered the patient education material:{" "}
                    <em>{assembly.educationMaterials.map((e) => e.titleEn).join(", ")}</em>.
                  </p>
                )}
                {assembly.requiredParticipants.length > 0 && (
                  <p className="mb-2">
                    Required participants: <strong>{assembly.requiredParticipants.join(", ")}</strong>.
                  </p>
                )}
                {physicianNotes && (
                  <p className="text-sm italic text-[var(--wc-text-muted)] border-l-2 border-[var(--wc-blue-light)] pl-3 mt-2">
                    Physician notes: {physicianNotes}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)] flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" /> Physician disclosure notes
              </label>
              <Textarea
                value={physicianNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add any procedure-specific explanation (e.g., alternatives discussed, special precautions)..."
                rows={3}
                className="resize-y"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
