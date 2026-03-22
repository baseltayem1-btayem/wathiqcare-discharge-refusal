"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { ApiHttpError, apiFetch } from "@/utils/api";

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
    const [payload, setPayload] = useState<TenantUsersPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        email: "",
        fullName: "",
        role: "user",
        department: "",
    });

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

                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-sm font-semibold text-slate-900">License Usage</h2>
                            <span className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-slate-700">
                                {payload ? licenseText : "Loading..."}
                            </span>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-semibold text-slate-900">Create User</h2>
                        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
                            <label className="text-sm text-slate-600">
                                Full name
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={form.fullName}
                                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                                    required
                                />
                            </label>

                            <label className="text-sm text-slate-600">
                                Email
                                <input
                                    type="email"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={form.email}
                                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                    required
                                />
                            </label>

                            <label className="text-sm text-slate-600">
                                Role
                                <select
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={form.role}
                                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                                >
                                    <option value="user">User</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>

                            <label className="text-sm text-slate-600">
                                Department (optional)
                                <input
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    value={form.department}
                                    onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                                />
                            </label>

                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? "Creating..." : "Create and Invite User"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-semibold text-slate-900">Users</h2>
                        {loading ? (
                            <p className="mt-3 text-sm text-slate-500">Loading users...</p>
                        ) : (
                            <div className="mt-3 overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Name</th>
                                            <th className="px-3 py-2">Email</th>
                                            <th className="px-3 py-2">Role</th>
                                            <th className="px-3 py-2">Invite Status</th>
                                            <th className="px-3 py-2">Last Login</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(payload?.users || []).map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-3 py-2 font-medium text-slate-900">{user.fullName}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.email}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.role}</td>
                                                <td className="px-3 py-2 text-slate-700">{user.inviteStatus}</td>
                                                <td className="px-3 py-2 text-slate-700">
                                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
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
