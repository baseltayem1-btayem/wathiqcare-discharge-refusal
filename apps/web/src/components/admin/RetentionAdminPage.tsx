"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type RetentionPolicyItem = {
  id: string;
  recordCategory: string;
  retentionYears: number;
  legalHoldRequired?: boolean;
  requiresLegalApproval?: boolean;
};

type RetentionActionItem = {
  id: string;
  targetType: string;
  targetId: string;
  caseId?: string | null;
  status: string;
  holdReason?: string | null;
  scheduledFor: string;
};

type RetentionDashboard = {
  metrics?: {
    policyCount?: number;
    actionCount?: number;
    upcomingActionCount?: number;
    legalHoldCount?: number;
  };
  policies?: RetentionPolicyItem[];
  actions?: RetentionActionItem[];
  upcomingActions?: RetentionActionItem[];
  defaultCaseRetentionYears?: number;
};

function getStatusVariant(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETED") return "success" as const;
  if (normalized === "LEGAL_HOLD") return "warning" as const;
  if (normalized === "FAILED") return "destructive" as const;
  return "outline" as const;
}

export default function RetentionAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const actionStatusLabel = useCallback((value: string) => {
    switch (value) {
      case "COMPLETED":
        return txt("Completed", "مكتمل");
      case "LEGAL_HOLD":
        return txt("Legal hold", "حجز قانوني");
      case "FAILED":
        return txt("Failed", "فشل");
      case "SCHEDULED":
        return txt("Scheduled", "مجدول");
      case "RUNNING":
        return txt("Running", "قيد التنفيذ");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<RetentionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"policy" | "action" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepUpVerified, setStepUpVerified] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    recordCategory: "discharge_refusal_cases",
    retentionYears: "10",
  });
  const [actionForm, setActionForm] = useState({
    targetType: "case_file",
    targetId: "",
    caseId: "",
    scheduledFor: "",
    holdReason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<RetentionDashboard>("/api/admin/retention", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to load retention workspace.", "تعذر تحميل مساحة عمل الاحتفاظ."));
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Policies", "السياسات"), value: dashboard?.metrics?.policyCount ?? dashboard?.policies?.length ?? 0 },
      { label: txt("Actions", "الإجراءات"), value: dashboard?.metrics?.actionCount ?? dashboard?.actions?.length ?? 0 },
      { label: txt("Upcoming", "القادمة"), value: dashboard?.metrics?.upcomingActionCount ?? dashboard?.upcomingActions?.length ?? 0 },
      { label: txt("Legal holds", "الحجوزات القانونية"), value: dashboard?.metrics?.legalHoldCount ?? 0 },
    ],
    [dashboard, txt],
  );

  async function handleSavePolicy() {
    setBusy("policy");
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/retention", {
        method: "POST",
        body: JSON.stringify({
          recordCategory: policyForm.recordCategory,
          retentionYears: Number(policyForm.retentionYears) || 10,
        }),
      });
      setSuccess(txt("Retention policy saved.", "تم حفظ سياسة الاحتفاظ."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to save retention policy.", "تعذر حفظ سياسة الاحتفاظ."));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateAction() {
    setBusy("action");
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/retention", {
        method: "POST",
        body: JSON.stringify({
          targetType: actionForm.targetType,
          targetId: actionForm.targetId,
          caseId: actionForm.caseId || undefined,
          scheduledFor: actionForm.scheduledFor || undefined,
          holdReason: actionForm.holdReason || undefined,
        }),
      });
      setActionForm({
        targetType: "case_file",
        targetId: "",
        caseId: "",
        scheduledFor: "",
        holdReason: "",
      });
      setSuccess(txt("Retention action scheduled.", "تمت جدولة إجراء الاحتفاظ."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to create retention action.", "تعذر إنشاء إجراء الاحتفاظ."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Retention & Secure Deletion", "الاحتفاظ والحذف الآمن")}
        subtitle={txt("Phase 2 workspace for retention policies, legal holds, and disposal scheduling.", "مساحة العمل للمرحلة 2 لسياسات الاحتفاظ والحجوزات القانونية وجدولة الإتلاف.")}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> {txt("Refresh", "تحديث")}
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            txt("Default discharge refusal retention remains 10 years.", "فترة الاحتفاظ الافتراضية لحالات رفض الخروج هي 10 سنوات."),
            txt("Legal holds keep deletion blocked until cleared.", "الحجز القانوني يمنع الحذف حتى رفعه."),
            txt("Every retention change is audit-logged.", "كل تغيير في الاحتفاظ يُسجل في التدقيق."),
            txt("Step-up confirmation is required for admin changes.", "يتطلب تعديل الإعدادات الإدارية تأكيد تحقق معزز."),
          ].map((item) => (
            <Card key={item}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-cyan-50 p-2 text-cyan-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardTitle className="text-sm text-slate-600">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-4">
          <StepUpVerificationPanel
            actionKey="retention_admin_change"
            description={txt("Retention policy edits, legal holds, and disposal scheduling require a verified elevated session.", "تعديل سياسات الاحتفاظ والحجوزات القانونية وجدولة الإتلاف يتطلب جلسة موثقة بصلاحيات معززة.")}
            onVerifiedChange={setStepUpVerified}
          />
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Save retention policy", "حفظ سياسة الاحتفاظ")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Record category", "فئة السجل")} value={policyForm.recordCategory} onChange={(e) => setPolicyForm((current) => ({ ...current, recordCategory: e.target.value }))} />
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Retention years", "سنوات الاحتفاظ")} value={policyForm.retentionYears} onChange={(e) => setPolicyForm((current) => ({ ...current, retentionYears: e.target.value }))} />
              <Button onClick={() => void handleSavePolicy()} disabled={busy === "policy" || loading || !stepUpVerified}>{txt("Save policy", "حفظ السياسة")}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Schedule retention action", "جدولة إجراء احتفاظ")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Target type", "نوع الهدف")} value={actionForm.targetType} onChange={(e) => setActionForm((current) => ({ ...current, targetType: e.target.value }))} />
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Target ID", "معرّف الهدف")} value={actionForm.targetId} onChange={(e) => setActionForm((current) => ({ ...current, targetId: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Case ID (optional)", "معرّف الحالة (اختياري)")} value={actionForm.caseId} onChange={(e) => setActionForm((current) => ({ ...current, caseId: e.target.value }))} />
                <input aria-label={txt("Retention schedule", "جدول الاحتفاظ")} title={txt("Retention schedule", "جدول الاحتفاظ")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={actionForm.scheduledFor} onChange={(e) => setActionForm((current) => ({ ...current, scheduledFor: e.target.value }))} />
              </div>
              <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Legal hold reason (optional)", "سبب الحجز القانوني (اختياري)")} value={actionForm.holdReason} onChange={(e) => setActionForm((current) => ({ ...current, holdReason: e.target.value }))} />
              <Button variant="outline" onClick={() => void handleCreateAction()} disabled={busy === "action" || loading || !stepUpVerified}>{txt("Create action", "إنشاء إجراء")}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Retention policies", "سياسات الاحتفاظ")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(dashboard?.policies ?? []).map((policy) => (
                <div key={policy.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{policy.recordCategory}</span>
                    <Badge variant="outline">{policy.retentionYears} {txt("year(s)", "سنة")}</Badge>
                  </div>
                  <div className="text-slate-500">{txt("Legal hold", "الحجز القانوني")}: {policy.legalHoldRequired ? txt("required", "مطلوب") : txt("optional", "اختياري")} • {txt("Approval", "الموافقة")}: {policy.requiresLegalApproval ? txt("required", "مطلوب") : txt("not required", "غير مطلوب")}</div>
                </div>
              ))}
              {(dashboard?.policies ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No policies found yet.", "لا توجد سياسات حتى الآن.")}</div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Upcoming actions & holds", "الإجراءات والحجوزات القادمة")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(dashboard?.actions ?? []).slice(0, 8).map((action) => (
                <div key={action.id} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{action.targetType} · {action.targetId}</span>
                    <Badge variant={getStatusVariant(action.status)}>{actionStatusLabel(action.status)}</Badge>
                  </div>
                  <div className="text-slate-500">{txt("Scheduled", "مجدول")}: {new Date(action.scheduledFor).toLocaleString()}</div>
                  <div className="text-slate-500">{action.holdReason || txt("No hold reason recorded.", "لا يوجد سبب حجز مسجل.")}</div>
                </div>
              ))}
              {(dashboard?.actions ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No retention actions are scheduled yet.", "لا توجد إجراءات احتفاظ مجدولة بعد.")}</div> : null}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
