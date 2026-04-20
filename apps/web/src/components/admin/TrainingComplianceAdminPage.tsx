"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type TrainingComplianceItem = {
  id: string;
  moduleKey: string;
  moduleName: string;
  targetRole: string;
  ownerName: string;
  criticality: string;
  status: string;
  mandatory: boolean;
  dueAt?: string | null;
  completedAt?: string | null;
  evidenceLink?: string | null;
  notes?: string | null;
  completedBy?: string | null;
};

type TrainingDashboard = {
  items?: TrainingComplianceItem[];
  summary?: {
    total: number;
    completedCount: number;
    overdueCount: number;
    criticalGapCount: number;
    notStartedCount: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    completedCount?: number;
    overdueCount?: number;
    criticalGapCount?: number;
    notStartedCount?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "COMPLETED":
      return "success" as const;
    case "NOT_STARTED":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function criticalityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function TrainingComplianceAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const statusLabel = useCallback((value: string) => {
    switch (value) {
      case "NOT_STARTED":
        return txt("Not started", "لم يبدأ");
      case "IN_PROGRESS":
        return txt("In progress", "قيد التنفيذ");
      case "COMPLETED":
        return txt("Completed", "مكتمل");
      case "EXEMPTED":
        return txt("Exempted", "معفى");
      default:
        return value;
    }
  }, [txt]);
  const criticalityLabel = useCallback((value: string) => {
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
  const severityLabel = useCallback((value: string) => {
    switch (value) {
      case "critical":
        return txt("Critical", "حرج");
      case "warning":
        return txt("Warning", "تحذير");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<TrainingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    moduleKey: "",
    moduleName: "",
    targetRole: "all_staff",
    ownerName: "",
    criticality: "standard",
    status: "NOT_STARTED",
    mandatory: true,
    dueAt: "",
    evidenceLink: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<TrainingDashboard>("/api/admin/training-compliance", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load training readiness dashboard.", "تعذر تحميل لوحة جاهزية التدريب."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Modules", "الوحدات"), value: dashboard?.metrics?.total ?? 0 },
      { label: txt("Completed", "مكتمل"), value: dashboard?.metrics?.completedCount ?? 0 },
      { label: txt("Overdue", "متأخر"), value: dashboard?.metrics?.overdueCount ?? 0 },
      { label: txt("Critical gaps", "فجوات حرجة"), value: dashboard?.metrics?.criticalGapCount ?? 0 },
    ],
    [dashboard, txt],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/training-compliance", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        }),
      });
      setSuccess(txt("Training item saved.", "تم حفظ عنصر التدريب."));
      setForm({
        moduleKey: "",
        moduleName: "",
        targetRole: "all_staff",
        ownerName: "",
        criticality: "standard",
        status: "NOT_STARTED",
        mandatory: true,
        dueAt: "",
        evidenceLink: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to save training item.", "تعذر حفظ عنصر التدريب."));
    } finally {
      setSaving(false);
    }
  }, [form, load, txt]);

  const updateStatus = useCallback(async (item: TrainingComplianceItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/training-compliance", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          moduleKey: item.moduleKey,
          moduleName: item.moduleName,
          targetRole: item.targetRole,
          ownerName: item.ownerName,
          criticality: item.criticality,
          mandatory: item.mandatory,
          dueAt: item.dueAt,
          evidenceLink: item.evidenceLink,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(txt(`Training item marked as ${statusLabel(status)}.`, `تم تحديث حالة عنصر التدريب إلى ${statusLabel(status)}.`));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to update training item.", "تعذر تحديث عنصر التدريب."));
    } finally {
      setBusyId(null);
    }
  }, [load, txt, statusLabel]);

  return (
    <AuthGuard>
      <AppShell
        title={txt("Training Readiness", "جاهزية التدريب")}
        subtitle={txt("Phase 9 workspace for mandatory medico-legal and PDPL training readiness across accountable teams.", "مساحة العمل للمرحلة 9 لمتابعة جاهزية التدريب الإلزامي الطبي القانوني وحماية البيانات عبر الفرق المسؤولة.")}
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
              <CardTitle>{txt("Register a training obligation", "تسجيل التزام تدريبي")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="training_compliance_review"
                description={txt("Verify the privileged session before recording critical workforce readiness evidence.", "تحقق من الجلسة ذات الصلاحية قبل تسجيل أدلة جاهزية القوى العاملة الحرجة.")}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title={txt("Module key", "مفتاح الوحدة")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("module-key", "module-key")} value={form.moduleKey} onChange={(event) => setForm((current) => ({ ...current, moduleKey: event.target.value }))} />
                <input title={txt("Module name", "اسم الوحدة")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Training module name", "اسم وحدة التدريب")} value={form.moduleName} onChange={(event) => setForm((current) => ({ ...current, moduleName: event.target.value }))} />
                <input title={txt("Target role", "الدور المستهدف")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Target role or team", "الدور أو الفريق المستهدف")} value={form.targetRole} onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value }))} />
                <input title={txt("Owner", "المالك")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Owner or coordinator", "المالك أو المنسق")} value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label={txt("Training criticality", "حرجية التدريب")} title={txt("Training criticality", "حرجية التدريب")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.criticality} onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value }))}>
                  <option value="standard">{txt("Standard", "قياسي")}</option>
                  <option value="high">{txt("High", "عالٍ")}</option>
                  <option value="critical">{txt("Critical", "حرج")}</option>
                </select>
                <select aria-label={txt("Training status", "حالة التدريب")} title={txt("Training status", "حالة التدريب")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="NOT_STARTED">{txt("Not started", "لم يبدأ")}</option>
                  <option value="IN_PROGRESS">{txt("In progress", "قيد التنفيذ")}</option>
                  <option value="COMPLETED">{txt("Completed", "مكتمل")}</option>
                  <option value="EXEMPTED">{txt("Exempted", "معفى")}</option>
                </select>
                <input aria-label={txt("Due date", "تاريخ الاستحقاق")} title={txt("Due date", "تاريخ الاستحقاق")} className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.dueAt} onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))} />
                <input title={txt("Evidence link", "رابط الدليل")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Certificate or evidence link", "رابط الشهادة أو الدليل")} value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <textarea title={txt("Notes", "ملاحظات")} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Notes or drill remarks", "ملاحظات أو ملاحظات التدريب العملي")} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <input type="checkbox" checked={form.mandatory} onChange={(event) => setForm((current) => ({ ...current, mandatory: event.target.checked }))} />
                {txt("Mandatory for this role/team", "إلزامي لهذا الدور/الفريق")}
              </label>

              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> {txt("Save training item", "حفظ عنصر التدريب")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Readiness attention queue", "قائمة تنبيهات الجاهزية")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(dashboard?.summary?.attention ?? []).map((item) => (
                <div key={item.code} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.label}</span>
                    <Badge variant={item.severity === "critical" ? "warning" : "outline"}>{severityLabel(item.severity)}</Badge>
                  </div>
                  <div className="text-slate-500">{txt("Open items", "العناصر المفتوحة")}: {item.value}</div>
                </div>
              ))}
              {(dashboard?.summary?.attention ?? []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No overdue or critical training gaps are currently open.", "لا توجد حاليًا فجوات تدريب متأخرة أو حرجة.")}</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <Users className="mr-2 inline h-4 w-4 text-cyan-700" />
                {txt("Keep role-based training evidence and completion state visible for legal, privacy, and security readiness.", "حافظ على ظهور أدلة التدريب بحسب الأدوار وحالة الإكمال لدعم الجاهزية القانونية والخصوصية والأمنية.")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{txt("Training register", "سجل التدريب")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.moduleName}</div>
                    <div className="text-slate-500">{txt("Role", "الدور")}: {item.targetRole} · {txt("Owner", "المالك")}: {item.ownerName} · {txt("Key", "المفتاح")}: {item.moduleKey}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={criticalityVariant(item.criticality)}>{criticalityLabel(item.criticality)}</Badge>
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    <Badge variant={item.mandatory ? "warning" : "outline"}>{item.mandatory ? txt("mandatory", "إلزامي") : txt("optional", "اختياري")}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  {txt("Due", "الاستحقاق")}: {item.dueAt ? new Date(item.dueAt).toLocaleDateString() : txt("not scheduled", "غير مجدول")} · {txt("Completed", "الإكمال")}: {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : txt("pending", "قيد الانتظار")}
                </div>
                {item.evidenceLink ? <div className="mt-2 text-slate-500">{txt("Evidence", "الدليل")}: {item.evidenceLink}</div> : null}
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "COMPLETED")} disabled={busyId === `${item.id}:COMPLETED`}>
                    {txt("Mark completed", "وضع علامة مكتمل")}
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "IN_PROGRESS")} disabled={busyId === `${item.id}:IN_PROGRESS`}>
                    {txt("Re-open", "إعادة الفتح")}
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No training items recorded yet.", "لا توجد عناصر تدريب مسجلة بعد.")}</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
