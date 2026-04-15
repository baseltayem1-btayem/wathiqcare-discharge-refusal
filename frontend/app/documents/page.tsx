"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Download, Eye, FileText, FolderOpen, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken, isAuthenticationError, logAuthRedirect } from "@/utils/api";
import { downloadProtectedDocument, viewProtectedDocument } from "@/utils/protectedDocuments";
import { useRouter } from "next/navigation";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  patient_name?: string | null;
  status?: string | null;
};

type DocumentItem = {
  id: string;
  case_id?: string | null;
  template_key?: string | null;
  document_code?: string | null;
  title?: string | null;
  titleEn?: string | null;
  title_ar?: string | null;
  file_name?: string | null;
  generated_at?: string | null;
  generationStatus?: string | null;
  signedStatus?: string | null;
};

function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

export default function DocumentsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [documentsByCaseId, setDocumentsByCaseId] = useState<Record<string, DocumentItem[]>>({});
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const loadDocumentsForCase = useCallback(
    async (caseId: string): Promise<DocumentItem[]> => {
      try {
        const docs = await apiFetch<DocumentItem[]>(
          `/api/cases/${encodeURIComponent(caseId)}/documents`,
        );
        return Array.isArray(docs) ? docs : [];
      } catch {
        return [];
      }
    },
    [],
  );

  const loadAll = useCallback(async () => {
    setLoadingCases(true);
    setError("");

    try {
      const caseList = await apiFetch<CaseItem[]>("/api/cases?limit=100");
      const validCases = Array.isArray(caseList) ? caseList : [];
      setCases(validCases);

      setLoadingDocs(true);
      const entries = await Promise.all(
        validCases.map(async (c) => {
          const docs = await loadDocumentsForCase(c.id);
          return [c.id, docs] as const;
        }),
      );
      setDocumentsByCaseId(Object.fromEntries(entries));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("documents.failedLoad");
      setError(message);

      if (isAuthenticationError(err)) {
        logAuthRedirect("documents_load_auth_error", {
          error: err instanceof Error ? err.message : String(err),
        });
        clearToken();
        router.push("/login");
      }
    } finally {
      setLoadingCases(false);
      setLoadingDocs(false);
    }
  }, [loadDocumentsForCase, router, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleDownload(doc: DocumentItem) {
    if (!doc.id) return;
    setDownloadingId(doc.id);
    try {
      await downloadProtectedDocument(
        `/api/documents/${encodeURIComponent(doc.id)}/download`,
        doc.file_name ?? doc.id,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("documents.failedDownload");
      setError(message);

      if (isAuthenticationError(err)) {
        logAuthRedirect("documents_download_auth_error", {
          error: err instanceof Error ? err.message : String(err),
        });
        clearToken();
        router.push("/login");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleView(doc: DocumentItem) {
    if (!doc.id) return;
    setViewingId(doc.id);
    try {
      await viewProtectedDocument(
        `/api/documents/${encodeURIComponent(doc.id)}/preview`,
        doc.file_name ?? doc.id,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("documents.failedView");
      setError(message);
    } finally {
      setViewingId(null);
    }
  }

  const totalDocuments = Object.values(documentsByCaseId).reduce(
    (sum, docs) => sum + docs.length,
    0,
  );
  const casesWithDocuments = Object.values(documentsByCaseId).filter(
    (docs) => docs.length > 0,
  ).length;

  return (
    <AuthGuard>
      <AppShell
        title={t("documents.title")}
        subtitle={t("documents.subtitle")}
        actions={
          <button
            type="button"
            onClick={() => void loadAll()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </button>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Summary stats */}
        {!loadingCases && !loadingDocs ? (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{totalDocuments}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("documents.totalDocuments")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{casesWithDocuments}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("documents.casesWithDocuments")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t("documents.totalCases")}</p>
            </div>
          </div>
        ) : null}

        {loadingCases ? (
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        ) : cases.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            {t("documents.noCases")}
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => {
              const docs = documentsByCaseId[c.id] ?? [];
              const patientName = c.patientName ?? c.patient_name ?? "—";
              return (
                <section key={c.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-slate-500" />
                      <h2 className="text-sm font-semibold text-slate-900">
                        {c.caseNumber ? `#${c.caseNumber} — ` : ""}
                        {patientName}
                      </h2>
                      {c.status ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {c.status}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {t("documents.viewCase")}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {loadingDocs ? (
                    <p className="mt-3 text-xs text-slate-400">{t("common.loading")}</p>
                  ) : docs.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">{t("documents.noDocumentsForCase")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {docs.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                              <FileText className="h-4 w-4 shrink-0" />
                              {doc.titleEn ?? doc.title ?? doc.file_name ?? doc.id}
                            </p>
                            {doc.document_code ? (
                              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                {doc.document_code}
                              </p>
                            ) : null}
                            <p className="text-xs text-slate-500">{formatDate(doc.generated_at)}</p>
                          </div>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleView(doc)}
                              disabled={viewingId === doc.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {t("documents.view")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadingId === doc.id
                                ? t("documents.downloading")
                                : t("documents.download")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
