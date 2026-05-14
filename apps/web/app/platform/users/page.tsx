"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Shield, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

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

export default function PlatformUsersPage() {
    const { language } = useI18n();
    const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
    const [users, setUsers] = useState<PlatformUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [resetUser, setResetUser] = useState<PlatformUser | null>(null);
    const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });
    const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
    const [saving, setSaving] = useState(false);
    const [forcingReset, setForcingReset] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const loadUsers = useCallback(async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setRefreshing(true);
        try {
            const data = await apiFetchJson<PlatformUsersPayload>("/api/platform/users", {
                cache: "no-store",
            });
            setUsers(data?.users ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to load platform users", "تعذر تحميل مستخدمي المنصة"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [txt]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    async function handleCreateUser() {
        if (!createForm.email.trim() || !createForm.fullName.trim()) {
            toast.error(txt("Full name and email are required", "الاسم الكامل والبريد الإلكتروني مطلوبان"));
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
            toast.success(txt("Platform user created successfully", "تم إنشاء مستخدم المنصة بنجاح"));
            await loadUsers({ silent: true });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to create platform user", "تعذر إنشاء مستخدم المنصة"));
        } finally {
            setSaving(false);
        }
    }

    async function handleForceResetAllUsers() {
        const confirmed = window.confirm(
            txt("Force password reset for all users and invalidate existing sessions?", "فرض إعادة تعيين كلمة المرور لجميع المستخدمين وإبطال الجلسات الحالية؟"),
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
                txt(
                    `Forced reset completed: ${result.processed} users, ${result.emailSent} emails sent, ${result.emailFailed} failed`,
                    `اكتملت إعادة التعيين الإلزامية: ${result.processed} مستخدم، ${result.emailSent} رسالة مرسلة، ${result.emailFailed} فشل`,
                ),
            );
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to force password reset", "تعذر فرض إعادة تعيين كلمة المرور"));
        } finally {
            setForcingReset(false);
        }
    }

    async function handleDirectPasswordReset() {
        if (!resetUser) {
            return;
        }
        if (!resetForm.password) {
            toast.error(txt("New password is required", "كلمة المرور الجديدة مطلوبة"));
            return;
        }
        if (resetForm.password !== resetForm.confirmPassword) {
            toast.error(txt("Passwords do not match", "كلمتا المرور غير متطابقتين"));
            return;
        }

        setResettingUserId(resetUser.id);
        try {
            await apiFetchJson(`/api/platform/users/${resetUser.id}/reset-password`, {
                method: "POST",
                body: JSON.stringify({ password: resetForm.password }),
            });
            toast.success(txt("Password updated successfully", "تم تحديث كلمة المرور بنجاح"));
            setResetUser(null);
            setResetForm({ password: "", confirmPassword: "" });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to update password", "تعذر تحديث كلمة المرور"));
        } finally {
            setResettingUserId(null);
        }
    }

    async function handleForceLogout(user: PlatformUser) {
        const confirmed = window.confirm(
            txt(
                `Force logout ${user.fullName} and revoke all active sessions?`,
                `فرض تسجيل الخروج على ${user.fullName} وإبطال جميع الجلسات النشطة؟`,
            ),
        );
        if (!confirmed) {
            return;
        }

        setActionLoading((prev) => ({ ...prev, [`logout_${user.id}`]: true }));
        try {
            await apiFetchJson(`/api/platform/users/${user.id}/force-logout`, {
                method: "POST",
            });
            toast.success(txt("User sessions revoked", "تم إبطال جلسات المستخدم"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to force logout user", "تعذر فرض تسجيل خروج المستخدم"));
        } finally {
            setActionLoading((prev) => ({ ...prev, [`logout_${user.id}`]: false }));
        }
    }

    async function handleResetMfa(user: PlatformUser) {
        const confirmed = window.confirm(
            txt(
                `Reset MFA for ${user.fullName}? This clears active step-up verification and requires fresh MFA verification on the next privileged action.`,
                `إعادة ضبط MFA للمستخدم ${user.fullName}؟ سيؤدي هذا إلى مسح التحقق المعزز النشط وطلب تحقق MFA جديد عند الإجراء الحساس التالي.`,
            ),
        );
        if (!confirmed) {
            return;
        }

        setActionLoading((prev) => ({ ...prev, [`mfa_${user.id}`]: true }));
        try {
            await apiFetchJson(`/api/platform/users/${user.id}/reset-mfa`, {
                method: "POST",
            });
            toast.success(txt("User MFA reset", "تمت إعادة ضبط MFA للمستخدم"));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : txt("Failed to reset MFA", "تعذر إعادة ضبط MFA"));
        } finally {
            setActionLoading((prev) => ({ ...prev, [`mfa_${user.id}`]: false }));
        }
    }

    function roleLabel(role: string): string {
        if (role === "platform_superadmin") return txt("Superadmin", "مشرف أعلى");
        if (role === "platform_admin") return txt("Platform Admin", "مشرف المنصة");
        if (role === "platform_operator") return txt("Platform Operator", "مشغل المنصة");
        if (role === "support_viewer") return txt("Support Viewer", "مشاهد الدعم");
        return role;
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
            <div className="wc-panel">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="wc-panel-heading !mb-1">{txt("Platform Users", "مستخدمو المنصة")}</h2>
                        <p className="text-[12px] text-slate-500">
                            {txt("Manage platform-level staff — admins, operators, and support viewers", "إدارة فرق العمل على مستوى المنصة من المشرفين والمشغلين ومشاهدي الدعم")}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void handleForceResetAllUsers()}
                            disabled={forcingReset}
                            className="toolbar-btn toolbar-btn-danger"
                        >
                            <Shield className={`h-4 w-4 ${forcingReset ? "animate-pulse" : ""}`} />
                            {forcingReset ? txt("Forcing Reset...", "جارٍ فرض إعادة التعيين...") : txt("Force Reset All Users", "فرض إعادة التعيين لجميع المستخدمين")}
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadUsers()}
                            className="toolbar-btn toolbar-btn-secondary"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            {txt("Refresh", "تحديث")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="toolbar-btn toolbar-btn-primary"
                        >
                            <Plus className="h-4 w-4" />
                            {txt("Create Platform User", "إنشاء مستخدم منصة")}
                        </button>
                    </div>
                </div>
            </div>

            <div className="wc-panel text-[12px] text-amber-800">
                <Shield className="mb-0.5 mr-2 inline-block h-4 w-4" />
                {txt("Platform users have", "مستخدمو المنصة لديهم")} <strong>{txt("global access", "وصول شامل")}</strong> {txt("to all tenant data. Only provision platform staff here. Tenant users are managed separately under each tenant.", "إلى جميع بيانات الجهات. أنشئ هنا فقط حسابات فريق المنصة، أما مستخدمو الجهات فتتم إدارتهم بشكل منفصل داخل كل جهة.")}
            </div>

            <div className="wc-form-panel">
                <div className="border-b border-[var(--border)] px-1 pb-2">
                    <h3 className="wc-panel-heading !mb-0">{txt("Platform Users", "مستخدمو المنصة")} ({users.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="wc-grid-table">
                        <thead>
                            <tr>
                                <th className="px-4 py-3 text-left">{txt("Name", "الاسم")}</th>
                                <th className="px-4 py-3 text-left">{txt("Email", "البريد الإلكتروني")}</th>
                                <th className="px-4 py-3 text-left">{txt("Platform Role", "دور المنصة")}</th>
                                <th className="px-4 py-3 text-left">{txt("Status", "الحالة")}</th>
                                <th className="px-4 py-3 text-left">{txt("Last Login", "آخر تسجيل دخول")}</th>
                                <th className="px-4 py-3 text-left">{txt("Created", "تاريخ الإنشاء")}</th>
                                <th className="px-4 py-3 text-left">{txt("Actions", "الإجراءات")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                        {txt("Loading...", "جارٍ التحميل...")}
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                        {txt("No platform users found", "لا يوجد مستخدمون للمنصة")}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`wc-status-badge ${roleBadgeClass(user.role)}`}>
                                                {roleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`wc-status-badge ${user.isActive ? "wc-status-badge--signed" : "wc-status-badge--locked"}`}>
                                                {user.isActive ? txt("Active", "نشط") : txt("Inactive", "غير نشط")}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {user.lastLoginAt
                                                ? new Date(user.lastLoginAt).toLocaleDateString()
                                                : txt("Never", "أبدًا")}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setResetUser(user);
                                                        setResetForm({ password: "", confirmPassword: "" });
                                                    }}
                                                    disabled={resettingUserId === user.id}
                                                    className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50"
                                                >
                                                    {resettingUserId === user.id ? txt("Saving...", "جارٍ الحفظ...") : txt("Set Password", "تعيين كلمة المرور")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleForceLogout(user)}
                                                    disabled={!!actionLoading[`logout_${user.id}`]}
                                                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                                                >
                                                    {actionLoading[`logout_${user.id}`] ? txt("Revoking...", "جارٍ الإبطال...") : txt("Force Logout", "فرض تسجيل الخروج")}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleResetMfa(user)}
                                                    disabled={!!actionLoading[`mfa_${user.id}`]}
                                                    className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                                                >
                                                    {actionLoading[`mfa_${user.id}`] ? txt("Resetting...", "جارٍ إعادة الضبط...") : txt("Reset MFA", "إعادة ضبط MFA")}
                                                </button>
                                            </div>
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
                    <div className="w-full max-w-md border border-[var(--border-strong)] bg-white shadow-[var(--shadow-floating)]">
                        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">{txt("Create Platform User", "إنشاء مستخدم منصة")}</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {txt("Platform scope — not associated with any tenant", "نطاق المنصة - غير مرتبط بأي جهة")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                title={txt("Close create platform user dialog", "إغلاق نافذة إنشاء مستخدم منصة")}
                                aria-label={txt("Close create platform user dialog", "إغلاق نافذة إنشاء مستخدم منصة")}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 p-4">
                            <div className="wc-form-field">
                                <label className="wc-form-label">{txt("Full Name", "الاسم الكامل")} <span className="wc-form-required">*</span></label>
                                <input
                                    className="wc-form-input"
                                    placeholder={txt("Ahmad Al-Rashidi", "أحمد الراشدي")}
                                    value={createForm.fullName}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                                />
                            </div>
                            <div className="wc-form-field">
                                <label className="wc-form-label">{txt("Email", "البريد الإلكتروني")} <span className="wc-form-required">*</span></label>
                                <input
                                    type="email"
                                    className="wc-form-input"
                                    placeholder={txt("operator@wathiqcare.online", "operator@wathiqcare.online")}
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                                />
                            </div>
                            <div className="wc-form-field">
                                <label className="wc-form-label">{txt("Platform Role", "دور المنصة")}</label>
                                <select
                                    title={txt("Select platform role", "اختر دور المنصة")}
                                    aria-label={txt("Select platform role", "اختر دور المنصة")}
                                    className="wc-form-select"
                                    value={createForm.role}
                                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                                >
                                    <option value="platform_admin">{txt("Platform Admin", "مشرف المنصة")}</option>
                                    <option value="platform_operator">{txt("Platform Operator", "مشغل المنصة")}</option>
                                    <option value="support_viewer">{txt("Support Viewer", "مشاهد الدعم")}</option>
                                </select>
                                <p className="mt-1 text-xs text-slate-500">
                                    {txt("Platform Admin: full access · Operator: operational · Support Viewer: read-only", "مشرف المنصة: وصول كامل · المشغل: تشغيلي · مشاهد الدعم: قراءة فقط")}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-[12px]">
                                <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={createForm.sendInvite}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, sendInvite: e.target.checked }))}
                                    />
                                    {txt("Send invitation email", "إرسال رسالة دعوة")}
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300"
                                        checked={createForm.isActive}
                                        onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))}
                                    />
                                    {txt("Active", "نشط")}
                                </label>
                            </div>

                            <div className="wc-panel text-[11px] text-amber-800">
                                {txt("Platform users have access to all tenants. Only create accounts for trusted staff.", "يمتلك مستخدمو المنصة وصولًا إلى جميع الجهات. أنشئ الحسابات فقط للكوادر الموثوقة.")}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="toolbar-btn toolbar-btn-secondary"
                            >
                                {txt("Cancel", "إلغاء")}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreateUser()}
                                disabled={saving}
                                className="toolbar-btn toolbar-btn-primary"
                            >
                                {saving ? txt("Creating...", "جارٍ الإنشاء...") : txt("Create User", "إنشاء مستخدم")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resetUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">{txt("Set Platform User Password", "تعيين كلمة مرور مستخدم المنصة")}</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {txt("This updates the password directly and revokes active sessions without changing active status.", "يحدّث هذا كلمة المرور مباشرةً ويلغي الجلسات النشطة دون تغيير حالة النشاط.")}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setResetUser(null);
                                    setResetForm({ password: "", confirmPassword: "" });
                                }}
                                title={txt("Close password reset dialog", "إغلاق نافذة تعيين كلمة المرور")}
                                aria-label={txt("Close password reset dialog", "إغلاق نافذة تعيين كلمة المرور")}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                <strong className="text-slate-900">{resetUser.fullName}</strong>
                                <div className="mt-1 text-xs text-slate-500">{resetUser.email}</div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">{txt("New Password", "كلمة المرور الجديدة")}</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    title={txt("Enter new password", "أدخل كلمة المرور الجديدة")}
                                    aria-label={txt("Enter new password", "أدخل كلمة المرور الجديدة")}
                                    placeholder={txt("Strong password", "كلمة مرور قوية")}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    value={resetForm.password}
                                    onChange={(e) => setResetForm((p) => ({ ...p, password: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-700">{txt("Confirm Password", "تأكيد كلمة المرور")}</label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    title={txt("Confirm new password", "أكد كلمة المرور الجديدة")}
                                    aria-label={txt("Confirm new password", "أكد كلمة المرور الجديدة")}
                                    placeholder={txt("Repeat password", "أعد إدخال كلمة المرور")}
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                                    value={resetForm.confirmPassword}
                                    onChange={(e) => setResetForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                />
                            </div>
                            <p className="text-xs text-slate-500">
                                {txt("Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character.", "يجب أن تتكون كلمة المرور من 12 حرفًا على الأقل وأن تحتوي على حرف كبير وحرف صغير ورقم ورمز خاص.")}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setResetUser(null);
                                    setResetForm({ password: "", confirmPassword: "" });
                                }}
                                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                {txt("Cancel", "إلغاء")}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDirectPasswordReset()}
                                disabled={resettingUserId === resetUser.id}
                                className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50"
                            >
                                {resettingUserId === resetUser.id ? txt("Saving...", "جارٍ الحفظ...") : txt("Update Password", "تحديث كلمة المرور")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
