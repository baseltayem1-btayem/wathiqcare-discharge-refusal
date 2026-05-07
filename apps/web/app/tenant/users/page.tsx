"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useUiPermissions } from "@/hooks/useUiPermissions";
import { ApiHttpError, apiFetch } from "@/utils/api";
import { toast } from "sonner";

type TenantUser = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    userType: string;
    isActive: boolean;
    status: string;
    inviteStatus: string;
    membershipRole: string;
    invitedAt: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    department: string | null;
};

type TenantUsersPayload = {
    success: boolean;
    users: TenantUser[];
    license: {
        seatLimit: number;
        activeUsers: number;
        pendingUsers: number;
        availableSeats: number;
    };
};

export default function TenantUsersPage() {
    const permissions = useUiPermissions();
    const [payload, setPayload] = useState<TenantUsersPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const [form, setForm] = useState({
        email: "",
        fullName: "",
        role: "user",
        department: "",
    });

    const canManageUsers = permissions.can("users.manage");

    async function loadUsers() {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<TenantUsersPayload>("/api/tenant/users", { cache: "no-store" });
            setPayload(data);
        } catch (err) {
            const message = err instanceof ApiHttpError ? err.message : "Failed to load tenant users";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadUsers();
    }, []);

    async function onCreateUser(e: React.FormEvent) {
        e.preventDefault();
        if (!canManageUsers) {
            setError(permissions.deniedMessage);
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await apiFetch<{ success: boolean; user_id: string }>("/api/tenant/users/create", {
                method: "POST",
                body: JSON.stringify(form),
            });
            setForm({ email: "", fullName: "", role: "user", department: "" });
            await loadUsers();
        } catch (err) {
            const message = err instanceof ApiHttpError ? err.message : "Failed to create user";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function onResendInvite(userId: string) {
        if (!canManageUsers) {
            toast.error(permissions.deniedMessage);
            return;
        }

        setActionLoading((prev) => ({ ...prev, [`resend_${userId}`]: true }));
        try {
            await apiFetch<{ success: boolean }>(`/api/tenant/users/${userId}/resend-invite`, {
                method: "POST",
            });
            toast.success("Invitation resent");
        } catch (err) {
            const message = err instanceof ApiHttpError ? err.message : "Failed to resend invite";
            toast.error(message);
        } finally {
            setActionLoading((prev) => ({ ...prev, [`resend_${userId}`]: false }));
        }
    }

    async function onResetPassword(userId: string) {
        if (!canManageUsers) {
            toast.error(permissions.deniedMessage);
            return;
        }

        setActionLoading((prev) => ({ ...prev, [`reset_${userId}`]: true }));
        try {
            await apiFetch<{ success: boolean }>(`/api/tenant/users/${userId}/reset-password`, {
                method: "POST",
            });
            toast.success("Password reset email sent");
        } catch (err) {
            const message = err instanceof ApiHttpError ? err.message : "Failed to send reset email";
            toast.error(message);
        } finally {
            setActionLoading((prev) => ({ ...prev, [`reset_${userId}`]: false }));
        }
    }

    const licenseText = useMemo(() => {
        if (!payload) return "";
        return `${payload.license.activeUsers}/${payload.license.seatLimit} seats used · ${payload.license.availableSeats} available`;
    }, [payload]);

    return (
        <AuthGuard>
            <AppShell
                title="Tenant Users"
                subtitle="Create, invite, and manage users in your tenant"
            >
                <div className="space-y-5">
                    {error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    ) : null}

                    <section className="wc-panel">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="wc-panel-heading !mb-0">License Usage</h2>
                            <span className="wc-module-pill">
                                {payload ? licenseText : "Loading..."}
                            </span>
                        </div>
                    </section>

                    <section className="wc-form-panel">
                        <h2 className="wc-panel-heading">Create User</h2>
                        <form className="wc-form-grid mt-3" onSubmit={onCreateUser}>
                            <label className="wc-form-field">
                                <span className="wc-form-label">Full name <span className="wc-form-required">*</span></span>
                                <input
                                    className="wc-form-input"
                                    value={form.fullName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                                    required
                                />
                            </label>

                            <label className="wc-form-field">
                                <span className="wc-form-label">Email <span className="wc-form-required">*</span></span>
                                <input
                                    type="email"
                                    className="wc-form-input"
                                    value={form.email}
                                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                            </label>

                            <label className="wc-form-field">
                                <span className="wc-form-label">Role</span>
                                <select
                                    className="wc-form-select"
                                    value={form.role}
                                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="user">User</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>

                            <label className="wc-form-field">
                                <span className="wc-form-label">Department</span>
                                <input
                                    className="wc-form-input"
                                    value={form.department}
                                    onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                                />
                            </label>

                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !canManageUsers}
                                    title={!canManageUsers ? permissions.deniedMessage : undefined}
                                    className="toolbar-btn toolbar-btn-primary"
                                >
                                    {submitting ? "Creating..." : "Create and Invite User"}
                                </button>
                                {!canManageUsers ? (
                                    <span className="ml-2 text-xs text-amber-700">{permissions.deniedMessage}</span>
                                ) : null}
                            </div>
                        </form>
                    </section>

                    <section className="wc-form-panel">
                        <h2 className="wc-panel-heading">Users</h2>
                        {loading ? (
                            <p className="mt-3 text-sm text-slate-500">Loading users...</p>
                        ) : (
                            <div className="mt-3 overflow-x-auto">
                                <table className="wc-grid-table">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2">Name</th>
                                            <th className="px-3 py-2">Email</th>
                                            <th className="px-3 py-2">Role</th>
                                            <th className="px-3 py-2">Invite Status</th>
                                            <th className="px-3 py-2">Last Login</th>
                                            <th className="px-3 py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(payload?.users || []).map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-3 py-2 font-medium text-slate-900">{user.fullName}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.email}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.role}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.inviteStatus}</td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.inviteStatus === "PENDING" && (
                                                            <button
                                                                type="button"
                                                                disabled={!!actionLoading[`resend_${user.id}`] || !canManageUsers}
                                                                title={!canManageUsers ? permissions.deniedMessage : undefined}
                                                                onClick={() => void onResendInvite(user.id)}
                                                                className="toolbar-btn toolbar-btn-secondary"
                                                            >
                                                                {actionLoading[`resend_${user.id}`] ? "Sending…" : "Resend Invite"}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={!!actionLoading[`reset_${user.id}`] || !canManageUsers}
                                                            title={!canManageUsers ? permissions.deniedMessage : undefined}
                                                            onClick={() => void onResetPassword(user.id)}
                                                            className="toolbar-btn toolbar-btn-secondary"
                                                        >
                                                            {actionLoading[`reset_${user.id}`] ? "Sending…" : "Reset Password"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
