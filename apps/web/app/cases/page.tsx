"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, PlusCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { SkeletonHeader, SkeletonTable } from "@/components/ui/SkeletonLoading";
import UXStateCard from "@/components/ui/UXStateCard";
import { useUiPermissions } from "@/hooks/useUiPermissions";
import { useI18n } from "@/i18n/I18nProvider";
import { trackApiError, trackPrimaryAction } from "@/lib/tracking";
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
  const [refreshing, setRefreshing] = useState(false);

  const canCreateCase = permissions.can("cases.create");
  const isArabic = lang === "ar";

  async function loadCases(showToast = false): Promise<void> {
    try {
      const data = await apiFetch<CaseItem[]>("/api/cases");
      setCases(data as CaseItem[]);
      setError("");
      if (showToast) {
        toast.success(isArabic ? "تم تحديث الحالات" : "Cases refreshed successfully");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      setError(message);
      toast.error(message);
      trackApiError({ operation: "list_cases", surface: "cases_page", role: permissions.auth.role ?? undefined });
    }
  }

  useEffect(() => {
    void loadCases().finally(() => setLoading(false));
  }, [permissions.auth.role]);

  const inProgressCount = cases.filter((item) => /open|pending|progress/i.test(item.status || "")).length;
  const readyToCloseCount = cases.filter((item) => /completed|closed|final/i.test(item.status || "")).length;
  const nextAction = inProgressCount > 0
    ? {
        title: isArabic ? "الإجراء التالي: متابعة الحالات النشطة" : "Next action: review active cases",
        note: isArabic ? `لديك ${inProgressCount} حالة تحتاج متابعة فورية.` : `${inProgressCount} active case(s) require immediate follow-up.`,
      }
    : {
        title: isArabic ? "الإجراء التالي: إنشاء حالة جديدة" : "Next action: create a new case",
        note: isArabic ? "لا توجد حالات نشطة حاليًا، ابدأ دورة جديدة عند الحاجة." : "No active cases right now, start a new workflow when needed.",
      };

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
                  return;
                }

                trackPrimaryAction("new_case", { role: permissions.auth.role ?? undefined });
              }}
              title={!canCreateCase ? permissions.deniedMessage : undefined}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
              style={!canCreateCase ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              <PlusCircle className="h-4 w-4" />
              {t("cases.newCase")}
            </Link>

            <Link
              href="/documents"
              onClick={() => {
                trackPrimaryAction("open_documents", { role: permissions.auth.role ?? undefined });
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              {t("bundles.title")}
            </Link>

            <button
              type="button"
              onClick={() => {
                trackPrimaryAction("refresh_cases", { role: permissions.auth.role ?? undefined });
                setRefreshing(true);
                void loadCases(true)
                  .catch(() => {
                    trackApiError({ operation: "refresh_cases", surface: "cases_page", role: permissions.auth.role ?? undefined });
                  })
                  .finally(() => setRefreshing(false));
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? (isArabic ? "جار التحديث..." : "Refreshing...") : t("common.refresh")}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="space-y-4">
            <UXStateCard
              variant="loading"
              title={isArabic ? "جاري تحميل الحالات" : "Loading cases"}
              message={isArabic ? "يتم الآن تجهيز بيانات الحالات والإجراءات المتاحة." : "Preparing case list and available actions."}
            />
            <SkeletonHeader />
            <SkeletonTable rows={6} />
          </div>
        ) : null}

        {error ? (
          <UXStateCard
            variant="error"
            title={isArabic ? "تعذر تحميل الحالات" : "Unable to load cases"}
            message={error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  void loadCases().finally(() => setLoading(false));
                }}
              >
                {isArabic ? "إعادة المحاولة" : "Retry"}
              </Button>
            }
          />
        ) : null}

        {!loading && !error ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isArabic ? "الإجراء التالي" : "Next Action"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">{nextAction.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{nextAction.note}</p>
                </div>
                <Link
                  href={inProgressCount > 0 ? "/cases" : "/cases/new"}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                >
                  {inProgressCount > 0 ? (isArabic ? "مراجعة الحالات" : "Review Cases") : (isArabic ? "حالة جديدة" : "New Case")}
                </Link>
              </CardContent>
            </Card>

            <section className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t("cases.table.actions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{cases.length}</div>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "إجمالي الحالات في مساحة العمل" : "Total cases in workspace"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isArabic ? "قيد التنفيذ" : "In progress"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {inProgressCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "حالات تحتاج متابعة نشطة" : "Cases requiring active follow-up"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{isArabic ? "جاهزة للإغلاق" : "Ready to close"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {readyToCloseCount}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{isArabic ? "استوفت متطلبات الحالة" : "Meeting closure requirements"}</p>
                </CardContent>
              </Card>
            </section>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)]">
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
                    <td className="px-4 py-3">
                      <Badge
                        variant={/completed|closed|final/i.test(item.status || "") ? "success" : /failed|blocked|rejected/i.test(item.status || "") ? "destructive" : "pending"}
                      >
                        {translateCaseStatus(item.status || "", isArabic)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.signer_name
                        ? `${item.signer_name}${item.signer_role ? ` (${translateSignerRole(item.signer_role, isArabic)})` : ""}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">{item.createdAt || item.created_at || "-"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${item.id}`}
                        onClick={() => {
                          trackPrimaryAction("open_case_workspace", { role: permissions.auth.role ?? undefined });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 font-semibold text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
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
                      <div className="mx-auto max-w-xl">
                        <UXStateCard
                          variant="empty"
                          title={isArabic ? "لا توجد حالات بعد" : "No cases yet"}
                          message={t("cases.noCases")}
                          action={
                            canCreateCase ? (
                              <Link
                                href="/cases/new"
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                {t("cases.newCase")}
                              </Link>
                            ) : null
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
