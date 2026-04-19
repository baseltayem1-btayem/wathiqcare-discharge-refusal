"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, PlusCircle, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useUiPermissions } from "@/hooks/useUiPermissions";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  patient_mrn?: string;
  patient_name?: string;
  medicalRecordNo?: string;
  patientName?: string;
  status: string;
  refusal_reason?: string;
  signer_name?: string;
  signer_role?: string;
  pdf_file?: string;
  createdAt?: string;
  created_at?: string;
};

function translateCaseStatus(status: string, isArabic: boolean): string {
  if (!status) return "-";
  if (!isArabic) return status;

  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const statusMap: Record<string, string> = {
    open: "مفتوحة",
    new: "جديدة",
    pending: "قيد الانتظار",
    in_progress: "قيد التنفيذ",
    completed: "مكتملة",
    closed: "مغلقة",
    cancelled: "ملغاة",
    draft: "مسودة",
    final: "نهائية",
    approved: "معتمدة",
    rejected: "مرفوضة",
    escalated: "مُصعّدة",
    on_hold: "معلّقة",
    generated: "تم الإنشاء",
    failed: "فشلت",
  };

  return statusMap[normalized] ?? status;
}

function translateSignerRole(role: string, isArabic: boolean): string {
  if (!role) return "";
  if (!isArabic) return role;

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, "_");

  const roleMap: Record<string, string> = {
    patient: "المريض",
    self: "المريض نفسه",
    guardian: "الولي",
    caregiver: "مقدم الرعاية",
    witness: "الشاهد",
    doctor: "الطبيب",
    physician: "الطبيب",
    legal: "القانوني",
    legal_admin: "المشرف القانوني",
    legal_officer: "الموظف القانوني",
    signatory: "المفوّض بالتوقيع",
    tenant_admin: "مدير الجهة",
    family_member: "أحد أفراد الأسرة",
    representative: "الممثل",
  };

  return roleMap[normalized] ?? role;
}

export default function CasesPage() {
  const { t, lang } = useI18n();
  const permissions = useUiPermissions();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canCreateCase = permissions.can("cases.create");
  const isArabic = lang === "ar";

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases")
      .then((data) => setCases(data as CaseItem[]))
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGuard>
      <AppShell
        title={t("cases.title")}
        subtitle={t("cases.subtitle")}
        actions={
          <>
            <Link
              href="/cases/new"
              aria-disabled={!canCreateCase}
              onClick={(event) => {
                if (!canCreateCase) {
                  event.preventDefault();
                }
              }}
              title={!canCreateCase ? permissions.deniedMessage : undefined}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
              style={!canCreateCase ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              <PlusCircle className="h-4 w-4" />
              {t("cases.newCase")}
            </Link>

            <Link
              href="/documents"
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              {t("bundles.title")}
            </Link>

            <button
              type="button"
              onClick={() => void apiFetch<CaseItem[]>("/api/cases")
                .then((data) => setCases(data as CaseItem[]))
                .catch((err) => {
                  setError(err.message);
                })}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </button>
          </>
        }
      >
        {loading ? <div className="text-sm text-slate-600">{t("cases.loading")}</div> : null}

        {error ? (
          <div className="rounded-lg border border-[var(--state-error-border)] bg-[var(--state-error-bg)] px-3 py-2 text-sm text-[var(--state-error)]">
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">{t("cases.table.mrn")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.patient")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.status")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.signer")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.created")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3">{item.medicalRecordNo || item.patient_mrn || "-"}</td>
                    <td className="px-4 py-3">{item.patientName || item.patient_name || "-"}</td>
                    <td className="px-4 py-3">{translateCaseStatus(item.status || "", isArabic)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.signer_name
                        ? `${item.signer_name}${item.signer_role ? ` (${translateSignerRole(item.signer_role, isArabic)})` : ""}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{item.createdAt || item.created_at || "-"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-1.5 text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
                      >
                        {t("cases.open")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}

                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
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
