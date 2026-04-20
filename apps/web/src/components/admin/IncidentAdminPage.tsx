"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type IncidentItem = {
  id: string;
  caseId?: string | null;
  title: string;
  summary: string;
  severity: string;
  status: string;
  affectedScope?: string | null;
  detectedAt: string;
  clientNotificationDueAt?: string | null;
  regulatorNotificationDueAt?: string | null;
};

type IncidentDashboard = {
  summary?: {
    total?: number;
    openCount?: number;
    overdueNotificationCount?: number;
    bySeverity?: Record<string, number>;
    byStatus?: Record<string, number>;
  };
  incidents?: IncidentItem[];
};

const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_OPTIONS = ["DETECTED", "TRIAGED", "CONTAINED", "RESOLVED", "CLOSED"];

function severityVariant(value: string) {
  const normalized = value.toUpperCase();
  if (normalized === "LOW") return "outline" as const;
  if (normalized === "RESOLVED" || normalized === "CLOSED") return "success" as const;
  return "warning" as const;
}

export default function IncidentAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const severityLabel = useCallback((value: string) => {
    switch (value) {
      case "CRITICAL":
        return txt("Critical", "حرج");
      case "HIGH":
        return txt("High", "عالٍ");
      case "MEDIUM":
        return txt("Medium", "متوسط");
      case "LOW":
        return txt("Low", "منخفض");
      default:
        return value;
    }
  }, [txt]);
  const statusLabel = useCallback((value: string) => {
    switch (value) {
      case "DETECTED":
        return txt("Detected", "تم الاكتشاف");
      case "TRIAGED":
        return txt("Triaged", "تم الفرز");
      case "CONTAINED":
        return txt("Contained", "تم الاحتواء");
      case "RESOLVED":
        return txt("Resolved", "تم الحل");
      case "CLOSED":
        return txt("Closed", "مغلق");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<IncidentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepUpVerified, setStepUpVerified] = useState(false);
  const [form, setForm] = useState({
    caseId: "",
    severity: "HIGH",
    status: "DETECTED",
    title: "",
    summary: "",
    affectedScope: "clinical_workflow",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<IncidentDashboard>("/api/admin/incidents", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load incidents.", "تعذر تحميل الحوادث."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Total incidents", "إجمالي الحوادث"), value: dashboard?.summary?.total ?? 0 },
      { label: txt("Open incidents", "الحوادث المفتوحة"), value: dashboard?.summary?.openCount ?? 0 },
      { label: txt("Overdue notifications", "الإشعارات المتأخرة"), value: dashboard?.summary?.overdueNotificationCount ?? 0 },
      { label: txt("Critical incidents", "الحوادث الحرجة"), value: dashboard?.summary?.bySeverity?.CRITICAL ?? 0 },
    ],
    [dashboard, txt],
  );

  async function handleCreateIncident() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/incidents", {
        method: "POST",
        body: JSON.stringify({
          caseId: form.caseId || undefined,
          severity: form.severity,
          status: form.status,
          title: form.title,
          summary: form.summary,
          affectedScope: form.affectedScope,
        }),
      });
      setForm({
        caseId: "",
        severity: "HIGH",
        status: "DETECTED",
        title: "",
        summary: "",
        affectedScope: "clinical_workflow",
      });
      setSuccess(txt("Incident registered.", "تم تسجيل الحادث."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to register incident.", "تعذر تسجيل الحادث."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Incident Response", "الاستجابة للحوادث")}
        subtitle={txt("Phase 3 workspace for incident capture, deadlines, and breach-response coordination.", "مساحة العمل للمرحلة 3 لالتقاط الحوادث ومتابعة المهل وتنسيق الاستجابة للخرق.")}
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{txt("Create security incident", "إنشاء حادث أمني")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StepUpVerificationPanel
              actionKey="incident_create"
              description={txt("A verified privileged session is required before creating or updating incident records.", "يتطلب إنشاء أو تحديث سجلات الحوادث جلسة موثقة بصلاحيات معززة.")}
              onVerifiedChange={setStepUpVerified}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Case ID (optional)", "معرّف الحالة (اختياري)")} value={form.caseId} onChange={(e) => setForm((current) => ({ ...current, caseId: e.target.value }))} />
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Affected scope", "النطاق المتأثر")} value={form.affectedScope} onChange={(e) => setForm((current) => ({ ...current, affectedScope: e.target.value }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select aria-label={txt("Incident severity", "شدة الحادث")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.severity} onChange={(e) => setForm((current) => ({ ...current, severity: e.target.value }))}>
                {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{severityLabel(option)}</option>)}
              </select>
              <select aria-label={txt("Incident status", "حالة الحادث")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
              </select>
            </div>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Incident title", "عنوان الحادث")} value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} />
            <textarea className="min-h-[110px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Incident summary and evidence notes", "ملخص الحادث وملاحظات الأدلة")} value={form.summary} onChange={(e) => setForm((current) => ({ ...current, summary: e.target.value }))} />
            <Button onClick={() => void handleCreateIncident()} disabled={busy || loading || !stepUpVerified}>{txt("Register incident", "تسجيل الحادث")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{txt("Incident queue", "قائمة الحوادث")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.incidents ?? []).slice(0, 10).map((incident) => (
              <div key={incident.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-800">{incident.title}</div>
                  <div className="flex gap-2">
                    <Badge variant={severityVariant(incident.severity)}>{severityLabel(incident.severity)}</Badge>
                    <Badge variant={severityVariant(incident.status)}>{statusLabel(incident.status)}</Badge>
                  </div>
                </div>
                <div className="text-slate-500">{incident.summary}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-slate-400">
                  <span><AlertTriangle className="mr-1 inline h-4 w-4" /> {txt("Detected", "تم الاكتشاف")}: {new Date(incident.detectedAt).toLocaleString()}</span>
                  {incident.clientNotificationDueAt ? <span>{txt("Client due", "استحقاق العميل")}: {new Date(incident.clientNotificationDueAt).toLocaleString()}</span> : null}
                  {incident.regulatorNotificationDueAt ? <span>{txt("Regulator due", "استحقاق الجهة المنظمة")}: {new Date(incident.regulatorNotificationDueAt).toLocaleString()}</span> : null}
                </div>
              </div>
            ))}
            {(dashboard?.incidents ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No incidents registered yet.", "لا توجد حوادث مسجلة بعد.")}</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
