"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import StepUpVerificationPanel from "@/components/security/StepUpVerificationPanel";
import { useI18n } from "@/hooks/useI18n";
import { apiFetch } from "@/utils/api";

type PolicyAttestationItem = {
  id: string;
  policyKey: string;
  policyName: string;
  framework: string;
  ownerName: string;
  criticality: string;
  status: string;
  reviewFrequencyDays: number;
  nextReviewDueAt?: string | null;
  evidenceLink?: string | null;
  exceptionReason?: string | null;
  exceptionExpiresAt?: string | null;
  notes?: string | null;
  attestedBy?: string | null;
  updatedAt?: string | null;
};

type PolicyAttestationDashboard = {
  items?: PolicyAttestationItem[];
  summary?: {
    total: number;
    attestedCount: number;
    overdueAttestations: number;
    openExceptions: number;
    criticalFindings: number;
    attention?: Array<{
      code: string;
      severity: "warning" | "critical";
      label: string;
      value: number;
    }>;
  };
  metrics?: {
    total?: number;
    attestedCount?: number;
    overdueAttestations?: number;
    openExceptions?: number;
    criticalFindings?: number;
  };
};

function statusVariant(value: string) {
  switch (value) {
    case "ATTESTED":
      return "success" as const;
    case "EXCEPTION":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

function criticalityVariant(value: string) {
  return value === "critical" || value === "high" ? "warning" as const : "outline" as const;
}

export default function PolicyAttestationAdminPage() {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const statusLabel = useCallback((value: string) => {
    switch (value) {
      case "PENDING_REVIEW":
        return txt("Pending review", "قيد المراجعة");
      case "ATTESTED":
        return txt("Attested", "موثق");
      case "EXCEPTION":
        return txt("Exception", "استثناء");
      case "RETIRED":
        return txt("Retired", "موقوف");
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
  const [dashboard, setDashboard] = useState<PolicyAttestationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    policyKey: "",
    policyName: "",
    framework: "PDPL",
    ownerName: "",
    criticality: "standard",
    status: "PENDING_REVIEW",
    reviewFrequencyDays: "365",
    nextReviewDueAt: "",
    evidenceLink: "",
    exceptionReason: "",
    exceptionExpiresAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<PolicyAttestationDashboard>("/api/admin/policy-attestations", {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setDashboard(response);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : txt("Failed to load policy governance dashboard.", "تعذر تحميل لوحة حوكمة السياسات."));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: txt("Policy items", "عناصر السياسات"), value: dashboard?.metrics?.total ?? 0 },
      { label: txt("Attested", "موثق"), value: dashboard?.metrics?.attestedCount ?? 0 },
      { label: txt("Overdue", "متأخر"), value: dashboard?.metrics?.overdueAttestations ?? 0 },
      { label: txt("Open exceptions", "الاستثناءات المفتوحة"), value: dashboard?.metrics?.openExceptions ?? 0 },
    ],
    [dashboard, txt],
  );

  const saveEntry = useCallback(async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/policy-attestations", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          reviewFrequencyDays: Number(form.reviewFrequencyDays || 365),
          nextReviewDueAt: form.nextReviewDueAt ? new Date(form.nextReviewDueAt).toISOString() : null,
          exceptionExpiresAt: form.exceptionExpiresAt ? new Date(form.exceptionExpiresAt).toISOString() : null,
        }),
      });
      setSuccess(txt("Policy governance item saved.", "تم حفظ عنصر حوكمة السياسة."));
      setForm({
        policyKey: "",
        policyName: "",
        framework: "PDPL",
        ownerName: "",
        criticality: "standard",
        status: "PENDING_REVIEW",
        reviewFrequencyDays: "365",
        nextReviewDueAt: "",
        evidenceLink: "",
        exceptionReason: "",
        exceptionExpiresAt: "",
        notes: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to save policy item.", "تعذر حفظ عنصر السياسة."));
    } finally {
      setSaving(false);
    }
  }, [form, load, txt]);

  const updateStatus = useCallback(async (item: PolicyAttestationItem, status: string) => {
    setBusyId(`${item.id}:${status}`);
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/admin/policy-attestations", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          policyKey: item.policyKey,
          policyName: item.policyName,
          framework: item.framework,
          ownerName: item.ownerName,
          criticality: item.criticality,
          reviewFrequencyDays: item.reviewFrequencyDays,
          nextReviewDueAt: item.nextReviewDueAt,
          evidenceLink: item.evidenceLink,
          exceptionReason: item.exceptionReason,
          exceptionExpiresAt: item.exceptionExpiresAt,
          notes: item.notes,
          status,
        }),
      });
      setSuccess(txt(`Policy item marked as ${statusLabel(status)}.`, `تم تحديث حالة عنصر السياسة إلى ${statusLabel(status)}.`));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : txt("Failed to update policy item.", "تعذر تحديث عنصر السياسة."));
    } finally {
      setBusyId(null);
    }
  }, [load, txt, statusLabel]);

  return (
    <AuthGuard>
      <AppShell
        title={txt("Policy Attestations", "توثيق السياسات")}
        subtitle={txt("Phase 8 workspace for governance reviews, exception tracking, and accountable control attestations.", "مساحة العمل للمرحلة 8 لمراجعات الحوكمة وتتبع الاستثناءات وتوثيق الضوابط المسؤولة.")}
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
              <CardTitle>{txt("Record an attestation or exception", "تسجيل توثيق أو استثناء")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <StepUpVerificationPanel
                actionKey="policy_attestation_review"
                description={txt("Verify the privileged session before attesting policies or granting temporary exceptions.", "تحقق من الجلسة ذات الصلاحية قبل توثيق السياسات أو منح استثناءات مؤقتة.")}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input title={txt("Policy key", "مفتاح السياسة")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("policy-key", "policy-key")} value={form.policyKey} onChange={(event) => setForm((current) => ({ ...current, policyKey: event.target.value }))} />
                <input title={txt("Policy name", "اسم السياسة")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Policy or control name", "اسم السياسة أو الضابط")} value={form.policyName} onChange={(event) => setForm((current) => ({ ...current, policyName: event.target.value }))} />
                <input title={txt("Framework", "الإطار")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("PDPL / CBAHI / JCI", "PDPL / CBAHI / JCI")} value={form.framework} onChange={(event) => setForm((current) => ({ ...current, framework: event.target.value }))} />
                <input title={txt("Owner name", "اسم المالك")} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={txt("Owner or accountable team", "المالك أو الفريق المسؤول")} value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} />
                <select aria-label={txt("Policy criticality", "حرجية السياسة")} title={txt("Policy criticality", "حرجية السياسة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.criticality} onChange={(event) => setForm((current) => ({ ...current, criticality: event.target.value }))}>
                  <option value="standard">{txt("Standard", "قياسي")}</option>
                  <option value="high">{txt("High", "عالٍ")}</option>
                  <option value="critical">{txt("Critical", "حرج")}</option>
                </select>
                <select aria-label={txt("Policy status", "حالة السياسة")} title={txt("Policy status", "حالة السياسة")} className="rounded-xl border border-slate-200 px-3 py-2" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="PENDING_REVIEW">{txt("Pending review", "قيد المراجعة")}</option>
                  <option value="ATTESTED">{txt("Attested", "موثق")}</option>
                  <option value="EXCEPTION">{txt("Exception", "استثناء")}</option>
                  <option value="RETIRED">{txt("Retired", "موقوف")}</option>
                </select>
                <input title={txt("Review frequency in days", "تكرار المراجعة بالأيام")} className="rounded-xl border border-slate-200 px-3 py-2" type="number" min={30} placeholder={txt("365", "365")} value={form.reviewFrequencyDays} onChange={(event) => setForm((current) => ({ ...current, reviewFrequencyDays: event.target.value }))} />
                <input aria-label={txt("Next review due date", "تاريخ استحقاق المراجعة التالية")} title={txt("Next review due date", "تاريخ استحقاق المراجعة التالية")} className="rounded-xl border border-slate-200 px-3 py-2" type="date" value={form.nextReviewDueAt} onChange={(event) => setForm((current) => ({ ...current, nextReviewDueAt: event.target.value }))} />
                <input title={txt("Evidence link", "رابط الدليل")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Evidence link or review minutes", "رابط الدليل أو محضر المراجعة")} value={form.evidenceLink} onChange={(event) => setForm((current) => ({ ...current, evidenceLink: event.target.value }))} />
                <input title={txt("Exception reason", "سبب الاستثناء")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Required when status is Exception", "مطلوب عندما تكون الحالة استثناء")} value={form.exceptionReason} onChange={(event) => setForm((current) => ({ ...current, exceptionReason: event.target.value }))} />
                <input aria-label={txt("Exception expiry", "انتهاء الاستثناء")} title={txt("Exception expiry", "انتهاء الاستثناء")} className="rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" type="date" value={form.exceptionExpiresAt} onChange={(event) => setForm((current) => ({ ...current, exceptionExpiresAt: event.target.value }))} />
                <textarea title={txt("Notes", "ملاحظات")} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 md:col-span-2" placeholder={txt("Notes or committee remarks", "ملاحظات أو ملاحظات اللجنة")} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
              <Button onClick={() => void saveEntry()} disabled={saving || loading}>
                <ShieldCheck className="h-4 w-4" /> {txt("Save attestation", "حفظ التوثيق")}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{txt("Governance attention queue", "قائمة تنبيهات الحوكمة")}</CardTitle>
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No overdue attestations or open exceptions are currently active.", "لا توجد حاليًا توثيقات متأخرة أو استثناءات مفتوحة.")}</div>
              ) : null}
              <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-slate-700">
                <ClipboardCheck className="mr-2 inline h-4 w-4 text-cyan-700" />
                {txt("Keep policy owners, review dates, evidence links, and temporary waivers in one auditable register.", "اجمع ملاك السياسات وتواريخ المراجعة وروابط الأدلة والإعفاءات المؤقتة في سجل تدقيقي واحد.")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{txt("Policy review register", "سجل مراجعة السياسات")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(dashboard?.items ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{item.policyName}</div>
                    <div className="text-slate-500">{item.framework} · {txt("Owner", "المالك")}: {item.ownerName} · {txt("Key", "المفتاح")}: {item.policyKey}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={criticalityVariant(item.criticality)}>{criticalityLabel(item.criticality)}</Badge>
                    <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-slate-600">
                  {txt("Review every", "المراجعة كل")} {item.reviewFrequencyDays} {txt("day(s)", "يومًا")} · {txt("Next due", "الاستحقاق التالي")}: {item.nextReviewDueAt ? new Date(item.nextReviewDueAt).toLocaleDateString() : txt("not scheduled", "غير مجدول")}
                </div>
                {item.exceptionReason ? <div className="mt-2 text-amber-700">{txt("Exception", "استثناء")}: {item.exceptionReason}</div> : null}
                {item.exceptionExpiresAt ? <div className="text-slate-500">{txt("Exception expires", "انتهاء الاستثناء")}: {new Date(item.exceptionExpiresAt).toLocaleDateString()}</div> : null}
                {item.evidenceLink ? <div className="mt-2 text-slate-500">{txt("Evidence", "الدليل")}: {item.evidenceLink}</div> : null}
                {item.notes ? <div className="mt-2 text-slate-500">{item.notes}</div> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void updateStatus(item, "ATTESTED")} disabled={busyId === `${item.id}:ATTESTED`}>
                    {txt("Mark attested", "وضع علامة موثق")}
                  </Button>
                  <Button variant="outline" onClick={() => void updateStatus(item, "PENDING_REVIEW")} disabled={busyId === `${item.id}:PENDING_REVIEW`}>
                    {txt("Re-open review", "إعادة فتح المراجعة")}
                  </Button>
                </div>
              </div>
            ))}
            {(dashboard?.items ?? []).length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">{txt("No policy review items recorded yet.", "لا توجد عناصر مراجعة سياسات مسجلة بعد.")}</div> : null}
          </CardContent>
        </Card>
      </AppShell>
    </AuthGuard>
  );
}
