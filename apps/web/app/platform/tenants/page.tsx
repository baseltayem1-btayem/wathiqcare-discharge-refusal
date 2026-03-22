"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { apiFetch } from "@/utils/api";

type TenantListItem = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    country?: string | null;
    billingEmail?: string | null;
    subscriptions?: Array<{
        id: string;
        status: string;
        seatLimit?: number;
        plan?: {
            code: string;
            name: string;
        };
    }>;
    _count?: {
        memberships?: number;
        cases?: number;
    };
};

export default function TenantsPage() {
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [tenants, setTenants] = useState<TenantListItem[]>([]);

    const [tenantForm, setTenantForm] = useState({
        name: "",
        code: "",
        billingEmail: "",
        ownerEmail: "",
        ownerFullName: "",
        ownerRole: "tenant_admin",
    });

    const [savingTenant, setSavingTenant] = useState(false);

    const loadTenants = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const result = await apiFetch<TenantListItem[]>("/api/tenants?limit=100", { cache: "no-store" });
            const list = Array.isArray(result) ? result : [];
            setTenants(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tenants");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadTenants();
    }, [loadTenants]);

    async function handleCreateTenant() {
        if (!tenantForm.name.trim() || !tenantForm.ownerEmail.trim()) {
            setError("Tenant name and tenant admin email are required");
            return;
        }

        setSavingTenant(true);
        setError("");
        setNotice("");

        try {
            await apiFetch("/api/tenants", {
                method: "POST",
                body: JSON.stringify({
                    name: tenantForm.name,
                    code: tenantForm.code || undefined,
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
                        seatLimit: 10,
                    },
                }),
            });

            setTenantForm({
                name: "",
                code: "",
                billingEmail: "",
                ownerEmail: "",
                ownerFullName: "",
                ownerRole: "tenant_admin",
            });
            setNotice("Tenant created successfully");
            await loadTenants();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create tenant");
        } finally {
            setSavingTenant(false);
        }
    }

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Tenant Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Create and manage customer tenants</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadTenants()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {notice ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

            <div className="grid gap-5 lg:grid-cols-2">
                {/* Create Tenant Form */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Plus className="h-4 w-4" />
                        <h3 className="text-base font-semibold text-slate-900">Create Tenant</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">Create tenant, initial tenant admin, and default subscription seat license.</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <input
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Tenant Name"
                            value={tenantForm.name}
                            onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <input
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Tenant Code (optional)"
                            value={tenantForm.code}
                            onChange={(e) => setTenantForm((p) => ({ ...p, code: e.target.value }))}
                        />
                        <input
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Billing Email"
                            value={tenantForm.billingEmail}
                            onChange={(e) => setTenantForm((p) => ({ ...p, billingEmail: e.target.value }))}
                        />
                        <input
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Tenant Admin Email"
                            value={tenantForm.ownerEmail}
                            onChange={(e) => setTenantForm((p) => ({ ...p, ownerEmail: e.target.value }))}
                        />
                        <input
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Tenant Admin Name"
                            value={tenantForm.ownerFullName}
                            onChange={(e) => setTenantForm((p) => ({ ...p, ownerFullName: e.target.value }))}
                        />
                        <select
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            value={tenantForm.ownerRole}
                            onChange={(e) => setTenantForm((p) => ({ ...p, ownerRole: e.target.value }))}
                        >
                            <option value="tenant_admin">tenant_admin</option>
                            <option value="tenant_owner">tenant_owner</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleCreateTenant()}
                        disabled={savingTenant}
                        className="mt-3 w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {savingTenant ? "Creating..." : "Create Tenant"}
                    </button>
                </div>

                {/* Tenants List */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" />
                        <h3 className="text-base font-semibold text-slate-900">Tenants ({tenants.length})</h3>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {tenants.length === 0 ? (
                            <p className="text-sm text-slate-500">No tenants yet</p>
                        ) : (
                            tenants.map((tenant) => (
                                <div key={tenant.id} className="rounded-lg border border-slate-200 p-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{tenant.name}</p>
                                            <p className="text-xs text-slate-500">{tenant.code}</p>
                                            {tenant.billingEmail && <p className="text-xs text-slate-500">{tenant.billingEmail}</p>}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${tenant.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                                            {tenant.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    {tenant.subscriptions && tenant.subscriptions.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                                            <p>Subscription: {tenant.subscriptions[0].plan?.name} ({tenant.subscriptions[0].status})</p>
                                            {tenant.subscriptions[0].seatLimit && <p>Seats: {tenant.subscriptions[0].seatLimit}</p>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
