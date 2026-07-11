"use client";

import { AlertTriangle, ClipboardSignature, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import type { ConsentFieldMappingReadiness } from "../../lib/api";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

interface DoctorCompletionPanelProps {
  mapping?: ConsentFieldMappingReadiness;
  values: Record<string, string>;
  onValueChange: (key: string, value: string) => void;
  disabled?: boolean;
}

function isFieldComplete(type: string, value: string | undefined): boolean {
  if (type === "CHECKBOX") return value === "true" || value === "false";
  return Boolean(value?.trim());
}

export function DoctorCompletionPanel({ mapping, values, onValueChange, disabled }: DoctorCompletionPanelProps) {
  const { lang } = useI18n();
  const doctorFields = mapping?.requiredDoctorFields ?? [];
  const anesthesiaFields = mapping?.requiredAnesthesiaFields ?? [];
  const completedDoctorFields = doctorFields.filter((field) => isFieldComplete(field.type, values[field.key])).length;
  const anesthesiaDecision = values.anesthesia_applies;
  const anesthesiaApplies = anesthesiaDecision === "true";
  const anesthesiaNotApplicable = anesthesiaDecision === "false";

  if (!mapping) {
    return (
      <WorkspaceCard className="overflow-hidden">
        <WorkspaceCardHeader
          icon={<ClipboardSignature className="size-5" />}
          title={lang === "ar" ? "Doctor completion" : "Doctor completion"}
          description="Load a consent form to see physician-required completion fields."
          action={<WorkspaceBadge tone="gold">Not loaded</WorkspaceBadge>}
        />
      </WorkspaceCard>
    );
  }

  return (
    <WorkspaceCard className="overflow-hidden">
      <WorkspaceCardHeader
        icon={<ClipboardSignature className="size-5" />}
        title={lang === "ar" ? "Doctor completion" : "Doctor completion"}
        description="Complete the physician-controlled fields before sending the secure signing link to the patient."
        action={<WorkspaceBadge tone={mapping.verificationStatus === "VERIFIED" ? "green" : "gold"}>{mapping.verificationStatus}</WorkspaceBadge>}
      />

      <div className="space-y-4 px-5 py-5">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-slate-900">Physician fields</span>
            <WorkspaceBadge tone={completedDoctorFields === doctorFields.length && doctorFields.length > 0 ? "green" : "gold"}>
              {completedDoctorFields} / {doctorFields.length}
            </WorkspaceBadge>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            These values will be preserved in the consent document metadata and used later by the PDF overlay engine.
          </p>
        </div>

        {doctorFields.length > 0 ? (
          <div className="space-y-3">
            {doctorFields.map((field) => {
              const value = values[field.key] ?? "";
              const complete = isFieldComplete(field.type, value);

              return (
                <div key={field.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-900" htmlFor={field.key}>
                        {field.labelEn}
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        {field.section ? "Section " + field.section + " · " : ""}{field.type}
                      </p>
                    </div>
                    <WorkspaceBadge tone={complete ? "green" : "gold"}>{complete ? "Complete" : "Required"}</WorkspaceBadge>
                  </div>

                  {field.type === "CHECKBOX" ? (
                    <select
                      id={field.key}
                      value={value}
                      disabled={disabled}
                      onChange={(event) => onValueChange(field.key, event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                    >
                      <option value="">Select applicability</option>
                      <option value="true">Yes / applies</option>
                      <option value="false">No / not applicable</option>
                    </select>
                  ) : (
                    <textarea
                      id={field.key}
                      value={value}
                      disabled={disabled}
                      onChange={(event) => onValueChange(field.key, event.target.value)}
                      placeholder="Enter physician completion value"
                      rows={field.type === "MULTILINE_TEXT" ? 3 : 2}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>No physician-required fields are pending for this mapping snapshot.</span>
          </div>
        )}

        {anesthesiaFields.length > 0 ? (
          <div className={anesthesiaApplies ? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Anesthesia workflow</p>
                <p className="mt-1 text-xs leading-5">
                  {anesthesiaApplies
                    ? "Anesthesia applies. An anesthesiologist review/completion step is required before patient dispatch."
                    : anesthesiaNotApplicable
                      ? "Anesthesia marked as not applicable for this consent."
                      : "Select anesthesia applicability in the physician fields above."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceCard>
  );
}
