"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileText, PlusCircle, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
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

type PriorityLevel = "urgent" | "medium" | "low";

type RowDecisionSignal = {
  item: CaseItem;
  readinessPercent: number;
  missingElements: Array<"consent" | "witness" | "physician">;
  priority: PriorityLevel;
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

function statusPillClass(status: string): string {
  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["open", "new", "pending", "in_progress"].includes(normalized)) {
    return "border border-sky-200 bg-sky-50 text-sky-700";
  }
  if (["closed", "completed", "final"].includes(normalized)) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border border-slate-200 bg-slate-50 text-slate-700";
}

function computeReadinessSignal(item: CaseItem): Omit<RowDecisionSignal, "item"> {
  const status = (item.status || "").trim().toLowerCase();
  const signerRole = (item.signer_role || "").trim().toLowerCase();

  const hasConsent = Boolean(item.refusal_reason && item.refusal_reason.trim());
  const hasWitness = /witness/.test(signerRole);
  const hasPhysician = /doctor|physician/.test(signerRole) || /completed|closed|final|approved/.test(status);

  const missingElements: Array<"consent" | "witness" | "physician"> = [];
  if (!hasConsent) missingElements.push("consent");
  if (!hasWitness) missingElements.push("witness");
  if (!hasPhysician) missingElements.push("physician");

  const readinessPercent = Math.max(0, 100 - missingElements.length * 34);

  const priority: PriorityLevel =
    /open|pending|progress|escalated|failed|rejected/.test(status) || readinessPercent < 50
      ? "urgent"
      : readinessPercent < 80
        ? "medium"
        : "low";

  return { readinessPercent, missingElements, priority };
}

function priorityPillClass(priority: PriorityLevel): string {
  if (priority === "urgent") return "border border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "medium") return "border border-amber-200 bg-amber-50 text-amber-700";
  return "border border-slate-200 bg-slate-100 text-slate-700";
}

function deltaMeta(current: number, previous: number): { delta: number; trend: "up" | "down" | "flat" } {
  const delta = current - previous;
  if (delta > 0) return { delta, trend: "up" };
  if (delta < 0) return { delta, trend: "down" };
  return { delta: 0, trend: "flat" };
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

  const decisionRows = useMemo<RowDecisionSignal[]>(() => {
    const ranked = cases.map((item) => ({ item, ...computeReadinessSignal(item) }));
    const rankOrder: Record<PriorityLevel, number> = { urgent: 0, medium: 1, low: 2 };

    ranked.sort((left, right) => {
      const priorityDelta = rankOrder[left.priority] - rankOrder[right.priority];
      if (priorityDelta !== 0) return priorityDelta;

      const leftTs = Date.parse(left.item.createdAt || left.item.created_at || "") || 0;
      const rightTs = Date.parse(right.item.createdAt || right.item.created_at || "") || 0;
      return rightTs - leftTs;
    });

    return ranked;
  }, [cases]);

  const inProgressCount = decisionRows.filter((row) => /open|pending|progress/i.test(row.item.status || "")).length;
  const readyToCloseCount = decisionRows.filter((row) => /completed|closed|final/i.test(row.item.status || "")).length;
  const urgentCount = decisionRows.filter((row) => row.priority === "urgent").length;
  const blockingIssueCount = decisionRows.reduce((acc, row) => acc + row.missingElements.length, 0);

  const now = Date.now();
  const last24hStart = now - 24 * 60 * 60 * 1000;
  const prev24hStart = now - 48 * 60 * 60 * 1000;

  const actionsDailyCurrent = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return ts >= last24hStart;
  }).length;
  const actionsDailyPrevious = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return ts >= prev24hStart && ts < last24hStart;
  }).length;

  const inProgressDailyCurrent = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return /open|pending|progress/i.test(row.item.status || "") && ts >= last24hStart;
  }).length;
  const inProgressDailyPrevious = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return /open|pending|progress/i.test(row.item.status || "") && ts >= prev24hStart && ts < last24hStart;
  }).length;

  const readyCloseDailyCurrent = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return /completed|closed|final/i.test(row.item.status || "") && ts >= last24hStart;
  }).length;
  const readyCloseDailyPrevious = decisionRows.filter((row) => {
    const ts = Date.parse(row.item.createdAt || row.item.created_at || "") || 0;
    return /completed|closed|final/i.test(row.item.status || "") && ts >= prev24hStart && ts < last24hStart;
  }).length;

  const actionsDelta = deltaMeta(actionsDailyCurrent, actionsDailyPrevious);
  const inProgressDelta = deltaMeta(inProgressDailyCurrent, inProgressDailyPrevious);
  const readyCloseDelta = deltaMeta(readyCloseDailyCurrent, readyCloseDailyPrevious);

  const riskLevel = urgentCount >= 10 ? txt("High", "مرتفع") : urgentCount >= 3 ? txt("Medium", "متوسط") : txt("Low", "منخفض");

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
        title={isArabic ? "مركز قيادة الحالات" : "Case Command Center"}
        subtitle={isArabic ? "تتبع حالات الخروج الطبي وتحديد الأولويات وحلها برؤية قانونية كاملة." : "Track, prioritize, and resolve discharge cases with full legal visibility."}
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
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_22px_rgba(15,23,42,0.18)]"
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
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
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
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
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
          <div className="space-y-10">
            <section className="rounded-2xl border border-[var(--border-soft)] !border-l-4 !border-l-[#C9A13B] bg-[linear-gradient(135deg,#0A2540_0%,#002B5C_100%)] p-7 shadow-[0_14px_32px_rgba(15,23,42,0.28)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-base font-bold text-white/95">
                    <Zap className="h-4 w-4 text-[#C9A13B]" />
                    {isArabic ? "الإجراء التالي" : "Next Action"}
                  </h2>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {isArabic ? "الإجراء التالي: متابعة الحالات النشطة" : "Next action: review active cases"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sky-100">
                    <span className="font-semibold text-white">{isArabic ? "قرار تنفيذي:" : "Executive priority:"}</span>{" "}
                    {nextAction.note}
                  </p>
                  <div className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-500/15 px-2.5 py-1 font-semibold text-rose-100">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {txt("Urgent", "عاجلة")}: {urgentCount}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-100">
                      {txt("Risk", "المخاطر")}: {riskLevel}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-500/15 px-2.5 py-1 font-semibold text-slate-100">
                      {txt("Blocking issues", "العوائق")}: {blockingIssueCount}
                    </span>
                  </div>
                </div>
                <Link
                  href={inProgressCount > 0 ? "/cases" : "/cases/new"}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white bg-white px-4 py-2 text-sm font-semibold text-[#002B5C] shadow-[0_10px_24px_rgba(15,23,42,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-[0_12px_26px_rgba(15,23,42,0.34)]"
                >
                  {inProgressCount > 0 ? (isArabic ? "مراجعة الحالات" : "Review Cases") : (isArabic ? "حالة جديدة" : "New Case")}
                </Link>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <Card className="rounded-2xl border border-sky-200 bg-[linear-gradient(140deg,#eff6ff_0%,#ffffff_100%)] shadow-[0_10px_24px_rgba(37,99,235,0.12)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm text-sky-900">
                    {t("cases.table.actions")}
                    <Activity className="h-4 w-4 text-sky-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-sky-900">{cases.length}</div>
                  <p className="mt-1 text-xs text-sky-700/80">{isArabic ? "إجمالي الحالات في مساحة العمل" : "Total cases in workspace"}</p>
                  <p className="mt-2 text-xs font-semibold text-sky-700">
                    {actionsDelta.trend === "up" ? "↑" : actionsDelta.trend === "down" ? "↓" : "→"} {actionsDelta.delta >= 0 ? "+" : ""}{actionsDelta.delta} {txt("vs previous day", "مقارنة باليوم السابق")}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-amber-200 bg-[linear-gradient(140deg,#fffbeb_0%,#ffffff_100%)] shadow-[0_10px_24px_rgba(245,158,11,0.12)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm text-amber-900">
                    {isArabic ? "قيد التنفيذ" : "In progress"}
                    <Clock3 className="h-4 w-4 text-amber-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">
                    {inProgressCount}
                  </div>
                  <p className="mt-1 text-xs text-amber-700/80">{isArabic ? "حالات تحتاج متابعة نشطة" : "Cases requiring active follow-up"}</p>
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {inProgressDelta.trend === "up" ? "↑" : inProgressDelta.trend === "down" ? "↓" : "→"} {inProgressDelta.delta >= 0 ? "+" : ""}{inProgressDelta.delta} {txt("vs previous day", "مقارنة باليوم السابق")}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border border-emerald-200 bg-[linear-gradient(140deg,#ecfdf5_0%,#ffffff_100%)] shadow-[0_10px_24px_rgba(16,185,129,0.12)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-sm text-emerald-900">
                    {isArabic ? "جاهزة للإغلاق" : "Ready to close"}
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-900">
                    {readyToCloseCount}
                  </div>
                  <p className="mt-1 text-xs text-emerald-700/80">{isArabic ? "استوفت متطلبات الحالة" : "Meeting closure requirements"}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {readyCloseDelta.trend === "up" ? "↑" : readyCloseDelta.trend === "down" ? "↓" : "→"} {readyCloseDelta.delta >= 0 ? "+" : ""}{readyCloseDelta.delta} {txt("vs previous day", "مقارنة باليوم السابق")}
                  </p>
                </CardContent>
              </Card>
            </section>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">{t("cases.table.mrn")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.patient")}</th>
                  <th className="px-4 py-3 text-left">{txt("Priority", "الأولوية")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.status")}</th>
                  <th className="px-4 py-3 text-left">{txt("Legal readiness", "الجاهزية القانونية")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.signer")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.created")}</th>
                  <th className="px-4 py-3 text-left">{t("cases.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {decisionRows.map((row, index) => {
                  const item = row.item;
                  const isFirstUrgentRow = index === 0 && row.priority === "urgent";

                  return (
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 transition-all duration-200 ease-in-out hover:bg-slate-50 ${isFirstUrgentRow ? "bg-rose-50/60" : ""}`}
                  >
                    <td className={`px-4 py-3 font-semibold tracking-wide ${isFirstUrgentRow ? "text-rose-700" : "text-slate-900"}`}>{item.medicalRecordNo || item.patient_mrn || "-"}</td>
                    <td className="px-4 py-3">{item.patientName || item.patient_name || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${priorityPillClass(row.priority)}`}>
                        {row.priority === "urgent" ? txt("Urgent", "عاجلة") : row.priority === "medium" ? txt("Medium", "متوسطة") : txt("Low", "منخفضة")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(item.status || "")}`}>
                        {translateCaseStatus(item.status || "", isArabic)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-800">{row.readinessPercent}%</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {row.missingElements.length
                          ? row.missingElements.map((entry) => txt(entry, entry === "consent" ? "موافقة" : entry === "witness" ? "شاهد" : "طبيب")).join(" / ")
                          : txt("Complete", "مكتملة")}
                      </div>
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-3 py-2 font-semibold !text-white transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] hover:shadow-[0_8px_18px_rgba(15,23,42,0.16)]"
                      >
                        {t("cases.open")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                  );
                })}

                {decisionRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
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
