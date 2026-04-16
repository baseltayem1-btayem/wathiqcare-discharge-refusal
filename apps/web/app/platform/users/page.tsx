"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Shield, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";

type PlatformUser = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    userType: string;
    isActive: boolean;
    status: string;
    lastLoginAt: string | null;
    createdAt: string;
};

type PlatformUsersPayload = {
    success: boolean;
    users: PlatformUser[];
};

const EMPTY_CREATE_FORM = {
    fullName: "",
    email: "",
    role: "platform_operator",
    sendInvite: true,
    isActive: true,
};

const ROLE_LABELS: Record<string, string> = {
    platform_superadmin: "Superadmin",
    platform_admin: "Platform Admin",
    platform_operator: "Platform Operator",
    support_viewer: "Support Viewer",
};

export default function PlatformUsersPage() {
    const [users, setUsers] = useState<PlatformUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
    const [saving, setSaving] = useState(false);
    const [forcingReset, setForcingReset] = useState(false);

    const loadUsers = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setRefreshing(true);
        try {
            const data = await apiFetchJson<PlatformUsersPayload>("/api/platform/users", {
                cache: "no-store",
            });
            setUsers(data?.users ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load platform users");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    async function handleCreateUser() {
        if (!createForm.email.trim() || !createForm.fullName.trim()) {
            toast.error("Full name and email are required");
            return;
        }
        setSaving(true);
        try {
            await apiFetchJson("/api/platform/users/create", {
                method: "POST",
                body: JSON.stringify(createForm),
            });
            setCreateForm(EMPTY_CREATE_FORM);
            setShowCreateModal(false);
            toast.success("Platform user created successfully");
            await loadUsers({ silent: true });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create platform user");
        } finally {
            setSaving(false);
        }
    }

    async function handleForceResetAllUsers() {
        const confirmed = window.confirm(
            "Force password reset for all users and invalidate existing sessions?",
        );
        if (!confirmed) {
            return;
        }

        setForcingReset(true);
        try {
            const result = await apiFetchJson<{
                success: boolean;
                processed: number;
                emailSent: number;
                emailFailed: number;
            }>("/api/platform/users/force-password-reset-all", {
                method: "POST",
                body: JSON.stringify({
                    reason: "Platform-initiated global security reset",
                    clearPasswordHashes: false,
                    includeInactiveUsers: false,
                }),
            });

            toast.success(
                `Forced reset completed: ${result.processed} users, ${result.emailSent} emails sent, ${result.emailFailed} failed`,
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to force password reset");
        } finally {
            setForcingReset(false);
        }
    }

    function roleLabel(role: string): string {
        return ROLE_LABELS[role] ?? role;
    }

    function roleBadgeClass(role: string): string {
        if (role === "platform_superadmin") return "border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary)]";
        if (role === "platform_admin") return "border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary)]";
        if (role === "platform_operator") return "border border-slate-200 bg-slate-100 text-slate-700";
        if (role === "support_viewer") return "border border-slate-200 bg-slate-100 text-slate-700";
        return "border border-slate-200 bg-slate-100 text-slate-700";
    }

    return (
        <>
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Platform Users</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage platform-level staff — admins, operators, and support viewers
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void handleForceResetAllUsers()}
                            disabled={forcingReset}
                            className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                            <Shield className={`h-4 w-4 ${forcingReset ? "animate-pulse" : ""}`} />
                            {forcingReset ? "Forcing Reset..." : "Force Reset All Users"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadUsers()}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8]"
                        >
                            <Plus className="h-4 w-4" />
                            Create Platform User
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <Shield className="mb-0.5 mr-2 inline-block h-4 w-4" />
                Platform users have <strong>global access</strong> to all tenant data.
                Only provision platform staff here. Tenant users are managed separately under each tenant.
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-sm)]">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-900">Platform Users ({users.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-[0.04em] text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Email</th>
                                <th className="px-4 py-3 text-left">Platform Role</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Last Login</th>
                                <th className="px-4 py-3 text-left">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        Loading…
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        No platform users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                                                {roleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {user.lastLoginAt
                                                ? new Date(user.lastLoginAt).toLocaleDateString()
                                                : "Never"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Create Platform User</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Platform scope — not associated with any tenant
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                title="Close create platform user dialog"
                                aria-label="Close create platform user dialog"
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">Full Name *</label>
                                <input
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Ahmad Al-Rashidi"
                                    value={createForm.fullName}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">Email *</label>
                                <input
                                    type="email"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="operator@wathiqcare.online"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">Platform Role</label>
                                <select
                                    title="Select platform role"
                                    aria-label="Select platform role"
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                                >
                                    <option value="platform_admin">Platform Admin</option>
                                    <option value="platform_operator">Platform Operator</option>
                                    <option value="support_viewer">Support Viewer</option>
                                </select>
                                <p className="mt-1 text-xs text-slate-500">
                                    Platform Admin: full access · Operator: operational · Support Viewer: read-only
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={createForm.sendInvite}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, sendInvite: e.target.checked }))}
                                    />
                                    Send invitation email
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={createForm.isActive}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))}
                                    />
                                    Active
                                </label>
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                Platform users have access to all tenants. Only create accounts for trusted staff.
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreateUser()}
                                disabled={saving}
                                className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50"
                            >
                                {saving ? "Creating..." : "Create User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
