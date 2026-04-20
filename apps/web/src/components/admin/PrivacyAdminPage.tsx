"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type ConsentRecordItem = {
  id: string;
  processingPurpose?: string;
  consentMethod?: string;
  lawfulBasis?: string;
  consentedAt?: string;
};

type ConsentSummary = {
  total?: number;
  byMethod?: Record<string, number>;
  records?: ConsentRecordItem[];
};

type DsrItem = {
  id: string;
  requestType: string;
  requesterName: string;
  requestReason?: string | null;
  status: string;
  dueAt: string;
  extendedDueAt?: string | null;
  slaState?: string;
};

type DsrSummary = {
  total?: number;
  openCount?: number;
  byStatus?: Record<string, number>;
  bySlaState?: Record<string, number>;
};

type PrivacyDashboard = {
  metrics?: {
    consentCount?: number;
    dsrCount?: number;
    pendingRetentionActions?: number;
  };
  consent?: ConsentSummary;
  dsr?: DsrItem[];
  dsrSummary?: DsrSummary;
};

const DSR_TYPE_OPTIONS = ["ACCESS", "CORRECTION", "DELETION", "RESTRICTION_OBJECTION", "EXPORT"];
const DSR_STATUS_OPTIONS = ["REQUESTED", "IDENTITY_VERIFIED", "LEGAL_REVIEW", "EXECUTED", "CLOSED", "REJECTED"];

function getSlaVariant(state: string | undefined) {
  switch ((state || "").toLowerCase()) {
    case "on_track":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "breached":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function PrivacyAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const dsrTypeLabel = useCallback((value: string) => {
    switch (value) {
      case "ACCESS":
        return txt("Access", "وصول");
      case "CORRECTION":
        return txt("Correction", "تصحيح");
      case "DELETION":
        return txt("Deletion", "حذف");
      case "RESTRICTION_OBJECTION":
        return txt("Restriction/Objection", "تقييد/اعتراض");
      case "EXPORT":
        return txt("Export", "تصدير");
      default:
        return value;
    }
  }, [txt]);
  const dsrStatusLabel = useCallback((value: string) => {
    switch (value) {
      case "REQUESTED":
        return txt("Requested", "مطلوب");
      case "IDENTITY_VERIFIED":
        return txt("Identity verified", "تم التحقق من الهوية");
      case "LEGAL_REVIEW":
        return txt("Legal review", "مراجعة قانونية");
      case "EXECUTED":
        return txt("Executed", "منفذ");
      case "CLOSED":
        return txt("Closed", "مغلق");
      case "REJECTED":
        return txt("Rejected", "مرفوض");
      default:
        return value;
    }
  }, [txt]);
  const slaStateLabel = useCallback((value: string) => {
    switch (value) {
      case "on_track":
        return txt("On track", "ضمن الجدول");
      case "warning":
        return txt("Warning", "تحذير");
      case "breached":
        return txt("Breached", "متجاوز");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<PrivacyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"create" | "update" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createForm, setCreateForm] = useState({
    requesterName: "",
    requesterIdNumber: "",
    caseId: "",
    requestType: "ACCESS",
    requestReason: "",
  });
  const [updateForm, setUpdateForm] = useState({
    requestId: "",
    status: "LEGAL_REVIEW",
    extendByDays: "",
    extensionReason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<PrivacyDashboard>("/api/admin/privacy", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
      setUpdateForm((current) => ({
        ...current,
        requestId: current.requestId || response.dsr?.[0]?.id || "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to load privacy workspace.", "تعذر تحميل مساحة عمل الخصوصية."));
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const dsrItems = dashboard?.dsr ?? [];
  const consentRecords = dashboard?.consent?.records ?? [];
  const dsrSummary = dashboard?.dsrSummary;

  const metrics = useMemo(
    () => [
      { label: txt("Consent records", "سجلات الموافقة"), value: dashboard?.metrics?.consentCount ?? dashboard?.consent?.total ?? 0 },
      { label: txt("DSR requests", "طلبات أصحاب البيانات") , value: dashboard?.metrics?.dsrCount ?? dsrSummary?.total ?? 0 },
      { label: txt("Open DSRs", "الطلبات المفتوحة") , value: dsrSummary?.openCount ?? 0 },
      { label: txt("Pending retention actions", "إجراءات الاحتفاظ المعلقة") , value: dashboard?.metrics?.pendingRetentionActions ?? 0 },
    ],
    [dashboard, dsrSummary, txt],
  );

  async function handleCreateDsr() {
    setBusy("create");
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/privacy/dsr", {
        method: "POST",
        body: JSON.stringify({
          requesterName: createForm.requesterName,
          requesterIdNumber: createForm.requesterIdNumber || undefined,
          caseId: createForm.caseId || undefined,
          requestType: createForm.requestType,
          requestReason: createForm.requestReason || undefined,
        }),
      });
      setCreateForm({
        requesterName: "",
        requesterIdNumber: "",
        caseId: "",
        requestType: "ACCESS",
        requestReason: "",
      });
      setSuccess(txt("DSR request created.", "تم إنشاء طلب صاحب البيانات."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to create DSR request.", "تعذر إنشاء طلب صاحب البيانات."));
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdateDsr() {
    if (!updateForm.requestId) {
      setError(txt("Select a DSR request to update.", "اختر طلب صاحب بيانات للتحديث."));
      return;
    }

    setBusy("update");
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/privacy/dsr/${updateForm.requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: updateForm.status,
          extendByDays: updateForm.extendByDays ? Number(updateForm.extendByDays) : undefined,
          extensionReason: updateForm.extensionReason || undefined,
        }),
      });
      setUpdateForm((current) => ({
        ...current,
        extendByDays: "",
        extensionReason: "",
      }));
      setSuccess(txt("DSR request updated.", "تم تحديث طلب صاحب البيانات."));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to update DSR request.", "تعذر تحديث طلب صاحب البيانات."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title={txt("Privacy & PDPL", "الخصوصية وPDPL")}
        subtitle={txt("Phase 2 workspace for consent evidence, DSR handling, and privacy governance execution.", "مساحة العمل للمرحلة 2 لأدلة الموافقة والتعامل مع طلبات أصحاب البيانات وتنفيذ حوكمة الخصوصية.")}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> {txt("Refresh", "تحديث")}
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            txt("Consent evidence stays case-linked and hashable.", "تظل أدلة الموافقة مرتبطة بالحالة وقابلة للتدقيق."),
            txt("DSR SLA moves from REQUESTED to CLOSED with review checkpoints.", "تتحرك اتفاقية مستوى الخدمة لطلبات أصحاب البيانات من REQUESTED إلى CLOSED مع نقاط مراجعة."),
            txt("Retention exposure remains visible for privacy officers.", "تظل مخاطر الاحتفاظ مرئية لمسؤولي الخصوصية."),
            txt("Every dashboard and export view is traceable.", "كل عرض لوحة وملف تصدير قابل للتتبع."),
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

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Create DSR request", "إنشاء طلب صاحب بيانات")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Requester name", "اسم مقدم الطلب")} value={createForm.requesterName} onChange={(e) => setCreateForm((current) => ({ ...current, requesterName: e.target.value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Requester ID number", "رقم هوية مقدم الطلب")} value={createForm.requesterIdNumber} onChange={(e) => setCreateForm((current) => ({ ...current, requesterIdNumber: e.target.value }))} />
                <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Case ID (optional)", "معرّف الحالة (اختياري)")} value={createForm.caseId} onChange={(e) => setCreateForm((current) => ({ ...current, caseId: e.target.value }))} />
              </div>
              <select aria-label={txt("DSR request type", "نوع طلب صاحب البيانات")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={createForm.requestType} onChange={(e) => setCreateForm((current) => ({ ...current, requestType: e.target.value }))}>
                {DSR_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{dsrTypeLabel(option)}</option>)}
              </select>
              <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Reason / scope", "السبب / النطاق")} value={createForm.requestReason} onChange={(e) => setCreateForm((current) => ({ ...current, requestReason: e.target.value }))} />
              <Button onClick={() => void handleCreateDsr()} disabled={busy === "create" || loading}>{txt("Create request", "إنشاء الطلب")}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Update DSR status", "تحديث حالة طلب صاحب البيانات")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select aria-label={txt("DSR request selector", "محدد طلب صاحب البيانات")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={updateForm.requestId} onChange={(e) => setUpdateForm((current) => ({ ...current, requestId: e.target.value }))}>
                <option value="">{txt("Select request", "اختر الطلب")}</option>
                {dsrItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.requesterName} · {dsrTypeLabel(item.requestType)} · {dsrStatusLabel(item.status)}</option>
                ))}
              </select>
              <select aria-label={txt("DSR status", "حالة طلب صاحب البيانات")} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={updateForm.status} onChange={(e) => setUpdateForm((current) => ({ ...current, status: e.target.value }))}>
                {DSR_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{dsrStatusLabel(option)}</option>)}
              </select>
              <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Extend by days (optional)", "تمديد بالأيام (اختياري)")} value={updateForm.extendByDays} onChange={(e) => setUpdateForm((current) => ({ ...current, extendByDays: e.target.value }))} />
              <textarea className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder={txt("Extension reason / legal review note", "سبب التمديد / ملاحظة المراجعة القانونية")} value={updateForm.extensionReason} onChange={(e) => setUpdateForm((current) => ({ ...current, extensionReason: e.target.value }))} />
              <Button variant="outline" onClick={() => void handleUpdateDsr()} disabled={busy === "update" || loading}>{txt("Save update", "حفظ التحديث")}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{txt("Consent evidence summary", "ملخص أدلة الموافقة")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {Object.entries(dashboard?.consent?.byMethod ?? {}).map(([key, value]) => (
                  <Badge key={key} variant="outline">{key}: {value}</Badge>
                ))}
                {Object.keys(dashboard?.consent?.byMethod ?? {}).length === 0 ? <Badge variant="outline">{txt("No consent records yet", "لا توجد سجلات موافقة بعد")}</Badge> : null}
              </div>
              <div className="space-y-2">
                {consentRecords.slice(0, 6).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="font-medium text-slate-800">{record.processingPurpose || txt("Discharge refusal consent", "موافقة رفض الخروج")}</div>
                    <div className="text-slate-500">{record.consentMethod || txt("N/A", "غير متاح")} • {record.lawfulBasis || txt("Lawful basis pending", "الأساس القانوني قيد التحديث")}</div>
                    <div className="text-slate-400">{record.consentedAt ? new Date(record.consentedAt).toLocaleString() : txt("No timestamp", "لا يوجد طابع زمني")}</div>
                  </div>
                ))}
                {consentRecords.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("Consent capture will appear here after case teams record it.", "ستظهر سجلات الموافقة هنا بعد تسجيلها من فرق الحالات.")}</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("DSR queue", "قائمة طلبات أصحاب البيانات")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {Object.entries(dsrSummary?.bySlaState ?? {}).map(([key, value]) => (
                  <Badge key={key} variant={getSlaVariant(key)}>{slaStateLabel(key)}: {value}</Badge>
                ))}
              </div>
              <div className="space-y-2">
                {dsrItems.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-800">{item.requesterName} · {dsrTypeLabel(item.requestType)}</div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{dsrStatusLabel(item.status)}</Badge>
                        <Badge variant={getSlaVariant(item.slaState)}>{item.slaState ? slaStateLabel(item.slaState) : txt("unknown", "غير معروف")}</Badge>
                      </div>
                    </div>
                    <div className="text-slate-500">{txt("Due", "الاستحقاق")}: {new Date(item.extendedDueAt || item.dueAt).toLocaleDateString()}</div>
                    <div className="text-slate-500">{item.requestReason || txt("No reason supplied.", "لا يوجد سبب مرفق.")}</div>
                  </div>
                ))}
                {dsrItems.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No DSR requests have been raised yet.", "لم يتم رفع أي طلبات لصاحب البيانات بعد.")}</div> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
