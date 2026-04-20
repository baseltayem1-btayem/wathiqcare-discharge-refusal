"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type ThirdPartyRiskItem = {
  id: string;
  processorName: string;
  serviceType: string;
  hostingRegion: string;
  residencyScope: string;
  crossBorderTransfer: boolean;
  transferMechanism?: string | null;
  contractInPlace: boolean;
  securityReviewCompleted: boolean;
  containsPatientData: boolean;
  riskTier: string;
  status: string;
  ownerName?: string | null;
  notes?: string | null;
  nextReviewDueAt?: string | null;
  approvedBy?: string | null;
  updatedAt?: string | null;
};

type ThirdPartyRiskDashboard = {
  items?: ThirdPartyRiskItem[];
  summary?: {
    total: number;
    approvedCount: number;
    overdueReviews: number;
    crossBorderFlags: number;
    highRiskCount: number;
    missingContracts: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    approvedCount?: number;
    overdueReviews?: number;
    crossBorderFlags?: number;
    highRiskCount?: number;
    missingContracts?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "APPROVED":
      return "success" as const;
    case "RESTRICTED":
    case "REJECTED":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function riskVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function ThirdPartyRiskAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const statusLabel = useCallback((value: string) => {
    switch (value) {
      case "APPROVED":
        return txt("Approved", "معتمد");
      case "RESTRICTED":
        return txt("Restricted", "مقيّد");
      case "REJECTED":
        return txt("Rejected", "مرفوض");
      case "PENDING_REVIEW":
        return txt("Pending review", "قيد المراجعة");
      default:
        return value;
    }
  }, [txt]);
  const riskTierLabel = useCallback((value: string) => {
    switch (value) {
      case "low":
        return txt("Low", "منخفض");
      case "medium":
        return txt("Medium", "متوسط");
      case "high":
        return txt("High", "عالٍ");
      case "critical":
        return txt("Critical", "حرج");
      default:
        return value;
    }
  }, [txt]);
  const attentionSeverityLabel = useCallback((value: string) => {
    switch (value) {
      case "critical":
        return txt("Critical", "حرج");
      case "warning":
        return txt("Warning", "تحذير");
      default:
        return value;
    }
  }, [txt]);
  const [dashboard, setDashboard] = useState<ThirdPartyRiskDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    processorName: "",
    serviceType: "analytics",
    hostingRegion: "saudi-arabia-riyadh",
    residencyScope: "KSA_ONLY",
    riskTier: "medium",
    status: "PENDING_REVIEW",
    crossBorderTransfer: false,
    contractInPlace: false,
    securityReviewCompleted: false,
    containsPatientData: true,
    transferMechanism: "",
    ownerName: "",
    nextReviewDueAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<ThirdPartyRiskDashboard>("/api/admin/third-party-risk", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load third-party risk dashboard.", "تعذر تحميل لوحة مخاطر الطرف الثالث."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Processors", "المعالِجون") , value: dashboard?.metrics?.total ?? 0 },
      { label: txt("Approved", "معتمد") , value: dashboard?.metrics?.approvedCount ?? 0 },
      { label: txt("Overdue reviews", "المراجعات المتأخرة") , value: dashboard?.metrics?.overdueReviews ?? 0 },
      { label: txt("Cross-border flags", "تنبيهات النقل عبر الحدود") , value: dashboard?.metrics?.crossBorderFlags ?? 0 },
    ],
    [dashboard, txt],
  );

  const createEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/third-party-risk", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          nextReviewDueAt: form.nextReviewDueAt ? new Date(form.nextReviewDueAt).toISOString() : null,
        }),
      });
      setSuccess(txt("Third-party processor saved.", "تم حفظ سجل المعالج الخارجي."));
      setForm({
        processorName: "",
        serviceType: "analytics",
        hostingRegion: "saudi-arabia-riyadh",
        residencyScope: "KSA_ONLY",
        riskTier: "medium",
        status: "PENDING_REVIEW",
        crossBorderTransfer: false,
        contractInPlace: false,
        securityReviewCompleted: false,
        containsPatientData: true,
        transferMechanism: "",
        ownerName: "",
        nextReviewDueAt: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to save processor record.", "تعذر حفظ سجل المعالج."));
    } finally {
      setSaving(false);
    }
  }, [form, load, txt]);

  const updateStatus = useCallback(async (item: ThirdPartyRiskItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/third-party-risk", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          status,
          notes: item.notes,
          nextReviewDueAt: item.nextReviewDueAt,
        }),
      });
      setSuccess(txt(`Processor marked as ${statusLabel(status)}.`, `تم تحديث حالة المعالج إلى ${statusLabel(status)}.`));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to update processor status.", "تعذر تحديث حالة المعالج."));
    } finally {
      setBusyId(null);
    }
  }, [load, txt, statusLabel]);

  return (
    <AuthGuard>
      <AppShell
        title={txt("Third-Party Risk", "مخاطر الطرف الثالث")}
        subtitle={txt("Phase 7 workspace for processor due diligence, cross-border review, and PDPL transfer safeguards.", "مساحة العمل للمرحلة 7 للفحص النافي للجهالة للمعالجين ومراجعة النقل عبر الحدود وضوابط النقل وفق PDPL.")}
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
              <CardTitle>{txt("Register or review a processor", "تسجيل أو مراجعة معالج")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="third_party_risk_register"
                description={txt("Verify the privileged session before approving processors or cross-border transfer safeguards.", "تحقق من الجلسة ذات الصلاحية قبل اعتماد المعالجين أو اعتماد ضوابط النقل عبر الحدود.")}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Processor name", "اسم المعالج")} value={form.processorName} onChange={(event) => setForm((current) => ({ ...current, processorName: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Service type", "نوع الخدمة")} value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Hosting region", "منطقة الاستضافة")} value={form.hostingRegion} onChange={(event) => setForm((current) => ({ ...current, hostingRegion: event.target.value }))} />
                <input className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Owner / accountable team", "المالك / الفريق المسؤول")} value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label={txt("Risk tier", "مستوى المخاطر")} title={txt("Risk tier", "مستوى المخاطر")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.riskTier} onChange={(event) => setForm((current) => ({ ...current, riskTier: event.target.value }))}>
                  <option value="low">{txt("Low risk", "مخاطر منخفضة")}</option>
                  <option value="medium">{txt("Medium risk", "مخاطر متوسطة")}</option>
                  <option value="high">{txt("High risk", "مخاطر عالية")}</option>
                  <option value="critical">{txt("Critical risk", "مخاطر حرجة")}</option>
                </select>
                <select aria-label={txt("Residency scope", "نطاق الإقامة") } title={txt("Residency scope", "نطاق الإقامة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.residencyScope} onChange={(event) => setForm((current) => ({ ...current, residencyScope: event.target.value }))}>
                  <option value="KSA_ONLY">{txt("KSA only", "داخل المملكة فقط")}</option>
                  <option value="CONTROLLED_EXPORT">{txt("Controlled export", "نقل مضبوط")}</option>
                  <option value="GLOBAL_NON_PERSONAL">{txt("Global non-personal", "عالمي غير شخصي")}</option>
                </select>
                <input className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Transfer mechanism (required if approved + cross-border)", "آلية النقل (مطلوبة عند الاعتماد مع نقل عبر الحدود)")} value={form.transferMechanism} onChange={(event) => setForm((current) => ({ ...current, transferMechanism: event.target.value }))} />
                <input aria-label={txt("Next review due date", "تاريخ استحقاق المراجعة القادمة")} title={txt("Next review due date", "تاريخ استحقاق المراجعة القادمة")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" type="date" value={form.nextReviewDueAt} onChange={(event) => setForm((current) => ({ ...current, nextReviewDueAt: event.target.value }))} />
                <textarea className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Notes", "ملاحظات")} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.crossBorderTransfer} onChange={(event) => setForm((current) => ({ ...current, crossBorderTransfer: event.target.checked }))} />
                  {txt("Cross-border transfer", "نقل عبر الحدود")}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.contractInPlace} onChange={(event) => setForm((current) => ({ ...current, contractInPlace: event.target.checked }))} />
                  {txt("Contract / DPA in place", "العقد / اتفاقية معالجة البيانات متاحة")}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.securityReviewCompleted} onChange={(event) => setForm((current) => ({ ...current, securityReviewCompleted: event.target.checked }))} />
                  {txt("Security review completed", "اكتملت مراجعة الأمن")}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <input type="checkbox" checked={form.containsPatientData} onChange={(event) => setForm((current) => ({ ...current, containsPatientData: event.target.checked }))} />
                  {txt("Contains patient data", "يتضمن بيانات مرضى")}
                </label>
              </div>

              <Button onClick={() => void createEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> {txt("Save processor", "حفظ المعالج")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Current attention queue", "قائمة التنبيهات الحالية")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {(dashboard?.summary?.attention ?? []).map((item) => (
                <div key={item.code} className="rounded-xl border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.label}</span>
                    <Badge variant={item.severity === "critical" ? "warning" : "outline"}>{attentionSeverityLabel(item.severity)}</Badge>
                  </div>
                  <div className="text-slate-500">{txt("Open items", "العناصر المفتوحة")}: {item.value}</div>
                </div>
              ))}
              {(dashboard?.summary?.attention ?? []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No third-party governance issues are currently open.", "لا توجد حاليًا مشكلات حوكمة مفتوحة للطرف الثالث.")}</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <Globe2 className="mr-2 inline h-4 w-4 text-cyan-700" />
                {txt("Track Saudi residency scope, cross-border approvals, and overdue vendor reviews in one place.", "تابع نطاق الإقامة داخل السعودية وموافقات النقل عبر الحدود ومراجعات الموردين المتأخرة في مكان واحد.")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{txt("Processor register", "سجل المعالِجين")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.processorName}</div>
                    <div className="text-slate-500">{item.serviceType} · {item.hostingRegion} · {txt("Owner", "المالك")}: {item.ownerName || txt("unassigned", "غير محدد")}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={riskVariant(item.riskTier)}>{riskTierLabel(item.riskTier)}</Badge>
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    <Badge variant={item.crossBorderTransfer ? "warning" : "success"}>{item.crossBorderTransfer ? txt("cross-border", "عبر الحدود") : txt("ksa-only", "داخل المملكة")}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  DPA: {item.contractInPlace ? txt("in place", "موجود") : txt("missing", "مفقود")} · {txt("Security review", "مراجعة الأمن")}: {item.securityReviewCompleted ? txt("completed", "مكتملة") : txt("pending", "معلقة")} · {txt("Next review", "المراجعة القادمة")}: {item.nextReviewDueAt ? new Date(item.nextReviewDueAt).toLocaleDateString() : txt("not scheduled", "غير مجدولة")}
                </div>
                <div className="mt-2 text-slate-500">{item.transferMechanism || txt("No transfer mechanism recorded.", "لا توجد آلية نقل مسجلة.")}</div>
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "APPROVED")} disabled={busyId === `${item.id}:APPROVED`}>
                    {txt("Approve", "اعتماد")}
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "RESTRICTED")} disabled={busyId === `${item.id}:RESTRICTED`}>
                    {txt("Restrict", "تقييد")}
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No processors registered yet.", "لا يوجد معالِجون مسجلون بعد.")}</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
