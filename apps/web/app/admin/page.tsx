"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileSignature, Plus, RefreshCw, Save, Settings, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AccessDenied from "@/components/AccessDenied";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, isAuthenticationError, isForbiddenError } from "@/utils/api";

const INLINE_AUTH_REQUEST = { authFailureMode: "inline" as const };
const INLINE_NO_STORE_AUTH_REQUEST = { cache: "no-store" as const, authFailureMode: "inline" as const };

type AuthMeResponse = {
  claims?: {
    tenant_id?: string;
    platform_role?: string | null;
  };
  platformRole?: string | null;
  user?: {
    role?: string;
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

type MembersResponse = {
  members: MemberItem[];
  seatMetrics?: {
    seatLimit: number;
    activeUserCount: number;
    pendingUsersCount: number;
    availableSeats: number;
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
  summary?: {
    subscriptionStatus: string;
    planName: string;
    seatLimit: number;
    activeUserCount: number;
    pendingUsersCount: number;
    availableSeats: number;
    startDate: string;
    endDate: string;
    gracePeriodDays: number;
  };
};

type DepartmentItem = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

type PermissionItem = {
  id: string;
  key: string;
  name: string;
  module: string;
};

type TenantRoleItem = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE";
  permissions: Array<{
    permissionId: string;
    permission: PermissionItem;
  }>;
};

type RoleEditItem = {
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
};

type RolesResponse = {
  roles: TenantRoleItem[];
  permissions: PermissionItem[];
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
const MEMBER_ROLE_OPTIONS = [
  "tenant_owner",
  "tenant_admin",
  "doctor",
  "nursing",
  "lab_tech",
  "pharmacist",
  "finance_officer",
  "reception",
  "legal_admin",
  "it_admin",
  "medical_director",
  "bed_manager",
  "viewer",
] as const;

export default function AdminPage() {
  const { t } = useI18n();

  const [tenantId, setTenantId] = useState("");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [seatMetrics, setSeatMetrics] = useState<MembersResponse["seatMetrics"] | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [tenantRoles, setTenantRoles] = useState<TenantRoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [rolePermissionSelections, setRolePermissionSelections] = useState<Record<string, string[]>>({});
  const [roleEdits, setRoleEdits] = useState<Record<string, RoleEditItem>>({});
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
    role: "doctor",
    activateNow: false,
    departmentCode: "",
    tenantRoleCodes: [] as string[],
  });

  const [departmentForm, setDepartmentForm] = useState({
    code: "",
    name: "",
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    cloneFromRoleId: "",
  });

  const [createTenantForm, setCreateTenantForm] = useState({
    name: "",
    code: "",
    country: "SA",
    timezone: "Asia/Riyadh",
    billingEmail: "",
    ownerEmail: "",
    ownerFullName: "",
    ownerRole: "tenant_owner",
  });

  const [loading, setLoading] = useState(true);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [savingRoleMatrixByRoleId, setSavingRoleMatrixByRoleId] = useState<Record<string, boolean>>({});
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingRoleEditsByRoleId, setSavingRoleEditsByRoleId] = useState<Record<string, boolean>>({});
  const [deletingRoleByRoleId, setDeletingRoleByRoleId] = useState<Record<string, boolean>>({});
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [suspendingTenantId, setSuspendingTenantId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState("");

  const [isSetupWizardMode, setIsSetupWizardMode] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [bootstrapForm, setBootstrapForm] = useState({
    adminEmail: "",
    adminFullName: "",
    password: "",
    setupSecret: "",
  });

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
      { label: "Nursing", value: roleCount("nursing") },
      { label: "Reception", value: roleCount("reception") },
      { label: "Legal Admin", value: roleCount("legal_admin") },
    ];
  }, [members]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    setNotice("");

    try {
      const me = await apiFetch<AuthMeResponse>("/api/auth/me", INLINE_NO_STORE_AUTH_REQUEST);
      const resolvedTenantId = me?.claims?.tenant_id;
      const platformRole = me?.platformRole ?? me?.claims?.platform_role ?? null;
      const platformAdmin = Boolean(platformRole);
      setIsPlatformAdmin(platformAdmin);

      const tenantsData = await apiFetch<TenantListItem[]>('/api/tenants?limit=50', INLINE_NO_STORE_AUTH_REQUEST);
      const tenantList = Array.isArray(tenantsData) ? tenantsData : [];
      setManagedTenants(tenantList);

      const selected =
        selectedTenantId ||
        resolvedTenantId ||
        tenantList[0]?.id ||
        "";

      if (!selected) {
        setIsSetupWizardMode(true);
        return;
      }

      setTenantId(selected);
      setSelectedTenantId(selected);

      const [tenantData, memberData, subscriptionData, usageData, invoiceData, integrationsData, departmentsData, rolesData] = await Promise.all([
        apiFetch<TenantSummary>(`/api/tenants/${selected}`, INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<MembersResponse>(`/api/tenants/${selected}/members`, INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<SubscriptionView>(`/api/tenants/${selected}/subscription`, INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<UsageItem[]>(`/api/tenants/${selected}/usage?days=30&limit=100`, INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<InvoiceItem[]>("/api/billing/invoices?limit=20", INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<IntegrationStatus>('/api/integrations/status', INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<DepartmentItem[]>(`/api/tenants/${selected}/departments`, INLINE_NO_STORE_AUTH_REQUEST),
        apiFetch<RolesResponse>(`/api/tenants/${selected}/roles`, INLINE_NO_STORE_AUTH_REQUEST),
      ]);

      setTenant(tenantData);
      setMembers(Array.isArray(memberData?.members) ? memberData.members : []);
      setSeatMetrics(memberData?.seatMetrics ?? null);
      setSubscription(subscriptionData);
      setUsage(usageData);
      setInvoices(invoiceData);
      setIntegrationStatus(integrationsData ?? null);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setTenantRoles(Array.isArray(rolesData?.roles) ? rolesData.roles : []);
      setPermissions(Array.isArray(rolesData?.permissions) ? rolesData.permissions : []);

      const nextRoleSelections = Object.fromEntries(
        (Array.isArray(rolesData?.roles) ? rolesData.roles : []).map((role) => [
          role.id,
          role.permissions.map((item) => item.permissionId),
        ]),
      );
      setRolePermissionSelections(nextRoleSelections);

      const nextRoleEdits = Object.fromEntries(
        (Array.isArray(rolesData?.roles) ? rolesData.roles : []).map((role) => [
          role.id,
          {
            name: role.name,
            description: role.description ?? "",
            status: role.status,
          },
        ]),
      );
      setRoleEdits(nextRoleEdits);

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
      if (isForbiddenError(err)) {
        setForbidden(true);
      } else if (isAuthenticationError(err)) {
        setError("تعذر التحقق من الجلسة الحالية. أبقينا الصفحة مفتوحة لعرض الخطأ داخل الصفحة بدلاً من إعادتك إلى تسجيل الدخول.");
      } else {
        setError(err instanceof Error ? err.message : "فشل تحميل لوحة إدارة المنصة.");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  async function handleBootstrap() {
    setBootstrapError("");
    if (!bootstrapForm.adminEmail || !bootstrapForm.adminFullName || !bootstrapForm.password) {
      setBootstrapError("جميع الحقول مطلوبة");
      return;
    }
    setBootstrapping(true);
    try {
      await apiFetch("/api/admin/setup/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          adminEmail: bootstrapForm.adminEmail,
          adminFullName: bootstrapForm.adminFullName,
          password: bootstrapForm.password,
          setupSecret: bootstrapForm.setupSecret || undefined,
        }),
        authFailureMode: "inline" as const,
      });
      setBootstrapDone(true);
      setIsSetupWizardMode(false);
      await loadDashboard();
    } catch (err) {
      setBootstrapError(err instanceof Error ? err.message : "فشل إعداد المنصة");
    } finally {
      setBootstrapping(false);
    }
  }

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
        ...INLINE_AUTH_REQUEST,
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
        ...INLINE_AUTH_REQUEST,
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
        ...INLINE_AUTH_REQUEST,
      });
      setNotice("تمت إضافة العضو");
      setMemberForm({ email: "", fullName: "", role: "doctor", activateNow: false, departmentCode: "", tenantRoleCodes: [] });
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
          initialOwner: {
            email: createTenantForm.ownerEmail || undefined,
            fullName: createTenantForm.ownerFullName || undefined,
            role: createTenantForm.ownerRole || "tenant_owner",
          },
        }),
        ...INLINE_AUTH_REQUEST,
      });

      setNotice('تم إنشاء مستشفى جديدة بنجاح');
      setCreateTenantForm({
        name: '',
        code: '',
        country: 'SA',
        timezone: 'Asia/Riyadh',
        billingEmail: '',
        ownerEmail: '',
        ownerFullName: '',
        ownerRole: 'tenant_owner',
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
        ...INLINE_AUTH_REQUEST,
      });
      setNotice(currentlyActive ? 'تم تعليق المستشفى' : 'تمت إعادة تفعيل المستشفى');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث حالة المستشفى');
    } finally {
      setSuspendingTenantId(null);
    }
  }

  async function handleSaveDepartment() {
    if (!tenantId) return;
    if (!departmentForm.code.trim() || !departmentForm.name.trim()) {
      setError("Department code and name are required");
      return;
    }

    setSavingDepartment(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/tenants/${tenantId}/departments`, {
        method: "POST",
        body: JSON.stringify(departmentForm),
        ...INLINE_AUTH_REQUEST,
      });
      setDepartmentForm({ code: "", name: "" });
      setNotice("Department updated");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save department");
    } finally {
      setSavingDepartment(false);
    }
  }

  async function handleCreateRole() {
    if (!tenantId) return;
    if (!roleForm.name.trim()) {
      setError("Role name is required");
      return;
    }

    setSavingRole(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/tenants/${tenantId}/roles`, {
        method: "POST",
        body: JSON.stringify({
          ...roleForm,
          cloneFromRoleId: roleForm.cloneFromRoleId || undefined,
        }),
        ...INLINE_AUTH_REQUEST,
      });
      setRoleForm({ name: "", code: "", description: "", cloneFromRoleId: "" });
      setNotice("Role created");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleSaveRoleMatrixRow(roleId: string) {
    if (!tenantId || !roleId) return;
    setError("");
    setNotice("");
    setSavingRoleMatrixByRoleId((prev) => ({ ...prev, [roleId]: true }));

    try {
      await apiFetch(`/api/tenants/${tenantId}/roles/${roleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionIds: rolePermissionSelections[roleId] || [] }),
        ...INLINE_AUTH_REQUEST,
      });
      setNotice("Permission matrix row saved");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role permissions");
    } finally {
      setSavingRoleMatrixByRoleId((prev) => ({ ...prev, [roleId]: false }));
    }
  }

  async function handleSaveRoleDetails(roleId: string) {
    if (!tenantId || !roleId) return;
    const draft = roleEdits[roleId];
    if (!draft?.name?.trim()) {
      setError("Role name is required");
      return;
    }

    setError("");
    setNotice("");
    setSavingRoleEditsByRoleId((prev) => ({ ...prev, [roleId]: true }));

    try {
      await apiFetch(`/api/tenants/${tenantId}/roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          status: draft.status,
        }),
        ...INLINE_AUTH_REQUEST,
      });
      setNotice("Role updated");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingRoleEditsByRoleId((prev) => ({ ...prev, [roleId]: false }));
    }
  }

  async function handleDuplicateRole(roleId: string) {
    if (!tenantId) return;
    const sourceRole = tenantRoles.find((role) => role.id === roleId);
    if (!sourceRole) return;

    setSavingRole(true);
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/tenants/${tenantId}/roles`, {
        method: "POST",
        body: JSON.stringify({
          name: `${sourceRole.name} Copy`,
          cloneFromRoleId: roleId,
          description: sourceRole.description || undefined,
          status: sourceRole.status,
        }),
        ...INLINE_AUTH_REQUEST,
      });
      setNotice("Role duplicated");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!tenantId) return;

    setDeletingRoleByRoleId((prev) => ({ ...prev, [roleId]: true }));
    setError("");
    setNotice("");
    try {
      await apiFetch(`/api/tenants/${tenantId}/roles/${roleId}`, {
        method: "DELETE",
        ...INLINE_AUTH_REQUEST,
      });
      setNotice("Role deleted");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setDeletingRoleByRoleId((prev) => ({ ...prev, [roleId]: false }));
    }
  }

  function toggleRolePermission(roleId: string, permissionId: string, checked: boolean) {
    setRolePermissionSelections((prev) => {
      const current = prev[roleId] || [];
      const next = checked
        ? (current.includes(permissionId) ? current : [...current, permissionId])
        : current.filter((item) => item !== permissionId);
      return {
        ...prev,
        [roleId]: next,
      };
    });
  }

  async function handleToggleMember(member: MemberItem, activate: boolean) {
    if (!tenantId) return;
    setError("");
    setNotice("");

    try {
      await apiFetch(`/api/tenants/${tenantId}/members`, {
        method: "PATCH",
        body: JSON.stringify({
          memberId: member.id,
          activate,
        }),
        ...INLINE_AUTH_REQUEST,
      });
      setNotice(activate ? "User activated" : "User deactivated");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    }
  }

  if (forbidden) {
    return (
      <AuthGuard authFailureMode="inline">
        <AppShell title="إدارة المنصة" subtitle="إدارة المستأجر والاشتراك والأعضاء والاستخدام والفوترة">
          <AccessDenied resource="لوحة إدارة المنصة" />
        </AppShell>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard authFailureMode="inline">
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

        {!loading && isSetupWizardMode && !bootstrapDone ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-blue-900">إعداد المنصة لأول مرة</h2>
            </div>
            <p className="text-sm text-blue-800">
              لم يتم اكتشاف أي مستشفى أو حساب إداري. أدخل بيانات المسؤول الأول لتهيئة المنصة.
            </p>
            {bootstrapError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{bootstrapError}</div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">البريد الإلكتروني للمسؤول *</label>
                <input
                  type="email"
                  value={bootstrapForm.adminEmail}
                  onChange={(e) => setBootstrapForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="admin@hospital.org"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={bootstrapForm.adminFullName}
                  onChange={(e) => setBootstrapForm((f) => ({ ...f, adminFullName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Dr. Mohammed Al-Anazi"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">كلمة المرور (12 حرفًا على الأقل) *</label>
                <input
                  type="password"
                  value={bootstrapForm.password}
                  onChange={(e) => setBootstrapForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">رمز الإعداد (اختياري إذا تم تهيئته)</label>
                <input
                  type="password"
                  value={bootstrapForm.setupSecret}
                  onChange={(e) => setBootstrapForm((f) => ({ ...f, setupSecret: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ADMIN_SETUP_SECRET"
                  autoComplete="off"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleBootstrap()}
              disabled={bootstrapping}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {bootstrapping ? "جار الإعداد..." : "بدء إعداد المنصة"}
            </button>
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
                <h2 className="text-base font-semibold text-slate-900">Departments</h2>
                <p className="mt-1 text-sm text-slate-600">Tenant admins can manage internal departments only.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Code"
                    value={departmentForm.code}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Name"
                    value={departmentForm.name}
                    onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveDepartment()}
                    disabled={savingDepartment}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingDepartment ? "Saving..." : "Save Department"}
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Code</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((department) => (
                        <tr key={department.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{department.code}</td>
                          <td className="px-3 py-2 text-slate-700">{department.name}</td>
                          <td className="px-3 py-2 text-slate-600">{department.isActive ? "ACTIVE" : "INACTIVE"}</td>
                        </tr>
                      ))}
                      {departments.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={3}>
                            No departments defined yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h2 className="text-base font-semibold text-slate-900">Role & Permission Matrix</h2>
                <p className="mt-1 text-sm text-slate-600">Database-driven tenant role templates and permission checkboxes.</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Role name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Role code (optional)"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, code: e.target.value }))}
                  />
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={roleForm.cloneFromRoleId}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, cloneFromRoleId: e.target.value }))}
                  >
                    <option value="">Clone from (optional)</option>
                    {tenantRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleCreateRole()}
                    disabled={savingRole}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingRole ? "Saving..." : "Create Role"}
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Role</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Permission Matrix</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantRoles.map((role) => {
                        const draft = roleEdits[role.id] ?? {
                          name: role.name,
                          description: role.description ?? "",
                          status: role.status,
                        };
                        const selectedForRole = rolePermissionSelections[role.id] || [];
                        const groupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((acc, permission) => {
                          const moduleName = permission.module || "system";
                          if (!acc[moduleName]) {
                            acc[moduleName] = [];
                          }
                          acc[moduleName].push(permission);
                          return acc;
                        }, {});

                        return (
                          <tr key={role.id} className="border-t border-slate-100 align-top">
                            <td className="px-3 py-3">
                              <div className="space-y-2">
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={draft.name}
                                  onChange={(e) =>
                                    setRoleEdits((prev) => ({
                                      ...prev,
                                      [role.id]: {
                                        ...draft,
                                        name: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Role name"
                                />
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                  value={draft.description}
                                  onChange={(e) =>
                                    setRoleEdits((prev) => ({
                                      ...prev,
                                      [role.id]: {
                                        ...draft,
                                        description: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Role description"
                                />
                                <p className="text-xs text-slate-500">Code: {role.code}</p>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <select
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                value={draft.status}
                                onChange={(e) =>
                                  setRoleEdits((prev) => ({
                                    ...prev,
                                    [role.id]: {
                                      ...draft,
                                      status: e.target.value as "ACTIVE" | "INACTIVE",
                                    },
                                  }))
                                }
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
                                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                                  <div key={module} className="mb-2 last:mb-0">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{module}</p>
                                    <div className="grid gap-1 sm:grid-cols-2">
                                      {modulePermissions.map((permission) => (
                                        <label key={`${role.id}-${permission.id}`} className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-xs">
                                          <input
                                            type="checkbox"
                                            checked={selectedForRole.includes(permission.id)}
                                            onChange={(e) => toggleRolePermission(role.id, permission.id, e.target.checked)}
                                          />
                                          <span>{permission.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveRoleDetails(role.id)}
                                  disabled={savingRoleEditsByRoleId[role.id] === true}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {savingRoleEditsByRoleId[role.id] ? "Saving..." : "Save Role"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveRoleMatrixRow(role.id)}
                                  disabled={savingRoleMatrixByRoleId[role.id] === true}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  {savingRoleMatrixByRoleId[role.id] ? "Saving..." : "Save Permissions"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDuplicateRole(role.id)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                                >
                                  Duplicate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteRole(role.id)}
                                  disabled={deletingRoleByRoleId[role.id] === true}
                                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                                >
                                  {deletingRoleByRoleId[role.id] ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {tenantRoles.length === 0 ? (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                            No roles defined yet. Create your first role to start building the permission matrix.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
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
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${row.level === "high"
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
                  {isPlatformAdmin ? (
                    <>
                      <select
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={selectedTenantId}
                        onChange={(e) => setSelectedTenantId(e.target.value)}
                      >
                        {managedTenants.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.code})
                          </option>
                        ))}
                      </select>
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
                      <input
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Initial Owner Email"
                        value={createTenantForm.ownerEmail}
                        onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                      />
                      <input
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Initial Owner Name"
                        value={createTenantForm.ownerFullName}
                        onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, ownerFullName: e.target.value }))}
                      />
                      <select
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={createTenantForm.ownerRole}
                        onChange={(e) => setCreateTenantForm((prev) => ({ ...prev, ownerRole: e.target.value }))}
                      >
                        <option value="tenant_owner">tenant_owner</option>
                        <option value="tenant_admin">tenant_admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleCreateTenant()}
                        disabled={creatingTenant}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        {creatingTenant ? 'جار الإنشاء...' : 'Create Tenant'}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:col-span-2">
                      You can manage only your tenant users, departments, roles, and permissions.
                    </div>
                  )}
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
                            {isPlatformAdmin ? (
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
                            ) : (
                              <span className="text-xs text-slate-500">Tenant scope only</span>
                            )}
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Licensed Seats</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{subscription?.summary?.seatLimit ?? seatMetrics?.seatLimit ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Used Seats</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{subscription?.summary?.activeUserCount ?? seatMetrics?.activeUserCount ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Available Seats</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">{subscription?.summary?.availableSeats ?? seatMetrics?.availableSeats ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Pending Users</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-700">{subscription?.summary?.pendingUsersCount ?? seatMetrics?.pendingUsersCount ?? 0}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <label className="text-sm text-slate-700">
                  الخطة
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={subscriptionForm.planCode}
                    disabled={!isPlatformAdmin}
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
                    disabled={!isPlatformAdmin}
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
                    disabled={!isPlatformAdmin}
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
                    disabled={!isPlatformAdmin}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        seatLimit: Number(e.target.value) || 1,
                      }))
                    }
                  />
                </label>
              </div>

              {isPlatformAdmin ? (
                <button
                  type="button"
                  onClick={() => void handleSaveSubscription()}
                  disabled={savingSubscription}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSubscription ? "جار الحفظ..." : "حفظ الاشتراك"}
                </button>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Subscription settings are managed by WathiqCare platform admin.</p>
              )}
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

              <div className="grid gap-3 md:grid-cols-6">
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
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={memberForm.departmentCode}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, departmentCode: e.target.value }))}
                >
                  <option value="">Department</option>
                  {departments.filter((item) => item.isActive).map((department) => (
                    <option key={department.id} value={department.code}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={memberForm.tenantRoleCodes[0] ?? ""}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, tenantRoleCodes: e.target.value ? [e.target.value] : [] }))}
                >
                  <option value="">Tenant role</option>
                  {tenantRoles.filter((role) => role.status === "ACTIVE").map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={memberForm.activateNow}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, activateNow: e.target.checked }))}
                  />
                  Activate now
                </label>
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
                      <th className="px-3 py-2 text-left">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{member.user.fullName}</td>
                        <td className="px-3 py-2 text-slate-600">{member.user.email}</td>
                        <td className="px-3 py-2">{member.role}</td>
                        <td className="px-3 py-2">{member.status}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleMember(member, !(member.status === "ACTIVE" && member.user.isActive))}
                            className={member.status === "ACTIVE" && member.user.isActive
                              ? "rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
                              : "rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"}
                          >
                            {member.status === "ACTIVE" && member.user.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
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
