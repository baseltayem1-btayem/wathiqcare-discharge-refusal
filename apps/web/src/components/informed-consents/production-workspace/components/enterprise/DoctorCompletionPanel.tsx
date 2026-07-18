"use client";

import { AlertTriangle, ClipboardSignature, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";
import type { ConsentFieldMappingReadiness } from "../../lib/api";
import { analyzeDoctorReadiness } from "../../doctorReadiness";
import { WorkspaceBadge, WorkspaceCard, WorkspaceCardHeader } from "../WorkspaceAtoms";

interface DoctorCompletionPanelProps {
  mapping?: ConsentFieldMappingReadiness;
  values: Record<string, string>;
  physicianSignatureDataUrl: string;
  onValueChange: (key: string, value: string) => void;
  onPhysicianSignatureChange: (signatureDataUrl: string) => void;
  disabled?: boolean;
  /** Exact current blocker for the Generate Filled Preview action. */
  filledPreviewBlocker?: string | null;
}

const CLINICAL_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  MULTILINE_TEXT: { en: "Doctor statement", ar: "بيان الطبيب" },
  TEXT: { en: "Statement", ar: "بيان" },
  SIGNATURE: { en: "Signature", ar: "توقيع" },
  CHECKBOX: { en: "Decision", ar: "قرار" },
  RADIO: { en: "Selection", ar: "اختيار" },
  INITIALS: { en: "Initials", ar: "المinitials" },
  DATE: { en: "Date", ar: "تاريخ" },
  DATETIME: { en: "Date & time", ar: "التاريخ والوقت" },
};

function clinicalTypeLabel(type: string, lang: "en" | "ar"): string {
  return CLINICAL_TYPE_LABELS[type]?.[lang] ?? type;
}

function isTechnicalTypeLabel(label: string): boolean {
  return Object.keys(CLINICAL_TYPE_LABELS).includes(label);
}

type FieldPair = {
  key: string;
  en?: { key: string; labelEn: string; section?: string; type: string };
  ar?: { key: string; labelEn: string; section?: string; type: string };
  section?: string;
  type: string;
};

function groupFieldsIntoBilingualPairs(
  fields: Array<{ key: string; labelEn: string; section?: string; type: string }>,
): FieldPair[] {
  const pairs = new Map<string, FieldPair>();
  const handled = new Set<string>();

  for (const field of fields) {
    if (handled.has(field.key)) continue;

    const enMatch = field.key.match(/^(.+)_en$/);
    const arMatch = field.key.match(/^(.+)_ar$/);
    const baseKey = enMatch ? enMatch[1] : arMatch ? arMatch[1] : field.key;
    const suffix = enMatch ? "en" : arMatch ? "ar" : null;

    if (!suffix) {
      pairs.set(field.key, { key: field.key, en: field, section: field.section, type: field.type });
      handled.add(field.key);
      continue;
    }

    const counterpartSuffix = suffix === "en" ? "_ar" : "_en";
    const counterpartKey = `${baseKey}${counterpartSuffix}`;
    const counterpart = fields.find((f) => f.key === counterpartKey);

    const existing = pairs.get(baseKey);
    if (existing) {
      existing[suffix] = field;
      handled.add(field.key);
      if (counterpart) handled.add(counterpart.key);
      continue;
    }

    const pair: FieldPair = {
      key: baseKey,
      section: field.section,
      type: field.type,
      [suffix]: field,
    };
    if (counterpart) {
      pair[suffix === "en" ? "ar" : "en"] = counterpart;
      handled.add(counterpart.key);
    }
    pairs.set(baseKey, pair);
    handled.add(field.key);
  }

  return Array.from(pairs.values());
}

export function DoctorCompletionPanel({
  mapping,
  values,
  physicianSignatureDataUrl,
  onValueChange,
  onPhysicianSignatureChange,
  disabled,
  filledPreviewBlocker,
}: DoctorCompletionPanelProps) {
  const { lang } = useI18n();
  const doctorFields = mapping?.requiredDoctorFields ?? [];
  const anesthesiaFields = mapping?.requiredAnesthesiaFields ?? [];

  const doctorReadinessReport = analyzeDoctorReadiness({
    fields: doctorFields,
    values,
    physicianSignatureDataUrl,
  });

  const completedDoctorFields = doctorReadinessReport.completedCount;
  const anesthesiaDecision = values.anesthesia_applies;
  const anesthesiaApplies = anesthesiaDecision === "true";
  const anesthesiaNotApplicable = anesthesiaDecision === "false";

  const pairedFields = groupFieldsIntoBilingualPairs(doctorFields);

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
          <div
            className="flex items-center gap-2 text-xs text-slate-500"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{doctorReadinessReport.missingCount} missing</span>
            <span aria-hidden>·</span>
            <span>{doctorReadinessReport.completedCount} completed</span>
            {doctorReadinessReport.nextRequiredField ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-amber-700">
                  Next: {doctorReadinessReport.nextRequiredField.labelEn}
                </span>
              </>
            ) : null}
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Clinical values are preserved in the document metadata. The treating physician signature is stored separately as authenticated signature evidence.
          </p>
        </div>

        {filledPreviewBlocker ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800"
            role="status"
            aria-live="polite"
          >
            {filledPreviewBlocker}
          </div>
        ) : null}

        {doctorFields.length > 0 ? (
          <div className="space-y-3">
            {pairedFields.map((pair) => {
              const complete =
                (pair.en
                  ? doctorReadinessReport.fields.find((f) => f.key === pair.en!.key)?.complete
                  : undefined) ??
                (pair.ar
                  ? doctorReadinessReport.fields.find((f) => f.key === pair.ar!.key)?.complete
                  : undefined) ??
                false;

              const titleEn = pair.en?.labelEn ?? pair.ar?.labelEn ?? pair.key;
              const titleAr = pair.ar?.labelEn;
              const section = pair.section;
              const typeLabel = clinicalTypeLabel(pair.type, lang as "en" | "ar");

              return (
                <div
                  key={pair.key}
                  id={"doctor-field-" + pair.key}
                  data-doctor-field={pair.key}
                  data-doctor-field-pair="true"
                  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <label className="text-sm font-semibold text-slate-900" htmlFor={pair.en?.key ?? pair.ar?.key ?? pair.key}>
                        {titleEn}
                        {titleAr ? (
                          <span className="block text-xs font-normal text-slate-500" dir="rtl" lang="ar">
                            {titleAr}
                          </span>
                        ) : null}
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        {section ? `Section ${section}` : null}
                        {section ? <span aria-hidden> · </span> : null}
                        <span data-clinical-type-label="true">{typeLabel}</span>
                      </p>
                    </div>
                    <WorkspaceBadge tone={complete ? "green" : "gold"}>{complete ? "Complete" : "Required"}</WorkspaceBadge>
                  </div>

                  <div className="space-y-3">
                    {pair.en && pair.en.type === "SIGNATURE" ? (
                      <div
                        role="region"
                        aria-label="Physician signature"
                        aria-describedby={`sig-desc-${pair.key}`}
                      >
                        <p id={`sig-desc-${pair.key}`} className="sr-only">
                          Sign inside the signature area using a stylus or finger. Use Tab to reach the clear button.
                        </p>
                        <TabletSignaturePad
                          value={physicianSignatureDataUrl}
                          onChange={onPhysicianSignatureChange}
                          disabled={disabled}
                        />
                      </div>
                    ) : pair.ar && pair.ar.type === "SIGNATURE" ? (
                      <div
                        role="region"
                        aria-label="Physician signature"
                        aria-describedby={`sig-desc-${pair.key}`}
                      >
                        <p id={`sig-desc-${pair.key}`} className="sr-only">
                          Sign inside the signature area using a stylus or finger. Use Tab to reach the clear button.
                        </p>
                        <TabletSignaturePad
                          value={physicianSignatureDataUrl}
                          onChange={onPhysicianSignatureChange}
                          disabled={disabled}
                        />
                      </div>
                    ) : null}

                    {(() => {
                      const enField = pair.en;
                      return enField && enField.type !== "SIGNATURE" ? (
                        <div>
                          <label htmlFor={enField.key} className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            English
                          </label>
                          {enField.type === "CHECKBOX" ? (
                            <select
                              id={enField.key}
                              value={values[enField.key] ?? ""}
                              disabled={disabled}
                              onChange={(event) => onValueChange(enField.key, event.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">Select applicability</option>
                              <option value="true">Yes / applies</option>
                              <option value="false">No / not applicable</option>
                            </select>
                          ) : (
                            <textarea
                              id={enField.key}
                              value={values[enField.key] ?? ""}
                              disabled={disabled}
                              onChange={(event) => onValueChange(enField.key, event.target.value)}
                              placeholder="Enter physician completion value"
                              rows={enField.type === "MULTILINE_TEXT" ? 3 : 2}
                              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          )}
                        </div>
                      ) : null;
                    })()}

                    {(() => {
                      const arField = pair.ar;
                      return arField && arField.type !== "SIGNATURE" ? (
                        <div>
                          <label htmlFor={arField.key} className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500" dir="rtl" lang="ar">
                            العربية
                          </label>
                          {arField.type === "CHECKBOX" ? (
                            <select
                              id={arField.key}
                              value={values[arField.key] ?? ""}
                              disabled={disabled}
                              onChange={(event) => onValueChange(arField.key, event.target.value)}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="">Select applicability</option>
                              <option value="true">Yes / applies</option>
                              <option value="false">No / not applicable</option>
                            </select>
                          ) : (
                            <textarea
                              id={arField.key}
                              value={values[arField.key] ?? ""}
                              disabled={disabled}
                              onChange={(event) => onValueChange(arField.key, event.target.value)}
                              placeholder="أدخل القيمة بالعربية"
                              rows={arField.type === "MULTILINE_TEXT" ? 3 : 2}
                              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              dir="rtl"
                              lang="ar"
                            />
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
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

export { isTechnicalTypeLabel, clinicalTypeLabel, groupFieldsIntoBilingualPairs };
export type { FieldPair };
