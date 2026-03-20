"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nProvider";

type BaseWorkflowModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  submitLabel?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit?: () => void;
};

export default function BaseWorkflowModal({
  open,
  title,
  description,
  children,
  submitLabel = "Submit",
  submitting,
  onClose,
  onSubmit,
}: BaseWorkflowModalProps) {
  const { t } = useI18n();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}

        <div className="mt-4">{children}</div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          {onSubmit ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? t("common.submitting") : submitLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
