"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type MedicalExplanationState } from "./types";

type MedicalExplanationFormProps = {
  aiDraftAvailable?: boolean;
  aiDraftError?: string;
  aiDraftPending?: boolean;
  onApproveAiDraft?: () => void;
  value: MedicalExplanationState;
  onChange: (next: MedicalExplanationState) => void;
  collapsed: boolean;
  onGenerateAiDraft?: () => void;
  onRejectAiDraft?: () => void;
  onToggle: () => void;
};

type FieldKey = Exclude<keyof MedicalExplanationState, "physicianConfirmed">;

const FIELDS: Array<{ key: FieldKey; label: string; placeholder: string }> = [
  { key: "procedureDescription", label: "Procedure / Treatment Description", placeholder: "Describe the treatment or procedure..." },
  { key: "diagnosisReason", label: "Diagnosis / Medical Reason", placeholder: "Describe diagnosis and indication..." },
  { key: "expectedBenefits", label: "Expected Benefits", placeholder: "Document expected benefits..." },
  { key: "materialRisks", label: "Material Risks", placeholder: "Document major and material risks..." },
  { key: "alternativesExplained", label: "Alternatives Explained", placeholder: "Document alternatives discussed..." },
  { key: "postProcedureInstructions", label: "Post-Procedure Instructions", placeholder: "Document post-procedure instructions..." },
  { key: "patientEducationSummary", label: "Patient Education Summary", placeholder: "Document patient education summary..." },
  { key: "refusalConsequences", label: "Consequences of Refusal", placeholder: "Document refusal consequences..." },
  { key: "patientQuestions", label: "Patient Questions", placeholder: "Capture questions and responses..." },
];

export default function MedicalExplanationForm({
  aiDraftAvailable = false,
  aiDraftError,
  aiDraftPending = false,
  onApproveAiDraft,
  value,
  onChange,
  collapsed,
  onGenerateAiDraft,
  onRejectAiDraft,
  onToggle,
}: MedicalExplanationFormProps) {
  return (
    <section className="wc-panel border-slate-200 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 text-start">
        <div>
          <h2 className="wc-panel-heading !mb-0">الشرح الطبي | Medical Explanation</h2>
          <p className="text-[11px] text-slate-500">Structured physician explanation for legal defensibility.</p>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
      </button>

      {!collapsed ? (
        <div className="mt-3 space-y-3">
          {aiDraftAvailable ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">AI-assisted draft — physician review required</p>
                  <p className="mt-1 text-[11px]">{value.aiDraftDisclaimer}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="toolbar-btn toolbar-btn-secondary" onClick={onGenerateAiDraft} disabled={aiDraftPending}>
                    {aiDraftPending ? "Generating..." : "Generate AI Draft"}
                  </button>
                  <button type="button" className="toolbar-btn toolbar-btn-secondary" onClick={onApproveAiDraft} disabled={value.aiDraftStatus !== "pending-physician-review"}>
                    Approve AI Draft
                  </button>
                  <button type="button" className="toolbar-btn toolbar-btn-danger" onClick={onRejectAiDraft} disabled={value.aiDraftStatus !== "pending-physician-review"}>
                    Reject AI Draft
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px]">Current AI draft status: {value.aiDraftStatus}</p>
              {aiDraftError ? <p className="mt-2 text-[11px] text-red-700">{aiDraftError}</p> : null}
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.key} className="wc-form-field">
                <span className="wc-form-label">{field.label}</span>
                <textarea
                  className="wc-form-textarea"
                  value={value[field.key]}
                  onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
                  placeholder={field.placeholder}
                />
              </label>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={value.physicianConfirmed}
              onChange={(event) => onChange({ ...value, physicianConfirmed: event.target.checked })}
              className="h-4 w-4"
            />
            Physician confirms risks, benefits, alternatives, and patient questions were addressed.
          </label>
        </div>
      ) : null}
    </section>
  );
}
