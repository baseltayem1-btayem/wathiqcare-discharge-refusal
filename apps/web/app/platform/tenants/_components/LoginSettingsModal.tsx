"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Lock, X } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import {
  getEnabledAuthMethods,
  normalizeAuthConfig,
  type TenantAuthConfig,
  type TenantListItem,
} from "./types";

type Props = {
  tenant: TenantListItem;
  onClose: () => void;
  /** Called after a successful save so the list can update its local copy. */
  onSaved: (tenantId: string, config: TenantAuthConfig) => void;
};

const AUTH_METHOD_ROWS: {
  key: keyof TenantAuthConfig;
  label: string;
  description: string;
}[] = [
  {
    key: "password_enabled",
    label: "Password Login",
    description: "Allow users to sign in with email and password",
  },
  {
    key: "microsoft_sso_enabled",
    label: "Microsoft SSO",
    description: "Allow users to sign in with Microsoft account",
  },
  {
    key: "secure_link_enabled",
    label: "Secure Link (Magic Link)",
    description: "Allow users to sign in with email link",
  },
];

/**
 * Isolated modal for editing a tenant's login settings.
 * A failure here never affects the tenant list or other modals.
 */
export default function LoginSettingsModal({ tenant, onClose, onSaved }: Props) {
  const { language } = useI18n();
  const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
  const [form, setForm] = useState<TenantAuthConfig>(() =>
    normalizeAuthConfig(tenant.authConfig),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleToggle(key: keyof TenantAuthConfig, value: boolean) {
    const next = { ...form, [key]: value };

    if (getEnabledAuthMethods(next).length === 0) {
      setError(txt("At least one authentication method must be enabled", "يجب تفعيل طريقة مصادقة واحدة على الأقل"));
      return;
    }

    if (key === "microsoft_sso_enabled" && value) {
      const meta = tenant.metadata;
      const hasAzureConfig =
        meta &&
        typeof meta === "object" &&
        ("tenantId" in meta || "clientId" in meta || "azure" in meta);
      if (!hasAzureConfig) {
        setError(
          txt("Microsoft SSO requires valid Azure AD configuration. Please configure it first.", "يتطلب تسجيل الدخول الموحد عبر Microsoft إعداد Azure AD صالحًا. يرجى إعداده أولًا."),
        );
        return;
      }
    }

    setError(null);
    setForm(next);
  }

  async function handleSave() {
    if (getEnabledAuthMethods(form).length === 0) {
      setError(txt("At least one authentication method must be enabled", "يجب تفعيل طريقة مصادقة واحدة على الأقل"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetchJson(`/api/tenants/${tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ authConfig: form }),
      });
      toast.success(txt("Login settings updated successfully", "تم تحديث إعدادات الدخول بنجاح"));
      onSaved(tenant.id, form);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : txt("Failed to update login settings", "تعذر تحديث إعدادات الدخول"),
      );
    } finally {
      setSaving(false);
    }
  }

  const enabledMethods = getEnabledAuthMethods(form);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-settings-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-floating)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3
              id="login-settings-title"
              className="text-base font-semibold text-slate-900"
            >
              {txt("Login Settings", "إعدادات تسجيل الدخول")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{txt("For", "للجهة")}: {tenant.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={txt("Close dialog", "إغلاق النافذة")}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* Active methods summary */}
          <div className="rounded-lg border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--primary)]">
              {txt("Active Login Methods", "طرق تسجيل الدخول النشطة")}
            </p>
            <div className="flex flex-wrap gap-1">
              {enabledMethods.length > 0 ? (
                enabledMethods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-white px-2 py-0.5 text-xs font-medium text-[var(--primary)]"
                  >
                    <Lock className="h-3 w-3" />
                    {method}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[var(--primary)]">{txt("None selected", "لم يتم اختيار أي طريقة")}</span>
              )}
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          {/* Method toggles */}
          <div className="space-y-3">
            {AUTH_METHOD_ROWS.map(({ key }) => (
              <div
                key={key}
                className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {key === "password_enabled"
                      ? txt("Password Login", "تسجيل الدخول بكلمة المرور")
                      : key === "microsoft_sso_enabled"
                        ? txt("Microsoft SSO", "تسجيل الدخول الموحد عبر Microsoft")
                        : txt("Secure Link (Magic Link)", "الرابط الآمن (رابط سحري)")}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {key === "password_enabled"
                      ? txt("Allow users to sign in with email and password", "السماح للمستخدمين بتسجيل الدخول عبر البريد الإلكتروني وكلمة المرور")
                      : key === "microsoft_sso_enabled"
                        ? txt("Allow users to sign in with Microsoft account", "السماح للمستخدمين بتسجيل الدخول بحساب Microsoft")
                        : txt("Allow users to sign in with email link", "السماح للمستخدمين بتسجيل الدخول عبر رابط البريد الإلكتروني")}
                  </p>
                </div>
                <label className="ml-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => handleToggle(key, e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="sr-only">
                    {txt("Toggle", "تبديل")} {key === "password_enabled"
                      ? txt("Password Login", "تسجيل الدخول بكلمة المرور")
                      : key === "microsoft_sso_enabled"
                        ? txt("Microsoft SSO", "تسجيل الدخول الموحد عبر Microsoft")
                        : txt("Secure Link", "الرابط الآمن")}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--primary-soft-border)] bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              <strong>{txt("Note", "ملاحظة")}:</strong> {txt("Changes are reflected immediately on the login page for this tenant.", "تنعكس التغييرات فورًا على صفحة تسجيل الدخول لهذه الجهة.")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {txt("Cancel", "إلغاء")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary-pressed)] hover:border-[var(--primary)] hover:bg-[#e2edf8] disabled:opacity-50"
          >
            {saving ? txt("Saving...", "جارٍ الحفظ...") : txt("Save Settings", "حفظ الإعدادات")}
          </button>
        </div>
      </div>
    </div>
  );
}
