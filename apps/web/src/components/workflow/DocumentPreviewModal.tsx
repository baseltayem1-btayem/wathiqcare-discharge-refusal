"use client";

import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkflowPreviewResponse } from "@/types/dischargeWorkflow";

type Props = {
  open: boolean;
  preview: WorkflowPreviewResponse | null;
  generating: boolean;
  onClose: () => void;
  onGenerate: () => void;
};

export default function DocumentPreviewModal({
  open,
  preview,
  generating,
  onClose,
  onGenerate,
}: Props) {
  const { t } = useI18n();

  if (!open || !preview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{preview.title}</h3>
            {preview.document_code ? (
              <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{preview.document_code}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-124px)] gap-0 overflow-auto md:grid-cols-[280px_1fr]">
          <aside className="border-r border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">{t("preview.validation")}</h4>
            {preview.missing_fields.length === 0 ? (
              <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                {t("preview.allFieldsComplete")}
              </p>
            ) : (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                <p className="inline-flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("preview.missingFields")}
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {preview.missing_fields.map((field) => (
                    <li key={field}>{t(`preview.field.${field}`)}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">{t("preview.policyChecklist")}</p>
              <ul className="mt-1 space-y-1">
                {preview.policy_validation.requirements
                  .filter((item) => item.required_for_current_action)
                  .map((item) => (
                    <li key={item.key} className={item.value_present ? "text-emerald-700" : "text-amber-700"}>
                      {item.label}: {item.value_present ? t("preview.policyCompleted") : t("preview.policyPending")}
                    </li>
                  ))}
              </ul>
            </div>
          </aside>

          <div className="bg-white p-4">
            <iframe
              title={t("preview.iframeTitle")}
              srcDoc={preview.html_content}
              className="h-[64vh] w-full rounded-lg border border-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("preview.close")}
          </button>
          <button
            type="button"
            disabled={!preview.can_generate || generating}
            onClick={onGenerate}
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {generating ? t("preview.generating") : t("preview.generateFinal")}
          </button>
        </div>
      </div>
    </div>
  );
}
