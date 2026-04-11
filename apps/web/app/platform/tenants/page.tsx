"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, Shield, Users, X } from "lucide-react";
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

  const adminModalTenant = tenants.find((t) => t.id === adminModalTenantId) ?? null;

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

  async function handleAuthConfigToggle(
    tenant: TenantListItem,
    key: keyof TenantAuthConfig,
    nextValue: boolean,
  ) {
    const current = normalizeAuthConfig(tenant.authConfig);
    const nextConfig = { ...current, [key]: nextValue };

    try {
      await apiFetchJson(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ authConfig: nextConfig }),
      });

      setTenants((prev) =>
        prev.map((item) =>
          item.id === tenant.id
            ? {
                ...item,
                authConfig: nextConfig,
              }
            : item,
        ),
      );

      toast.success("Authentication configuration updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update authentication settings");
    }
  }

  function getSeats(tenant: TenantListItem): { used: number; limit: number } {
    const used = tenant._count?.memberships ?? 0;
    const limit = tenant.subscriptions?.[0]?.seatLimit ?? 0;
    return { used, limit };
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tenant Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Provision tenants, assign admins, and manage subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadTenants()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreateTenant((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Create Tenant
          </button>
        </div>
      </div>

      {showCreateTenant && (
        <div className="mb-5 rounded-2xl border border-purple-200 bg-purple-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-700" />
              <h3 className="text-sm font-semibold text-purple-900">Create New Tenant</h3>
            </div>
            <button type="button" onClick={() => setShowCreateTenant(false)} className="text-slate-400 hover:text-slate-600">
              <span className="sr-only">Close create tenant form</span>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tenant Name *</label>
              <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. King Faisal Hospital"
                value={tenantForm.name} onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tenant Code</label>
              <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Auto-generated if empty"
                value={tenantForm.code} onChange={(e) => setTenantForm((p) => ({ ...p, code: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Domain</label>
              <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. kfh.com"
                value={tenantForm.domain} onChange={(e) => setTenantForm((p) => ({ ...p, domain: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Billing Email</label>
              <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="billing@hospital.com"
                value={tenantForm.billingEmail} onChange={(e) => setTenantForm((p) => ({ ...p, billingEmail: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Email *</label>
              <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="admin@hospital.com"
                value={tenantForm.ownerEmail} onChange={(e) => setTenantForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Full Name</label>
              <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Dr. Mohammed Al-Rashid"
                value={tenantForm.ownerFullName} onChange={(e) => setTenantForm((p) => ({ ...p, ownerFullName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Admin Role</label>
              <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                title="Select admin role"
                value={tenantForm.ownerRole} onChange={(e) => setTenantForm((p) => ({ ...p, ownerRole: e.target.value }))}>
                <option value="tenant_admin">tenant_admin</option>
                <option value="tenant_owner">tenant_owner</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Seat Limit</label>
              <input type="number" min="1" max="500" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder="e.g. 10"
                value={tenantForm.seatLimit} onChange={(e) => setTenantForm((p) => ({ ...p, seatLimit: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreateTenant(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" onClick={() => void handleCreateTenant()} disabled={savingTenant}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              {savingTenant ? "Creating..." : "Create Tenant & Send Invite"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Tenants ({tenants.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Tenant</th>
                <th className="px-4 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Auth Methods</th>
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
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50">
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
                            <p className="text-xs text-slate-400">{sub.status}</p>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs">
                          <label className="inline-flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={authConfig.password_enabled}
                              onChange={(e) => void handleAuthConfigToggle(tenant, "password_enabled", e.target.checked)}
                            />
                            Password
                          </label>
                          <label className="inline-flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={authConfig.microsoft_sso_enabled}
                              onChange={(e) => void handleAuthConfigToggle(tenant, "microsoft_sso_enabled", e.target.checked)}
                            />
                            Microsoft SSO
                          </label>
                          <label className="inline-flex items-center gap-2 text-slate-700">
                            <input
                              type="checkbox"
                              checked={authConfig.secure_link_enabled}
                              onChange={(e) => void handleAuthConfigToggle(tenant, "secure_link_enabled", e.target.checked)}
                            />
                            Secure Link
                          </label>
                        </div>
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
                            onClick={() => { setAdminModalTenantId(tenant.id); setAdminForm(EMPTY_ADMIN_FORM); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Shield className="h-3 w-3" />Create Admin
                          </button>
                          <a href={`/platform/support?tenant=${tenant.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <Users className="h-3 w-3" />View Users
                          </a>
                          <button type="button"
                            onClick={() => void handleToggleActive(tenant.id, tenant.isActive)}
                            className={`rounded-lg border px-2 py-1 text-xs font-medium ${tenant.isActive ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
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
                <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Dr. Sarah Al-Dosari"
                  value={adminForm.fullName} onChange={(e) => setAdminForm((p) => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Email *</label>
                <input type="email" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="admin@hospital.com"
                  value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    title="Select tenant admin role"
                    value={adminForm.role} onChange={(e) => setAdminForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="tenant_admin">tenant_admin</option>
                    <option value="tenant_owner">tenant_owner</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Department</label>
                  <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Optional"
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
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleCreateAdmin()} disabled={savingAdmin}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                {savingAdmin ? "Creating..." : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
