"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type RemediationItem = {
  id: string;
  actionKey: string;
  actionTitle: string;
  sourceType: string;
  sourceRef?: string | null;
  category: string;
  severity: string;
  status: string;
  ownerName: string;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  rootCause?: string | null;
  notes?: string | null;
  completedBy?: string | null;
  updatedAt?: string | null;
};

type RemediationTrackerDashboard = {
  items?: RemediationItem[];
  summary?: {
    total: number;
    openCount: number;
    overdueCount: number;
    criticalOpenCount: number;
    blockedCount: number;
    completedCount: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    openCount?: number;
    overdueCount?: number;
    criticalOpenCount?: number;
    blockedCount?: number;
    completedCount?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "COMPLETED":
      return "success" as const;
    case "BLOCKED":
    case "ACCEPTED_RISK":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function severityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function RemediationTrackerAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const statusLabel = useCallback((value: string) => {
    switch (value) {
      case "OPEN":
        return txt("Open", "مفتوح");
      case "IN_PROGRESS":
        return txt("In progress", "قيد التنفيذ");
      case "BLOCKED":
        return txt("Blocked", "محجوب");
      case "COMPLETED":
        return txt("Completed", "مكتمل");
      case "ACCEPTED_RISK":
        return txt("Accepted risk", "مخاطر مقبولة");
      default:
        return value;
    }
  }, [txt]);
  const severityLabel = useCallback((value: string) => {
    switch (value) {
      case "standard":
        return txt("Standard", "قياسي");
      case "high":
        return txt("High", "عالٍ");
      case "critical":
        return txt("Critical", "حرج");
      default:
        return value;
    }
  }, [txt]);
  const categoryLabel = useCallback((value: string) => {
    switch (value) {
      case "privacy":
        return txt("Privacy", "الخصوصية");
      case "security":
        return txt("Security", "الأمن");
      case "legal":
        return txt("Legal", "القانوني");
      case "resilience":
        return txt("Resilience", "المرونة");
      case "third_party":
        return txt("Third party", "الطرف الثالث");
      case "workforce":
        return txt("Workforce", "القوى العاملة");
      case "operations":
        return txt("Operations", "العمليات");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<RemediationTrackerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    actionKey: "",
    actionTitle: "",
    sourceType: "audit_finding",
    sourceRef: "",
    category: "privacy",
    severity: "standard",
    status: "OPEN",
    ownerName: "",
    dueAt: "",
    evidenceLink: "",
    rootCause: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<RemediationTrackerDashboard>("/api/admin/remediation-tracker", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load remediation tracker.", "تعذر تحميل متتبع المعالجات."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Total actions", "إجمالي الإجراءات"), value: dashboard?.metrics?.total ?? 0 },
      { label: txt("Open", "مفتوح"), value: dashboard?.metrics?.openCount ?? 0 },
      { label: txt("Overdue", "متأخر"), value: dashboard?.metrics?.overdueCount ?? 0 },
      { label: txt("Critical open", "مفتوح حرج"), value: dashboard?.metrics?.criticalOpenCount ?? 0 },
    ],
    [dashboard, txt],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/remediation-tracker", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        }),
      });
      setSuccess(txt("Remediation action saved.", "تم حفظ إجراء المعالجة."));
      setForm({
        actionKey: "",
        actionTitle: "",
        sourceType: "audit_finding",
        sourceRef: "",
        category: "privacy",
        severity: "standard",
        status: "OPEN",
        ownerName: "",
        dueAt: "",
        evidenceLink: "",
        rootCause: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to save remediation action.", "تعذر حفظ إجراء المعالجة."));
    } finally {
      setSaving(false);
    }
  }, [form, load, txt]);

  const updateStatus = useCallback(async (item: RemediationItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/remediation-tracker", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          actionKey: item.actionKey,
          actionTitle: item.actionTitle,
          sourceType: item.sourceType,
          sourceRef: item.sourceRef,
          category: item.category,
          severity: item.severity,
          ownerName: item.ownerName,
          dueAt: item.dueAt,
          evidenceLink: item.evidenceLink,
          rootCause: item.rootCause,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(txt(`Remediation action marked as ${statusLabel(status)}.`, `تم تحديث حالة إجراء المعالجة إلى ${statusLabel(status)}.`));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to update remediation action.", "تعذر تحديث إجراء المعالجة."));
    } finally {
      setBusyId(null);
    }
  }, [load, txt, statusLabel]);

  return (
    <AuthGuard>
      <AppShell
        title={txt("Remediation Tracker", "متتبع المعالجات")}
        subtitle={txt("Phase 10 workspace for corrective actions, accountable owners, and verified closure evidence.", "مساحة العمل للمرحلة 10 للإجراءات التصحيحية والملاك المسؤولين وأدلة الإغلاق الموثقة.")}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> {txt("Refresh", "تحديث")}
          </Button>
        }
      >
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

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Register a corrective action", "تسجيل إجراء تصحيحي")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="remediation_tracker_review"
                description={txt("Verify the privileged session before creating or closing corrective actions.", "تحقق من الجلسة ذات الصلاحية قبل إنشاء أو إغلاق الإجراءات التصحيحية.")}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title={txt("Action key", "مفتاح الإجراء")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("action-key", "action-key")} value={form.actionKey} onChange={(event) => setForm((current) => ({ ...current, actionKey: event.target.value }))} />
                <input title={txt("Action title", "عنوان الإجراء")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Corrective action title", "عنوان الإجراء التصحيحي")} value={form.actionTitle} onChange={(event) => setForm((current) => ({ ...current, actionTitle: event.target.value }))} />
                <input title={txt("Source type", "نوع المصدر")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("audit_finding / incident / training_gap", "audit_finding / incident / training_gap")} value={form.sourceType} onChange={(event) => setForm((current) => ({ ...current, sourceType: event.target.value }))} />
                <input title={txt("Source reference", "مرجع المصدر")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Incident ID or finding ref", "رقم الحادث أو مرجع الملاحظة")} value={form.sourceRef} onChange={(event) => setForm((current) => ({ ...current, sourceRef: event.target.value }))} />
                <select aria-label={txt("Remediation category", "فئة المعالجة")} title={txt("Remediation category", "فئة المعالجة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                  <option value="privacy">{txt("Privacy", "الخصوصية")}</option>
                  <option value="security">{txt("Security", "الأمن")}</option>
                  <option value="legal">{txt("Legal", "القانوني")}</option>
                  <option value="resilience">{txt("Resilience", "المرونة")}</option>
                  <option value="third_party">{txt("Third party", "الطرف الثالث")}</option>
                  <option value="workforce">{txt("Workforce", "القوى العاملة")}</option>
                  <option value="operations">{txt("Operations", "العمليات")}</option>
                </select>
                <select aria-label={txt("Remediation severity", "شدة المعالجة")} title={txt("Remediation severity", "شدة المعالجة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}>
                  <option value="standard">{txt("Standard", "قياسي")}</option>
                  <option value="high">{txt("High", "عالٍ")}</option>
                  <option value="critical">{txt("Critical", "حرج")}</option>
                </select>
                <select aria-label={txt("Remediation status", "حالة المعالجة")} title={txt("Remediation status", "حالة المعالجة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="OPEN">{txt("Open", "مفتوح")}</option>
                  <option value="IN_PROGRESS">{txt("In progress", "قيد التنفيذ")}</option>
                  <option value="BLOCKED">{txt("Blocked", "محجوب")}</option>
                  <option value="COMPLETED">{txt("Completed", "مكتمل")}</option>
                  <option value="ACCEPTED_RISK">{txt("Accepted risk", "مخاطر مقبولة")}</option>
                </select>
                <input title={txt("Owner name", "اسم المالك")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Accountable owner", "المالك المسؤول")} value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <input aria-label={txt("Due date", "تاريخ الاستحقاق")} title={txt("Due date", "تاريخ الاستحقاق")} className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
                <input title={txt("Evidence link", "رابط الدليل")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Evidence link or closure artifact", "رابط الدليل أو مستند الإغلاق")} value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <textarea title={txt("Root cause", "السبب الجذري")} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Root cause or issue statement", "السبب الجذري أو وصف المشكلة")} value={form.rootCause} onChange={(event) => setForm((current) => ({ ...current, rootCause: event.target.value }))} />
                <textarea title={txt("Notes", "ملاحظات")} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Closure notes or committee remarks", "ملاحظات الإغلاق أو ملاحظات اللجنة")} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> {txt("Save action", "حفظ الإجراء")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Immediate attention", "تنبيه فوري")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(dashboard?.summary?.attention ?? []).map((item) => (
                <div key={item.code} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <span>{item.label}</span>
                  <Badge variant={item.severity === "critical" ? "warning" : "outline"}>{item.value}</Badge>
                </div>
              ))}
              {(dashboard?.summary?.attention ?? []).length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                  {txt("No overdue or critical remediation actions right now.", "لا توجد حاليًا إجراءات معالجة متأخرة أو حرجة.")}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{txt("Corrective action register", "سجل الإجراءات التصحيحية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.actionTitle}</span>
                      <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                      <Badge variant={severityVariant(item.severity)}>{severityLabel(item.severity)}</Badge>
                    </div>
                    <div className="mt-1 text-slate-600">
                      {categoryLabel(item.category)} • {txt("Owner", "المالك")}: {item.ownerName} • {txt("Source", "المصدر")}: {item.sourceType}
                      {item.sourceRef ? ` (${item.sourceRef})` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-slate-500">
                      {item.dueAt ? <span><AlertTriangle className="mr-1 inline h-4 w-4" /> {txt("Due", "الاستحقاق")}: {new Date(item.dueAt).toLocaleDateString()}</span> : null}
                      {item.completedAt ? <span><ClipboardCheck className="mr-1 inline h-4 w-4" /> {txt("Closed", "تم الإغلاق")}: {new Date(item.completedAt).toLocaleDateString()}</span> : null}
                      {item.completedBy ? <span>{txt("Closed by", "أغلق بواسطة")}: {item.completedBy}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" disabled={busyId === `${item.id}:IN_PROGRESS` || item.status === "IN_PROGRESS"} onClick={() => void updateStatus(item, "IN_PROGRESS")}>
                      {txt("In progress", "قيد التنفيذ")}
                    </Button>
                    <Button disabled={busyId === `${item.id}:COMPLETED` || item.status === "COMPLETED"} onClick={() => void updateStatus(item, "COMPLETED")}>
                      {txt("Complete", "إكمال")}
                    </Button>
                  </div>
                </div>

                {item.rootCause ? <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{txt("Root cause", "السبب الجذري")}: {item.rootCause}</p> : null}
                {item.notes ? <p className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">{txt("Notes", "ملاحظات")}: {item.notes}</p> : null}
                {item.evidenceLink ? <p className="mt-2 text-slate-600">{txt("Evidence", "الدليل")}: <span className="font-mono text-xs">{item.evidenceLink}</span></p> : null}
              </div>
            ))}

            {(dashboard?.items ?? []).length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                {txt("No corrective actions registered yet.", "لا توجد إجراءات تصحيحية مسجلة بعد.")}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
