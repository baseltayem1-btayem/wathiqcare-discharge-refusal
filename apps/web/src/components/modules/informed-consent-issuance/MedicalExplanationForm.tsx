"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type MedicalExplanationState } from "./types";

type MedicalExplanationFormProps = {
  value: MedicalExplanationState;
  onChange: (next: MedicalExplanationState) => void;
  collapsed: boolean;
  onToggle: () => void;
};

type FieldKey = Exclude<keyof MedicalExplanationState, "physicianConfirmed">;

const FIELDS: Array<{ key: FieldKey; label: string; placeholder: string }> = [
  { key: "procedureDescription", label: "Procedure / Treatment Description", placeholder: "Describe the treatment or procedure..." },
  { key: "diagnosisReason", label: "Diagnosis / Medical Reason", placeholder: "Describe diagnosis and indication..." },
  { key: "expectedBenefits", label: "Expected Benefits", placeholder: "Document expected benefits..." },
  { key: "materialRisks", label: "Material Risks", placeholder: "Document major and material risks..." },
  { key: "alternativesExplained", label: "Alternatives Explained", placeholder: "Document alternatives discussed..." },
  { key: "refusalConsequences", label: "Consequences of Refusal", placeholder: "Document refusal consequences..." },
  { key: "patientQuestions", label: "Patient Questions", placeholder: "Capture questions and responses..." },
];

export default function MedicalExplanationForm({ value, onChange, collapsed, onToggle }: MedicalExplanationFormProps) {
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
