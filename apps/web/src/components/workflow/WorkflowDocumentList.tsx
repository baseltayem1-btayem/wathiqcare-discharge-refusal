"use client";

import { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { WorkflowDocumentItem } from "@/types/dischargeWorkflow";
import { downloadProtectedDocument, viewProtectedDocument } from "@/utils/protectedDocuments";

type Props = {
  documents: WorkflowDocumentItem[];
};

function formatDate(raw: string, locale: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString(locale);
}

export default function WorkflowDocumentList({ documents }: Props) {
  const { t, locale, lang } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleView(doc: WorkflowDocumentItem) {
    setBusyId(doc.id);
    setError("");

    try {
      await viewProtectedDocument(doc.view_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("documents.failedOpen"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(doc: WorkflowDocumentItem) {
    setBusyId(doc.id);
    setError("");

    try {
      await downloadProtectedDocument(doc.download_url, doc.file_name || `${doc.template_key}.html`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("documents.failedDownload"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 p-5">
      <h2 className="text-base font-semibold text-slate-900">{t("documents.generatedForms")}</h2>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {documents.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{t("documents.none")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4" />
                  {lang === "ar" ? doc.title_ar || doc.title : doc.title_en || doc.title}
                </p>
                <p className="text-xs text-slate-600">{t("documents.generatedAt", { date: formatDate(doc.generated_at, locale) })}</p>
                {doc.document_code ? (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("documents.code", { code: doc.document_code })}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleView(doc);
                  }}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {busyId === doc.id ? t("documents.opening") : t("workflow.action.viewGenerated")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDownload(doc);
                  }}
                  disabled={busyId !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  {busyId === doc.id ? t("documents.downloading") : t("workflow.action.downloadGenerated")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
