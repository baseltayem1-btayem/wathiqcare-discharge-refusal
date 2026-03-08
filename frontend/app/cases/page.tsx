"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, CircleDot, Plus, RefreshCw, ArrowUpRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";

type CaseItem = {
  id: string;
  patient_mrn: string;
  patient_name: string;
  status: string;
  refusal_reason?: string;
  signer_name?: string;
  signer_role?: string;
  pdf_file?: string;
  created_at?: string;
};

export default function CasesPage() {
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = (await apiFetch("/api/discharge/cases")) as CaseItem[];
      setCases(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("cases.failedLoad");
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
    void loadCases();
  }, [loadCases]);

  const textAlignClass = isRtl ? "text-right" : "text-left";

  return (
    <AuthGuard>
      <AppShell
        title={t("cases.title")}
        subtitle={t("cases.subtitle")}
        actions={
          <>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {t("cases.newCase")}
            </Link>
            <button
              type="button"
              onClick={() => void loadCases()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </button>
            <Link
              href="/bundles"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <Boxes className="h-4 w-4" />
              {t("nav.bundles")}
            </Link>
          </>
        }
      >
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("cases.loading")}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-100/80 text-slate-700">
                <tr>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.mrn")}</th>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.patient")}</th>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.status")}</th>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.signer")}</th>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.created")}</th>
                  <th className={`px-4 py-3 ${textAlignClass}`}>{t("cases.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 bg-white/90 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.patient_mrn}</td>
                    <td className="px-4 py-3 text-slate-700">{item.patient_name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <CircleDot className="h-3.5 w-3.5" />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.signer_name || t("common.na")} {item.signer_role ? `(${item.signer_role})` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.created_at || t("common.na")}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                      >
                        {t("cases.open")}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      {t("cases.noCases")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
