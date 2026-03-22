"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CreditCard, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AccessDenied from "@/components/AccessDenied";
import { apiFetch } from "@/utils/api";

type AuthMeResponse = {
    platformRole?: string | null;
    userType?: "platform_admin" | "tenant_admin" | "tenant_user";
};

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

type InvoiceItem = {
    id: string;
    invoiceNumber: string;
    status: string;
    totalCents: number;
    amountDueCents: number;
    dueAt?: string | null;
};

const PLAN_OPTIONS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;
const BILLING_OPTIONS = ["MONTHLY", "YEARLY"] as const;
const SUB_STATUS_OPTIONS = ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "CANCELED", "EXPIRED"] as const;

export default function PlatformPage() {
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [tenants, setTenants] = useState<TenantListItem[]>([]);
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState("");

    const [tenantForm, setTenantForm] = useState({
        name: "",
        code: "",
        billingEmail: "",
        ownerEmail: "",
        ownerFullName: "",
        ownerRole: "tenant_admin",
    });

    const [subscriptionForm, setSubscriptionForm] = useState({
        planCode: "STARTER",
        billingInterval: "MONTHLY",
        status: "ACTIVE",
        seatLimit: 100,
    });

    const [savingTenant, setSavingTenant] = useState(false);
    const [savingSubscription, setSavingSubscription] = useState(false);

    const loadPlatformData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const me = await apiFetch<AuthMeResponse>("/api/auth/me", { cache: "no-store" });
            const isPlatform = Boolean(me?.platformRole) || me?.userType === "platform_admin";
            if (!isPlatform) {
                setForbidden(true);
                return;
            }

            const [tenantData, invoiceData] = await Promise.all([
                apiFetch<TenantListItem[]>("/api/tenants?limit=100", { cache: "no-store" }),
                apiFetch<InvoiceItem[]>("/api/billing/invoices?limit=30", { cache: "no-store" }),
            ]);

            const list = Array.isArray(tenantData) ? tenantData : [];
            setTenants(list);
            setInvoices(Array.isArray(invoiceData) ? invoiceData : []);

            const defaultTenant = selectedTenantId || list[0]?.id || "";
            setSelectedTenantId(defaultTenant);

            const selectedTenant = list.find((item) => item.id === defaultTenant);
            setSubscriptionForm((prev) => ({
                ...prev,
                planCode: selectedTenant?.subscriptions?.[0]?.plan?.code || prev.planCode,
                status: selectedTenant?.subscriptions?.[0]?.status || prev.status,
                seatLimit: selectedTenant?.subscriptions?.[0]?.seatLimit || prev.seatLimit,
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load platform data");
        } finally {
            setLoading(false);
        }
    }, [selectedTenantId]);

    useEffect(() => {
        void loadPlatformData();
    }, [loadPlatformData]);

    const billingTotals = useMemo(() => {
        const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0);
        const totalDue = invoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0);
        return {
            totalInvoiced,
            totalDue,
            invoiceCount: invoices.length,
        };
    }, [invoices]);

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
                        planCode: subscriptionForm.planCode,
                        billingInterval: subscriptionForm.billingInterval,
                        status: subscriptionForm.status,
                        seatLimit: Number(subscriptionForm.seatLimit),
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
            await loadPlatformData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create tenant");
        } finally {
            setSavingTenant(false);
        }
    }

    async function handleUpdateSubscription() {
        if (!selectedTenantId) {
            setError("Select a tenant first");
            return;
        }

        setSavingSubscription(true);
        setError("");
        setNotice("");
        try {
            await apiFetch(`/api/tenants/${selectedTenantId}/subscription`, {
                method: "PATCH",
                body: JSON.stringify({
                    planCode: subscriptionForm.planCode,
                    billingInterval: subscriptionForm.billingInterval,
                    status: subscriptionForm.status,
                    seatLimit: Number(subscriptionForm.seatLimit),
                }),
            });
            setNotice("Subscription and seat license updated");
            await loadPlatformData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update subscription");
        } finally {
            setSavingSubscription(false);
        }
    }

    if (forbidden) {
        return (
            <AuthGuard authFailureMode="inline">
                <AppShell title="WathiqCare Platform Management" subtitle="Centralized platform administration">
                    <AccessDenied resource="Platform Admin Portal" />
                </AppShell>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <AppShell
                title="WathiqCare Platform Management"
                subtitle="Platform Admin Console for tenants, subscriptions, licensing seats, and billing"
                actions={
                    <button
                        type="button"
                        onClick={() => void loadPlatformData()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                }
            >
                {loading ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">Loading platform portal...</div> : null}
                {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
                {notice ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">Tenants</p>
                            <Building2 className="h-4 w-4 text-slate-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">{tenants.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">Total Invoiced</p>
                            <CreditCard className="h-4 w-4 text-slate-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">${(billingTotals.totalInvoiced / 100).toFixed(2)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-500">Outstanding Due</p>
                            <ShieldCheck className="h-4 w-4 text-slate-600" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900">${(billingTotals.totalDue / 100).toFixed(2)}</p>
                    </div>
                </section>

                <section className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-base font-semibold text-slate-900">Create Tenant</h2>
                        <p className="mt-1 text-sm text-slate-600">Create tenant, initial tenant admin, and default subscription seat license.</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tenant Name" value={tenantForm.name} onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))} />
                            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tenant Code (optional)" value={tenantForm.code} onChange={(e) => setTenantForm((p) => ({ ...p, code: e.target.value }))} />
                            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Billing Email" value={tenantForm.billingEmail} onChange={(e) => setTenantForm((p) => ({ ...p, billingEmail: e.target.value }))} />
                            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tenant Admin Email" value={tenantForm.ownerEmail} onChange={(e) => setTenantForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
                            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tenant Admin Name" value={tenantForm.ownerFullName} onChange={(e) => setTenantForm((p) => ({ ...p, ownerFullName: e.target.value }))} />
                            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={tenantForm.ownerRole} onChange={(e) => setTenantForm((p) => ({ ...p, ownerRole: e.target.value }))}>
                                <option value="tenant_admin">tenant_admin</option>
                                <option value="tenant_owner">tenant_owner</option>
                            </select>
                        </div>
                        <button type="button" onClick={() => void handleCreateTenant()} disabled={savingTenant} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                            <Plus className="h-4 w-4" />
                            {savingTenant ? "Creating..." : "Create Tenant"}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-base font-semibold text-slate-900">Subscription and Seat Licensing</h2>
                        <p className="mt-1 text-sm text-slate-600">Manage plan, status, and seat limits by tenant.</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
                                <option value="">Select Tenant</option>
                                {tenants.map((tenant) => (
                                    <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.code})</option>
                                ))}
                            </select>
                            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={subscriptionForm.planCode} onChange={(e) => setSubscriptionForm((p) => ({ ...p, planCode: e.target.value }))}>
                                {PLAN_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={subscriptionForm.billingInterval} onChange={(e) => setSubscriptionForm((p) => ({ ...p, billingInterval: e.target.value }))}>
                                {BILLING_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={subscriptionForm.status} onChange={(e) => setSubscriptionForm((p) => ({ ...p, status: e.target.value }))}>
                                {SUB_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <input type="number" min={1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={subscriptionForm.seatLimit} onChange={(e) => setSubscriptionForm((p) => ({ ...p, seatLimit: Number(e.target.value || 0) }))} />
                        </div>
                        <button type="button" onClick={() => void handleUpdateSubscription()} disabled={savingSubscription} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                            {savingSubscription ? "Saving..." : "Update Subscription"}
                        </button>
                    </div>
                </section>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="text-base font-semibold text-slate-900">Tenants and Billing Overview</h2>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Tenant</th>
                                    <th className="px-3 py-2 text-left">Plan</th>
                                    <th className="px-3 py-2 text-left">Subscription Status</th>
                                    <th className="px-3 py-2 text-left">Seat Limit</th>
                                    <th className="px-3 py-2 text-left">Users</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((tenant) => (
                                    <tr key={tenant.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2">
                                            <p className="font-medium text-slate-900">{tenant.name}</p>
                                            <p className="text-xs text-slate-500">{tenant.code}</p>
                                        </td>
                                        <td className="px-3 py-2">{tenant.subscriptions?.[0]?.plan?.code || "-"}</td>
                                        <td className="px-3 py-2">{tenant.subscriptions?.[0]?.status || "-"}</td>
                                        <td className="px-3 py-2">{tenant.subscriptions?.[0]?.seatLimit || "-"}</td>
                                        <td className="px-3 py-2">{tenant._count?.memberships || 0}</td>
                                    </tr>
                                ))}
                                {tenants.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>No tenants found</td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <Users className="h-4 w-4" />
                            Billing Summary
                        </div>
                        <p className="mt-1">Invoices: {billingTotals.invoiceCount} | Total invoiced: ${(billingTotals.totalInvoiced / 100).toFixed(2)} | Outstanding due: ${(billingTotals.totalDue / 100).toFixed(2)}</p>
                    </div>
                </section>
            </AppShell>
        </AuthGuard>
    );
}
