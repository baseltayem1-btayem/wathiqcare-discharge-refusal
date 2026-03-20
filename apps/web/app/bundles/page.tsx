"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FolderArchive, PackagePlus, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";
import { downloadProtectedDocument } from "@/utils/protectedDocuments";

type BundleItem = {
  name: string;
  path: string;
};

type GenerateBundleResponse = {
  bundle_file: string;
};

export default function BundlesPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [newBundleCaseId, setNewBundleCaseId] = useState("");
  const [creatingBundle, setCreatingBundle] = useState(false);
  const [downloadingName, setDownloadingName] = useState<string | null>(null);

  const loadBundles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch<BundleItem[]>("/api/discharge/bundles");
      setBundles(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("bundles.failedLoad");
      setError(message);

      if (message.includes("401") || message.includes("Invalid")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadBundles();
  }, [loadBundles]);

  async function handleCreateBundle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCaseId = newBundleCaseId.trim();
    if (!trimmedCaseId) {
      return;
    }

    setCreatingBundle(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await apiFetch<GenerateBundleResponse>(
        `/api/discharge/evidence-bundle/${encodeURIComponent(trimmedCaseId)}`,
        {
          method: "POST",
        }
      );

      setInfoMessage(t("bundles.generated", { file: response.bundle_file }));
      setNewBundleCaseId("");
      await loadBundles();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("bundles.failedCreate");
      setError(message);

      if (message.includes("401") || message.includes("Invalid")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setCreatingBundle(false);
    }
  }

  async function handleDownloadBundle(bundleName: string) {
    setDownloadingName(bundleName);
    setError("");

    try {
      await downloadProtectedDocument(
        `/api/discharge/evidence-bundle/download/${bundleName}`,
        bundleName
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t("bundles.failedDownload");
      setError(message);

      if (message.includes("401") || message.includes("Invalid") || message.includes("Not authenticated")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setDownloadingName(null);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={t("bundles.title")}
        subtitle={t("bundles.subtitle")}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("new-bundle-case-id");
                input?.focus();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <PackagePlus className="h-4 w-4" />
              {t("bundles.newBundle")}
            </button>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToCases")}
            </Link>
            <button
              type="button"
              onClick={() => void loadBundles()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </button>
          </>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {infoMessage ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {infoMessage}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 p-5">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
            <FolderArchive className="h-4 w-4" />
            {t("bundles.createTitle")}
          </h2>
          <form onSubmit={handleCreateBundle} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-72 flex-1">
              <span className="mb-1 block text-sm font-medium text-slate-700">{t("field.dischargeCaseId")}</span>
              <input
                id="new-bundle-case-id"
                value={newBundleCaseId}
                onChange={(event) => setNewBundleCaseId(event.target.value)}
                placeholder={t("bundles.placeholder")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <button
              type="submit"
              disabled={creatingBundle}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <PackagePlus className="h-4 w-4" />
              {creatingBundle ? t("bundles.generating") : t("bundles.generate")}
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("bundles.availableTitle")}</h2>

          {loading ? <p className="mt-3 text-sm text-slate-600">{t("bundles.loading")}</p> : null}

          {!loading && bundles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t("bundles.none")}</p>
          ) : null}

          {!loading && bundles.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {bundles.map((bundle) => (
                <li
                  key={bundle.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{bundle.name}</p>
                    <p className="text-xs text-slate-500">{bundle.path}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadBundle(bundle.name);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloadingName === bundle.name ? t("bundles.downloading") : t("bundles.download")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </AppShell>
    </AuthGuard>
  );
}
