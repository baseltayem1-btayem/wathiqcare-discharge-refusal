"use client";

import { AlertTriangle, ClipboardSignature, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";
import type { ConsentFieldMappingReadiness } from "../../lib/api";
import { analyzeDoctorReadiness } from "../../doctorReadiness";
import {
  evaluateAnesthesiaGate,
  NOT_APPLICABLE_REASON_KEY,
} from "../../utils/anesthesiaGate";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

interface DoctorCompletionPanelProps {
  mapping?: ConsentFieldMappingReadiness;
  values: Record<string, string>;
  physicianSignatureDataUrl: string;
  onValueChange: (key: string, value: string) => void;
  onPhysicianSignatureChange: (signatureDataUrl: string) => void;
  disabled?: boolean;
}

export function DoctorCompletionPanel({
  mapping,
  values,
  physicianSignatureDataUrl,
  onValueChange,
  onPhysicianSignatureChange,
  disabled,
}: DoctorCompletionPanelProps) {
  const { lang } = useI18n();
  const doctorFields = mapping?.requiredDoctorFields ?? [];
  const anesthesiaFields = mapping?.requiredAnesthesiaFields ?? [];

  const doctorReadinessReport =
    analyzeDoctorReadiness({
      fields: doctorFields,
      values,
      physicianSignatureDataUrl,
    });

  const completedDoctorFields =
    doctorReadinessReport.completedCount;
  const anesthesiaGate = evaluateAnesthesiaGate({
    requiredAnesthesiaFields: anesthesiaFields,
    doctorCompletionValues: values,
  });
  const hasAnesthesiaAppliesField = doctorFields.some(
    (field) => field.key === "anesthesia_applies",
  );
  const anesthesiaDecision = values.anesthesia_applies;
  const anesthesiaApplies = anesthesiaGate.applies;
  const anesthesiaNotApplicable = anesthesiaGate.notApplicable;

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
            Clinical values are preserved in the document metadata. The treating physician signature is stored separately as authenticated signature evidence.
          </p>
        </div>

        {doctorFields.length > 0 ? (
          <div className="space-y-3">
            {doctorFields.map((field) => {
              const value = values[field.key] ?? "";
              const complete =
                doctorReadinessReport.fields
                  .find(
                    (candidate) =>
                      candidate.key === field.key,
                  )
                  ?.complete
                ?? false;

              return (
                <div
                  key={field.key}
                  id={"doctor-field-" + field.key}
                  data-doctor-field={field.key}
                  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-900" htmlFor={field.key}>
                        {field.labelEn}
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        {field.section ? "Section " + field.section + " Â· " : ""}{field.type}
                      </p>
                    </div>
                    <WorkspaceBadge tone={complete ? "green" : "gold"}>{complete ? "Complete" : "Required"}</WorkspaceBadge>
                  </div>

                  {field.type === "SIGNATURE" ? (
                    <TabletSignaturePad
                      value={physicianSignatureDataUrl}
                      onChange={onPhysicianSignatureChange}
                      disabled={disabled}
                    />
                  ) : field.type === "CHECKBOX" ? (
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
          <div className={anesthesiaApplies ? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" : anesthesiaNotApplicable ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Anesthesia workflow</p>
                <p className="mt-1 text-xs leading-5">
                  {anesthesiaGate.status === "applicable_incomplete"
                    ? "Anesthesia review required: complete the anesthesia fields below before patient dispatch."
                    : anesthesiaGate.status === "applicable_complete"
                      ? "Anesthesia review completed."
                      : anesthesiaGate.status === "not_applicable"
                        ? "Anesthesia marked not applicable."
                        : anesthesiaGate.status === "not_applicable_missing_reason"
                          ? "Anesthesia marked not applicable — provide the reason below."
                          : "Confirm whether anesthesia applies to this procedure."}
                </p>

                {!hasAnesthesiaAppliesField ? (
                  <select
                    aria-label="Anesthesia applicability"
                    value={anesthesiaDecision ?? ""}
                    disabled={disabled}
                    onChange={(event) => onValueChange("anesthesia_applies", event.target.value)}
                    className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="">Select anesthesia applicability</option>
                    <option value="true">Yes — anesthesia applies</option>
                    <option value="false">No — not applicable</option>
                  </select>
                ) : null}

                {anesthesiaApplies ? (
                  <div className="mt-3 space-y-3">
                    {anesthesiaGate.effectiveFields.map((field) => {
                      const value = values[field.key] ?? "";
                      const complete = value.trim().length > 0;
                      return (
                        <div key={field.key} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <label className="text-xs font-semibold text-slate-900" htmlFor={field.key}>
                              {field.labelEn}
                            </label>
                            <WorkspaceBadge tone={complete ? "green" : "gold"}>{complete ? "Complete" : "Required"}</WorkspaceBadge>
                          </div>
                          <textarea
                            id={field.key}
                            value={value}
                            disabled={disabled}
                            onChange={(event) => onValueChange(field.key, event.target.value)}
                            placeholder="Document the anesthesia review"
                            rows={3}
                            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {anesthesiaNotApplicable ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <label className="text-xs font-semibold text-slate-900" htmlFor={NOT_APPLICABLE_REASON_KEY}>
                      Reason anesthesia is not applicable
                    </label>
                    <textarea
                      id={NOT_APPLICABLE_REASON_KEY}
                      value={values[NOT_APPLICABLE_REASON_KEY] ?? ""}
                      disabled={disabled}
                      onChange={(event) => onValueChange(NOT_APPLICABLE_REASON_KEY, event.target.value)}
                      placeholder="Document why anesthesia does not apply to this consent."
                      rows={2}
                      className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </WorkspaceCard>
  );
}
