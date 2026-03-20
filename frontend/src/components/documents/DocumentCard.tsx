"use client";

import { FileText } from "lucide-react";
import DocumentDownloadButton from "@/components/documents/DocumentDownloadButton";
import { useI18n } from "@/i18n/I18nProvider";

type DocumentCardProps = {
  title: string;
  subtitle?: string;
  onPreview?: () => void;
  onDownload?: () => void;
};

export default function DocumentCard({
  title,
  subtitle,
  onPreview,
  onDownload,
}: DocumentCardProps) {
  const { t } = useI18n();

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <FileText className="h-4 w-4" />
        {title}
      </p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {onPreview ? (
          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("common.preview")}
          </button>
        ) : null}
        {onDownload ? <DocumentDownloadButton onClick={onDownload} /> : null}
      </div>
    </article>
  );
}
