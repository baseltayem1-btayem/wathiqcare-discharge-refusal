"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Building2, Lock, Plus, RefreshCw, Shield, Users, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";

type TenantSubscription = {
  id: string;
  status: string;
  seatLimit?: number;
  plan?: { code: string; name: string };
};

type TenantListItem = {
  id: string;
  code: string;
  name: string;
  domain?: string | null;
  metadata?: Record<string, unknown> | null;
  authConfig?: {
    password_enabled?: boolean;
    microsoft_sso_enabled?: boolean;
    secure_link_enabled?: boolean;
  } | null;
  isActive: boolean;
  country?: string | null;
  billingEmail?: string | null;
  subscriptions?: TenantSubscription[];
  _count?: { memberships?: number; cases?: number };
};

type TenantAuthConfig = {
  password_enabled: boolean;
  microsoft_sso_enabled: boolean;
  secure_link_enabled: boolean;
};

const DEFAULT_AUTH_CONFIG: TenantAuthConfig = {
  password_enabled: true,
  microsoft_sso_enabled: false,
  secure_link_enabled: false,
};

function normalizeAuthConfig(input: TenantListItem["authConfig"]): TenantAuthConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_AUTH_CONFIG };
  }

  return {
    password_enabled:
      typeof input.password_enabled === "boolean"
        ? input.password_enabled
        : DEFAULT_AUTH_CONFIG.password_enabled,
    microsoft_sso_enabled:
      typeof input.microsoft_sso_enabled === "boolean"
        ? input.microsoft_sso_enabled
        : DEFAULT_AUTH_CONFIG.microsoft_sso_enabled,
    secure_link_enabled:
      typeof input.secure_link_enabled === "boolean"
        ? input.secure_link_enabled
        : DEFAULT_AUTH_CONFIG.secure_link_enabled,
  };
}

const EMPTY_TENANT_FORM = {
  name: "",
  code: "",
  billingEmail: "",
  ownerEmail: "",
  ownerFullName: "",
  ownerRole: "tenant_admin",
  domain: "",
  seatLimit: "10",
};

const EMPTY_ADMIN_FORM = {
  fullName: "",
  email: "",
  role: "tenant_admin",
  department: "",
  sendInvite: true,
  isActive: true,
};

export default function TenantsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [tenants, setTenants] = useState<TenantListItem[]>([]);

  // Create tenant form
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT_FORM);
  const [savingTenant, setSavingTenant] = useState(false);
  const [showCreateTenant, setShowCreateTenant] = useState(false);

  // Create admin modal
  const [adminModalTenantId, setAdminModalTenantId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState(EMPTY_ADMIN_FORM);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Login settings modal
  const [loginSettingsTenantId, setLoginSettingsTenantId] = useState<string | null>(null);
  const [loginSettingsForm, setLoginSettingsForm] = useState<TenantAuthConfig>({ ...DEFAULT_AUTH_CONFIG });
  const [savingLoginSettings, setSavingLoginSettings] = useState(false);
  const [loginSettingsError, setLoginSettingsError] = useState<string | null>(null);

  const adminModalTenant = tenants.find((t) => t.id === adminModalTenantId) ?? null;
  const loginSettingsTenant = tenants.find((t) => t.id === loginSettingsTenantId) ?? null;

  const loadTenants = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await apiFetchJson<TenantListItem[]>("/api/tenants?limit=100", { cache: "no-store" });
      setTenants(Array.isArray(result) ? result : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  async function handleCreateTenant() {
    if (!tenantForm.name.trim() || !tenantForm.ownerEmail.trim()) {
      toast.error("Tenant name and admin email are required");
      return;
    }
    setSavingTenant(true);
    try {
      await apiFetchJson("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: tenantForm.name,
          code: tenantForm.code || undefined,
          domain: tenantForm.domain || null,
          billingEmail: tenantForm.billingEmail || null,
          initialOwner: {
            email: tenantForm.ownerEmail,
            fullName: tenantForm.ownerFullName || tenantForm.ownerEmail,
            role: tenantForm.ownerRole,
          },
          subscription: {
            planCode: "STARTER",
            billingInterval: "MONTHLY",
            status: "TRIALING",
            seatLimit: Number(tenantForm.seatLimit) || 10,
          },
        }),
      });
      setTenantForm(EMPTY_TENANT_FORM);
      setShowCreateTenant(false);
      toast.success("Tenant created successfully");
      await loadTenants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setSavingTenant(false);
    }
  }

  async function handleCreateAdmin() {
    if (!adminModalTenantId) return;
    if (!adminForm.email.trim() || !adminForm.fullName.trim()) {
      toast.error("Full name and email are required");
      return;
    }
    setSavingAdmin(true);
    try {
      await apiFetchJson(`/api/platform/tenants/${adminModalTenantId}/admins/create`, {
        method: "POST",
        body: JSON.stringify(adminForm),
      });
      setAdminModalTenantId(null);
      setAdminForm(EMPTY_ADMIN_FORM);
      toast.success("Tenant admin created and invite sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await apiFetchJson(`/api/platform/tenants/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(`Tenant ${currentActive ? "deactivated" : "activated"}`);
      setTenants((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !currentActive } : t)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tenant");
    }
  }

  function openLoginSettings(tenant: TenantListItem) {
    setLoginSettingsTenantId(tenant.id);
    setLoginSettingsForm(normalizeAuthConfig(tenant.authConfig));
    setLoginSettingsError(null);
  }

  function closeLoginSettings() {
    setLoginSettingsTenantId(null);
    setLoginSettingsForm({ ...DEFAULT_AUTH_CONFIG });
    setLoginSettingsError(null);
  }

  function getEnabledAuthMethods(config: TenantAuthConfig): string[] {
    const methods: string[] = [];
    if (config.password_enabled) methods.push("Password Login");
    if (config.microsoft_sso_enabled) methods.push("Microsoft SSO");
    if (config.secure_link_enabled) methods.push("Secure Link");
    return methods;
  }

  function handleLoginSettingsToggle(key: keyof TenantAuthConfig, value: boolean) {
    const newConfig = { ...loginSettingsForm, [key]: value };
    const enabledMethods = getEnabledAuthMethods(newConfig);

    if (enabledMethods.length === 0) {
      setLoginSettingsError("At least one authentication method must be enabled");
      return;
    }

    // Validate Microsoft SSO configuration if enabling it
    if (key === "microsoft_sso_enabled" && value === true) {
      if (!loginSettingsTenant?.metadata) {
        setLoginSettingsError(
          "Microsoft SSO requires valid Azure AD configuration. Please configure it first."
        );
        return;
      }
    }

    setLoginSettingsError(null);
    setLoginSettingsForm(newConfig);
  }

  async function handleSaveLoginSettings() {
    if (!loginSettingsTenantId) return;

    const enabledMethods = getEnabledAuthMethods(loginSettingsForm);
    if (enabledMethods.length === 0) {
      setLoginSettingsError("At least one authentication method must be enabled");
      return;
    }

    setSavingLoginSettings(true);
    try {
      await apiFetchJson(`/api/tenants/${loginSettingsTenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ authConfig: loginSettingsForm }),
      });

      setTenants((prev) =>
        prev.map((item) =>
          item.id === loginSettingsTenantId
            ? {
                ...item,
                authConfig: loginSettingsForm,
              }
            : item,
        ),
      );

      toast.success("Login settings updated successfully");
      closeLoginSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update login settings");
    } finally {
      setSavingLoginSettings(false);
    }
  }

  function getSeats(tenant: TenantListItem): { used: number; limit: number } {
    const used = tenant._count?.memberships ?? 0;
    const limit = tenant.subscriptions?.[0]?.seatLimit ?? 0;
    return { used, limit };
  }

  return (
    <>
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Tenant Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Provision tenants, assign admins, and manage subscriptions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTenants()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateTenant((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
          >
            <Plus className="h-4 w-4" />
            Create Tenant
          </button>
        </div>
      </div>
      </div>

      {showCreateTenant && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--primary)]" />
              <h3 className="text-sm font-semibold text-slate-900">Create New Tenant</h3>
            </div>
            <button type="button" onClick={() => setShowCreateTenant(false)} className="text-slate-400 hover:text-slate-600">
              <span className="sr-only">Close create tenant form</span>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tenant Name *</label>
              <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. King Faisal Hospital"
                value={tenantForm.name} onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tenant Code</label>
              <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Auto-generated if empty"
                value={tenantForm.code} onChange={(e) => setTenantForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Domain</label>
              <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. kfh.com"
                value={tenantForm.domain} onChange={(e) => setTenantForm((p) => ({ ...p, domain: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Billing Email</label>
              <input type="email" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="billing@hospital.com"
                value={tenantForm.billingEmail} onChange={(e) => setTenantForm((p) => ({ ...p, billingEmail: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Email *</label>
              <input type="email" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="admin@hospital.com"
                value={tenantForm.ownerEmail} onChange={(e) => setTenantForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Full Name</label>
              <input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Dr. Mohammed Al-Rashid"
                value={tenantForm.ownerFullName} onChange={(e) => setTenantForm((p) => ({ ...p, ownerFullName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Role</label>
              <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                title="Select admin role"
                value={tenantForm.ownerRole} onChange={(e) => setTenantForm((p) => ({ ...p, ownerRole: e.target.value }))}>
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_owner">tenant_owner</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Seat Limit</label>
              <input type="number" min="1" max="500" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. 10"
                value={tenantForm.seatLimit} onChange={(e) => setTenantForm((p) => ({ ...p, seatLimit: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreateTenant(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={() => void handleCreateTenant()} disabled={savingTenant}
              className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50">
              {savingTenant ? "Creating..." : "Create Tenant & Send Invite"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Tenants ({tenants.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Tenant</th>
                <th className="px-4 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Login Methods</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Cases</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No tenants found</td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                  const seats = getSeats(tenant);
                  const sub = tenant.subscriptions?.[0];
                  const seatsAvailable = seats.limit > 0 ? seats.limit - seats.used : 0;
                  const authConfig = normalizeAuthConfig(tenant.authConfig);
                  const enabledMethods = getEnabledAuthMethods(authConfig);
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{tenant.name}</p>
                        <p className="text-xs text-slate-400">{tenant.code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tenant.domain ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tenant.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {tenant.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <div>
                            <p className="text-slate-700">{sub.plan?.name ?? sub.plan?.code ?? "—"}</p>
                            <p className="text-xs text-slate-500">{sub.status}</p>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {enabledMethods.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {enabledMethods.map((method) => (
                              <span key={method} className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                                <Lock className="h-3 w-3" />
                                {method}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700">{seats.used}</span>
                        <span className="text-slate-400">/{seats.limit}</span>
                        <p className="text-xs text-slate-400">{seatsAvailable} avail.</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{tenant._count?.cases ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button type="button"
                            onClick={() => openLoginSettings(tenant)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)] hover:bg-[#e3eef9]"
                            title="Configure login methods">
                            <Lock className="h-3 w-3" />
                            Login Settings
                          </button>
                          <button type="button"
                            onClick={() => { setAdminModalTenantId(tenant.id); setAdminForm(EMPTY_ADMIN_FORM); }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Shield className="h-3 w-3" />Create Admin
                          </button>
                          <a href={`/platform/support?tenant=${tenant.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Users className="h-3 w-3" />View Users
                          </a>
                          <button type="button"
                            onClick={() => void handleToggleActive(tenant.id, tenant.isActive)}
                            className={`rounded-md border px-2 py-1 text-xs font-medium ${tenant.isActive ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-slate-300 bg-white text-[var(--primary)] hover:bg-slate-50"}`}>
                            {tenant.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adminModalTenantId && adminModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Create Tenant Admin</h3>
                <p className="mt-0.5 text-xs text-slate-500">For: {adminModalTenant.name}</p>
              </div>
              <button type="button" onClick={() => setAdminModalTenantId(null)} className="text-slate-400 hover:text-slate-600">
                <span className="sr-only">Close create admin dialog</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Full Name *</label>
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Dr. Sarah Al-Dosari"
                  value={adminForm.fullName} onChange={(e) => setAdminForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Email *</label>
                <input type="email" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="admin@hospital.com"
                  value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
                  <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    title="Select tenant admin role"
                    value={adminForm.role} onChange={(e) => setAdminForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="tenant_admin">tenant_admin</option>
                    <option value="tenant_owner">tenant_owner</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Department</label>
                  <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional"
                    value={adminForm.department} onChange={(e) => setAdminForm((p) => ({ ...p, department: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="rounded border-slate-300" checked={adminForm.sendInvite}
                    onChange={(e) => setAdminForm((p) => ({ ...p, sendInvite: e.target.checked }))} />
                  Send invitation email
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="rounded border-slate-300" checked={adminForm.isActive}
                    onChange={(e) => setAdminForm((p) => ({ ...p, isActive: e.target.checked }))} />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => setAdminModalTenantId(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleCreateAdmin()} disabled={savingAdmin}
                className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50">
                {savingAdmin ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loginSettingsTenantId && loginSettingsTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Login Settings</h3>
                <p className="mt-0.5 text-xs text-slate-500">For: {loginSettingsTenant.name}</p>
              </div>
              <button type="button" onClick={() => closeLoginSettings()} className="text-slate-400 hover:text-slate-600">
                <span className="sr-only">Close login settings dialog</span>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Enabled Methods Summary */}
              <div className="rounded-lg border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] p-3">
                <p className="mb-2 text-xs font-medium text-[var(--primary)]">Active Login Methods</p>
                <div className="flex flex-wrap gap-1">
                  {getEnabledAuthMethods(loginSettingsForm).length > 0 ? (
                    getEnabledAuthMethods(loginSettingsForm).map((method) => (
                      <span key={method} className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                        <Lock className="h-3 w-3" />
                        {method}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--primary)]">None selected</span>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {loginSettingsError && (
                <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                  <p className="text-xs text-rose-700">{loginSettingsError}</p>
                </div>
              )}

              {/* Auth Method Toggles */}
              <div className="space-y-3">
                <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Password Login</p>
                    <p className="mt-0.5 text-xs text-slate-500">Allow users to sign in with email and password</p>
                  </div>
                  <label className="ml-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={loginSettingsForm.password_enabled}
                      onChange={(e) => handleLoginSettingsToggle("password_enabled", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="sr-only">Toggle password login</span>
                  </label>
                </div>

                <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Microsoft SSO</p>
                    <p className="mt-0.5 text-xs text-slate-500">Allow users to sign in with Microsoft account</p>
                  </div>
                  <label className="ml-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={loginSettingsForm.microsoft_sso_enabled}
                      onChange={(e) => handleLoginSettingsToggle("microsoft_sso_enabled", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="sr-only">Toggle Microsoft SSO</span>
                  </label>
                </div>

                <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">Secure Link (Magic Link)</p>
                    <p className="mt-0.5 text-xs text-slate-500">Allow users to sign in with email link</p>
                  </div>
                  <label className="ml-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={loginSettingsForm.secure_link_enabled}
                      onChange={(e) => handleLoginSettingsToggle("secure_link_enabled", e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="sr-only">Toggle secure link login</span>
                  </label>
                </div>
              </div>

              {/* Info Message */}
              <div className="rounded-lg border border-[var(--primary-soft-border)] bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  <strong>Note:</strong> Changes will be reflected immediately on the login page for this tenant.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => closeLoginSettings()}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleSaveLoginSettings()} disabled={savingLoginSettings}
                className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50">
                {savingLoginSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
