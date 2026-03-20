"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileSignature, Plus, RefreshCw, Save, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type AuthMeResponse = {
  claims?: {
    tenant_id?: string;
  };
};

type TenantSummary = {
  id: string;
  code: string;
  name: string;
  billingEmail?: string | null;
  timezone?: string | null;
  country?: string | null;
  isActive: boolean;
  subscriptions?: Array<{ id: string; status: string }>;
};

type MemberItem = {
  id: string;
  role: string;
  status: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
  };
};

type SubscriptionView = {
  id: string;
  status: string;
  billingInterval: "MONTHLY" | "YEARLY";
  seatLimit: number;
  trialEndsAt?: string | null;
  plan?: {
    code: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
    name: string;
  };
};

type UsageItem = {
  id: string;
  metric: string;
  value: string;
  periodDate: string;
};

type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  amountDueCents: number;
  dueAt?: string | null;
};

type TenantListItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  country?: string | null;
  _count?: {
    memberships?: number;
    cases?: number;
  };
  subscriptions?: Array<{
    status: string;
    plan?: {
      code: string;
      name: string;
    };
  }>;
};

type IntegrationStatus = {
  his?: { enabled: boolean; endpoint?: string };
  fhir?: { enabled: boolean; resources?: string[] };
  docuWare?: { enabled: boolean };
  sharePoint?: { enabled: boolean };
  erp?: { enabled: boolean };
};

const PLAN_OPTIONS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;
const BILLING_OPTIONS = ["MONTHLY", "YEARLY"] as const;
const SUB_STATUS_OPTIONS = ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELED", "EXPIRED"] as const;
const MEMBER_ROLE_OPTIONS = ["OWNER", "ADMIN", "MANAGER", "BILLING", "MEMBER", "VIEWER"] as const;

export default function AdminPage() {
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState("");
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [managedTenants, setManagedTenants] = useState<TenantListItem[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);

  const [tenantForm, setTenantForm] = useState({
    name: "",
    billingEmail: "",
    timezone: "UTC",
    country: "",
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    planCode: "STARTER",
    billingInterval: "MONTHLY",
    status: "TRIALING",
    seatLimit: 10,
  });

  const [memberForm, setMemberForm] = useState({
    email: "",
    fullName: "",
    role: "MEMBER",
  });

  const [createTenantForm, setCreateTenantForm] = useState({
    name: "",
    code: "",
    country: "SA",
    timezone: "Asia/Riyadh",
    billingEmail: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [suspendingTenantId, setSuspendingTenantId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    [],
  );

  const operationalKpis = useMemo(() => {
    const metricCount = (patterns: string[]) =>
      usage.filter((entry) => patterns.some((pattern) => entry.metric.toLowerCase().includes(pattern))).length;

    return [
      {
        label: "عدد الحالات المفتوحة",
        value: metricCount(["open_case", "case_opened", "open_cases"]),
        icon: ClipboardList,
      },
      {
        label: "الحالات التي تنتظر توقيع",
        value: metricCount(["pending_signature", "signature_pending"]),
        icon: FileSignature,
      },
      {
        label: "الموافقات المستنيرة المعلقة",
        value: metricCount(["consent_pending", "pending_consent"]),
        icon: CheckCircle2,
      },
      {
        label: "حالات رفض الخروج",
        value: metricCount(["refusal", "discharge_refusal"]),
        icon: AlertTriangle,
      },
      {
        label: "طلبات الإفصاح عن المعلومات",
        value: metricCount(["roi", "release_of_information", "disclosure_request"]),
        icon: ClipboardList,
      },
      {
        label: "حالات التصعيد القانوني",
        value: metricCount(["legal_escalation", "escalation"]),
        icon: ShieldCheck,
      },
    ];
  }, [usage]);

  const legalRiskBoard = useMemo(
    () => [
      { caseId: "Case 1103", risk: "High Legal Risk", level: "high" },
      { caseId: "Case 1104", risk: "Pending Signature", level: "medium" },
      { caseId: "Case 1107", risk: "ROI Validation Required", level: "medium" },
      { caseId: "Case 1112", risk: "Escalated to Legal", level: "high" },
    ],
    [],
  );

  const workQueue = useMemo(
    () => [
      { task: "توقيع مريض", owner: "قسم التمريض", priority: "High", due: "اليوم" },
      { task: "مراجعة قانونية", owner: "الفريق القانوني", priority: "High", due: "خلال 24 ساعة" },
      { task: "إصدار PDF", owner: "منسق الحالة", priority: "Medium", due: "خلال 48 ساعة" },
      { task: "أرشفة", owner: "السجلات الطبية", priority: "Low", due: "هذا الأسبوع" },
    ],
    [],
  );

  const systemTimeline = useMemo(
    () => [
      { event: "Consent signed", time: "منذ 5 دقائق" },
      { event: "ROI request approved", time: "منذ 22 دقيقة" },
      { event: "Refusal case escalated", time: "منذ ساعة" },
      { event: "Discharge refusal PDF generated", time: "منذ ساعتين" },
      { event: "Document archived", time: "منذ 3 ساعات" },
    ],
    [],
  );

  const userRoleCoverage = useMemo(() => {
    const roleCount = (name: string) =>
      members.filter((member) => (member.user.role || "").toLowerCase() === name.toLowerCase()).length;

    return [
      { label: "Doctor", value: roleCount("doctor") },
      { label: "Nurse", value: roleCount("nurse") },
      { label: "Legal Officer", value: roleCount("legal_officer") },
      { label: "HIM", value: roleCount("him") },
    ];
  }, [members]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const me = await apiFetch<AuthMeResponse>("/api/auth/me");
      const resolvedTenantId = me?.claims?.tenant_id;
      if (!resolvedTenantId) {
        throw new Error("تعذر تحديد المستأجر من الجلسة الحالية.");
      }

      setTenantId(resolvedTenantId);

      const [tenantData, memberData, subscriptionData, usageData, invoiceData, tenantsData, integrationsData] = await Promise.all([
        apiFetch<TenantSummary>(`/api/tenants/${resolvedTenantId}`),
        apiFetch<MemberItem[]>(`/api/tenants/${resolvedTenantId}/members`),
        apiFetch<SubscriptionView>(`/api/tenants/${resolvedTenantId}/subscription`),
        apiFetch<UsageItem[]>(`/api/tenants/${resolvedTenantId}/usage?days=30&limit=100`),
        apiFetch<InvoiceItem[]>("/api/billing/invoices?limit=20"),
        apiFetch<TenantListItem[]>('/api/tenants?limit=50'),
        apiFetch<IntegrationStatus>('/api/integrations/status'),
      ]);

      setTenant(tenantData);
      setMembers(memberData);
      setSubscription(subscriptionData);
      setUsage(usageData);
      setInvoices(invoiceData);
      setManagedTenants(Array.isArray(tenantsData) ? tenantsData : []);
      setIntegrationStatus(integrationsData ?? null);

      setTenantForm({
        name: tenantData.name ?? "",
        billingEmail: tenantData.billingEmail ?? "",
        timezone: tenantData.timezone ?? "UTC",
        country: tenantData.country ?? "",
      });

      setSubscriptionForm({
        planCode: subscriptionData.plan?.code ?? "STARTER",
        billingInterval: subscriptionData.billingInterval ?? "MONTHLY",
        status: subscriptionData.status ?? "TRIALING",
        seatLimit: subscriptionData.seatLimit ?? 10,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل لوحة إدارة المنصة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleSaveTenant() {
    if (!tenantId) return;
    setSavingTenant(true);
    setError("");
    setNotice("");

    try {
      await apiFetch<TenantSummary>(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: tenantForm.name,
          billingEmail: tenantForm.billingEmail || null,
          timezone: tenantForm.timezone || null,
          country: tenantForm.country || null,
        }),
      });
      setNotice("تم تحديث ملف المستأجر");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث بيانات المستأجر");
    } finally {
      setSavingTenant(false);
    }
  }

  async function handleSaveSubscription() {
    if (!tenantId) return;
    setSavingSubscription(true);
    setError("");
    setNotice("");

    try {
      await apiFetch<SubscriptionView>(`/api/tenants/${tenantId}/subscription`, {
        method: "PATCH",
        body: JSON.stringify(subscriptionForm),
      });
      setNotice("تم تحديث الاشتراك");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث الاشتراك");
    } finally {
      setSavingSubscription(false);
    }
  }

  async function handleAddMember() {
    if (!tenantId) return;
    setAddingMember(true);
    setError("");
    setNotice("");

    try {
      await apiFetch(`/api/tenants/${tenantId}/members`, {
        method: "POST",
        body: JSON.stringify(memberForm),
      });
      setNotice("تمت إضافة العضو");
      setMemberForm({ email: "", fullName: "", role: "MEMBER" });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إضافة العضو");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleCreateTenant() {
    if (!createTenantForm.name.trim()) {
      setError("اسم المستشفى مطلوب");
      return;
    }

    setCreatingTenant(true);
    setError("");
    setNotice("");

    try {
      await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: createTenantForm.name,
          code: createTenantForm.code || undefined,
          country: createTenantForm.country || null,
          timezone: createTenantForm.timezone || null,
          billingEmail: createTenantForm.billingEmail || null,
        }),
      });

      setNotice('تم إنشاء مستشفى جديدة بنجاح');
      setCreateTenantForm({
        name: '',
        code: '',
        country: 'SA',
        timezone: 'Asia/Riyadh',
        billingEmail: '',
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء المستشفى');
    } finally {
      setCreatingTenant(false);
    }
  }

  async function handleSuspendTenant(targetTenantId: string, currentlyActive: boolean) {
    setSuspendingTenantId(targetTenantId);
    setError("");
    setNotice("");

    try {
      await apiFetch(`/api/tenants/${targetTenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !currentlyActive,
        }),
      });
      setNotice(currentlyActive ? 'تم تعليق المستشفى' : 'تمت إعادة تفعيل المستشفى');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث حالة المستشفى');
    } finally {
      setSuspendingTenantId(null);
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="إدارة المنصة"
        subtitle="إدارة المستأجر والاشتراك والأعضاء والاستخدام والفوترة"
        actions={
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t("common.refresh")}
          </button>
        }
      >
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            جار تحميل مساحة إدارة المنصة...
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {notice ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {!loading && tenant ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900">المؤشرات التشغيلية</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {operationalKpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">{kpi.label}</span>
                        <Icon className="h-4 w-4 text-slate-500" />
                      </div>
                      <p className="mt-2 text-3xl font-semibold text-slate-900">{kpi.value}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">لوحة المخاطر القانونية</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">الحالة</th>
                        <th className="px-3 py-2 text-left">مستوى المخاطر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legalRiskBoard.map((row) => (
                        <tr key={row.caseId} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{row.caseId}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                row.level === "high"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {row.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">طابور العمل</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">المهمة</th>
                        <th className="px-3 py-2 text-left">المسؤول</th>
                        <th className="px-3 py-2 text-left">الأولوية</th>
                        <th className="px-3 py-2 text-left">الموعد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workQueue.map((row) => (
                        <tr key={`${row.task}-${row.owner}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{row.task}</td>
                          <td className="px-3 py-2 text-slate-600">{row.owner}</td>
                          <td className="px-3 py-2">{row.priority}</td>
                          <td className="px-3 py-2 text-slate-600">{row.due}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900">نشاط النظام</h2>
              <div className="mt-3 space-y-3">
                {systemTimeline.map((item, index) => (
                  <div key={`${item.event}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-700" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.event}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 text-slate-900">
                  <Building2 className="h-4 w-4" />
                  <h2 className="text-base font-semibold">إدارة المستشفيات</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Hospital Name"
                    value={createTenantForm.name}
                    onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tenant Code (Optional)"
                    value={createTenantForm.code}
                    onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Billing Email"
                    value={createTenantForm.billingEmail}
                    onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, billingEmail: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateTenant()}
                    disabled={creatingTenant}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {creatingTenant ? 'جار الإنشاء...' : 'Create Tenant'}
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Hospital</th>
                        <th className="px-3 py-2 text-left">Plan</th>
                        <th className="px-3 py-2 text-left">Usage</th>
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managedTenants.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.code}</p>
                          </td>
                          <td className="px-3 py-2">{item.subscriptions?.[0]?.plan?.code || '-'}</td>
                          <td className="px-3 py-2 text-slate-600">
                            Users: {item._count?.memberships || 0} | Cases: {item._count?.cases || 0}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => void handleSuspendTenant(item.id, item.isActive)}
                              disabled={suspendingTenantId === item.id}
                              className={
                                item.isActive
                                  ? 'rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60'
                                  : 'rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60'
                              }
                            >
                              {suspendingTenantId === item.id
                                ? '...' : item.isActive ? 'Suspend Tenant' : 'Activate Tenant'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Hospital Integrations</h2>
                <p className="mt-1 text-sm text-slate-600">HIS/FHIR and enterprise repositories connectivity status.</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    { label: 'HIS Integration', enabled: integrationStatus?.his?.enabled, extra: integrationStatus?.his?.endpoint || '-' },
                    { label: 'FHIR (Patient/Encounter/Procedure/Consent)', enabled: integrationStatus?.fhir?.enabled, extra: (integrationStatus?.fhir?.resources || []).join(', ') || '-' },
                    { label: 'DocuWare', enabled: integrationStatus?.docuWare?.enabled, extra: '-' },
                    { label: 'SharePoint', enabled: integrationStatus?.sharePoint?.enabled, extra: '-' },
                    { label: 'ERP', enabled: integrationStatus?.erp?.enabled, extra: '-' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{item.label}</span>
                        <span className={item.enabled ? 'text-emerald-700' : 'text-amber-700'}>
                          {item.enabled ? 'Connected' : 'Pending setup'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{item.extra}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center gap-2 text-slate-900">
                <ShieldCheck className="h-4 w-4" />
                <h2 className="text-base font-semibold">ملف المستأجر</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  الاسم
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={tenantForm.name}
                    onChange={(e) => setTenantForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  البريد الإلكتروني للفوترة
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={tenantForm.billingEmail}
                    onChange={(e) => setTenantForm((prev) => ({ ...prev, billingEmail: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  المنطقة الزمنية
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={tenantForm.timezone}
                    onChange={(e) => setTenantForm((prev) => ({ ...prev, timezone: e.target.value }))}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  الدولة
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={tenantForm.country}
                    onChange={(e) => setTenantForm((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>رمز المستأجر: {tenant.code}</span>
                <span>الحالة: {tenant.isActive ? "نشط" : "غير نشط"}</span>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveTenant()}
                disabled={savingTenant}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingTenant ? "جار الحفظ..." : "حفظ بيانات المستأجر"}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900">الاشتراك والخطة</h2>
              {subscription ? (
                <p className="mt-1 text-xs text-slate-600">
                  الحالي: {subscription.plan?.name ?? subscription.plan?.code ?? "خطة غير معروفة"} | الحالة: {subscription.status}
                  {subscription.trialEndsAt
                    ? ` | تنتهي الفترة التجريبية في ${new Date(subscription.trialEndsAt).toLocaleDateString()}`
                    : ""}
                </p>
              ) : null}
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="text-sm text-slate-700">
                  الخطة
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={subscriptionForm.planCode}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({ ...prev, planCode: e.target.value }))
                    }
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan} value={plan}>
                        {plan}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  الفوترة
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={subscriptionForm.billingInterval}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({ ...prev, billingInterval: e.target.value }))
                    }
                  >
                    {BILLING_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  الحالة
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={subscriptionForm.status}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    {SUB_STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  حد المقاعد
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={subscriptionForm.seatLimit}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        seatLimit: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveSubscription()}
                disabled={savingSubscription}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingSubscription ? "جار الحفظ..." : "حفظ الاشتراك"}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-900">
                <Users className="h-4 w-4" />
                <h2 className="text-base font-semibold">الأعضاء ({members.length})</h2>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {userRoleCoverage.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="email@domain.com"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="الاسم الكامل"
                  value={memberForm.fullName}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={memberForm.role}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  {MEMBER_ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleAddMember()}
                  disabled={addingMember}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {addingMember ? "جار الإضافة..." : "إضافة عضو"}
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">الاسم</th>
                      <th className="px-3 py-2 text-left">البريد الإلكتروني</th>
                      <th className="px-3 py-2 text-left">الدور</th>
                      <th className="px-3 py-2 text-left">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{member.user.fullName}</td>
                        <td className="px-3 py-2 text-slate-600">{member.user.email}</td>
                        <td className="px-3 py-2">{member.role}</td>
                        <td className="px-3 py-2">{member.status}</td>
                      </tr>
                    ))}
                    {members.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                          لا يوجد أعضاء.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">الاستخدام (آخر 30 يومًا)</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">المؤشر</th>
                        <th className="px-3 py-2 text-left">القيمة</th>
                        <th className="px-3 py-2 text-left">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.slice(0, 12).map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{row.metric}</td>
                          <td className="px-3 py-2">{row.value}</td>
                          <td className="px-3 py-2 text-slate-600">{new Date(row.periodDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {usage.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={3}>
                            لا توجد سجلات استخدام حتى الآن.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">الفواتير</h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">رقم الفاتورة</th>
                        <th className="px-3 py-2 text-left">الحالة</th>
                        <th className="px-3 py-2 text-left">الإجمالي</th>
                        <th className="px-3 py-2 text-left">الاستحقاق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{row.invoiceNumber}</td>
                          <td className="px-3 py-2">{row.status}</td>
                          <td className="px-3 py-2">{currencyFormatter.format((row.totalCents ?? 0) / 100)}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : "-"}
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                            لا توجد فواتير.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
