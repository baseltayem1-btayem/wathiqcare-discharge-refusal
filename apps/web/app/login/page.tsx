"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, KeyRound } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiHttpError, apiFetch } from "@/utils/api";

type AuthMode = "microsoft" | "magic-link" | "password";

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

export default function LoginPage() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const txt = (en: string, ar: string) => (isRtl ? ar : en);

  function localizeAuthError(err: unknown): string {
    if (err instanceof ApiHttpError) {
      console.warn("[auth-ui] Login request failed", {
        status: err.status,
        code: err.code,
        details: err.details,
      });

      if (err.status === 401) {
        return t("loginPage.errorInvalidCredentials");
      }

      if (err.status === 403 && /password reset required/i.test(err.message || "")) {
        return txt(
          "Password reset is required for this account. Use the reset link sent to your email.",
          "تم طلب إعادة تعيين كلمة المرور لهذا الحساب. يرجى استخدام رابط إعادة التعيين المرسل إلى بريدك الإلكتروني.",
        );
      }

      if (err.status === 403) {
        return txt("You do not have permission to access this account.", "ليس لديك صلاحية للوصول إلى هذا الحساب.");
      }
    }

    if (!(err instanceof Error)) {
      return t("loginPage.errorGeneric");
    }

    const raw = err.message || "";
    const normalized = raw.replace(/^\d{3}\s*:\s*/, "").trim();

    if (/network|failed to fetch|unable to reach|timeout|timed out|server/i.test(raw)) {
      return t("loginPage.errorNetwork");
    }

    if (/invalid|credentials|unauthorized|auth required|session validation|required/i.test(raw)) {
      return t("loginPage.errorInvalidCredentials");
    }

    return normalized || t("loginPage.errorGeneric");
  }

  const allowDevPrefill =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true";
  const devEmailPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
  const devPasswordPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";

  // State
  const [email, setEmail] = useState(allowDevPrefill ? devEmailPrefill : "");
  const [password, setPassword] = useState(allowDevPrefill ? devPasswordPrefill : "");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("magic-link");
  const [authConfig, setAuthConfig] = useState<TenantAuthConfig>(DEFAULT_AUTH_CONFIG);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const enabledModes = useMemo<AuthMode[]>(() => {
    const modes: AuthMode[] = [];
    if (authConfig.microsoft_sso_enabled) modes.push("microsoft");
    if (authConfig.secure_link_enabled) modes.push("magic-link");
    if (authConfig.password_enabled) modes.push("password");
    return modes;
  }, [authConfig]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
        const result = await apiFetch<{ auth_config?: Partial<TenantAuthConfig> }>(`/api/auth/config${query}`);
        const raw = result?.auth_config ?? {};
        setAuthConfig({
          password_enabled:
            typeof raw.password_enabled === "boolean"
              ? raw.password_enabled
              : DEFAULT_AUTH_CONFIG.password_enabled,
          microsoft_sso_enabled:
            typeof raw.microsoft_sso_enabled === "boolean"
              ? raw.microsoft_sso_enabled
              : DEFAULT_AUTH_CONFIG.microsoft_sso_enabled,
          secure_link_enabled:
            typeof raw.secure_link_enabled === "boolean"
              ? raw.secure_link_enabled
              : DEFAULT_AUTH_CONFIG.secure_link_enabled,
        });
      } catch {
        setAuthConfig(DEFAULT_AUTH_CONFIG);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (enabledModes.length === 0) {
      return;
    }

    if (!enabledModes.includes(authMode)) {
      setAuthMode(enabledModes[0]);
    }
  }, [enabledModes, authMode]);

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const response = await apiFetch<{ message?: string }>("/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setNotice(response.message || t("loginPage.noticeGeneric"));
      setEmail("");
    } catch (err) {
      setError(localizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const result = await apiFetch<{ redirectTo: string }>("/api/auth/password/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const safeRedirect = typeof result?.redirectTo === "string" && result.redirectTo.trim()
        ? result.redirectTo
        : (isRtl ? "/ar" : "/en");
      const nextPath = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") || safeRedirect
        : safeRedirect;
      router.push(nextPath);
    } catch (err) {
      setError(localizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftSSO() {
    setError("");
    setLoading(true);

    try {
      // Initiate Microsoft login flow
      // This typically involves redirecting to Microsoft login
      const redirectUrl = `/api/auth/microsoft/login?email=${encodeURIComponent(email)}`;
      window.location.href = redirectUrl;
    } catch (err) {
      setError(localizeAuthError(err));
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f4f7fb]">
      <div className="login-top-bar" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[var(--primary-soft-border)] hover:bg-[var(--primary-soft)] sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("loginPage.homeLink")}
          </Link>
          <LanguageSwitcher className="bg-white" />
        </div>

        <section
          className="login-shell overflow-hidden rounded-[24px] border border-slate-200 bg-white"
        >
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className="login-brand-panel relative border-b p-5 md:p-7 lg:border-b-0 lg:border-e"
            >
              <LoginBrandPanel />
            </div>

            <div className="p-5 md:p-7 lg:p-9" dir={isRtl ? "rtl" : "ltr"}>
              <div
                className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)] md:p-6"
              >
                <div className="mb-5 flex justify-center">
                  <div className="relative w-[160px] sm:w-[190px] md:w-[210px]">
                    <img
                      src="/images/wathiqcare-logo.png"
                      alt="WathiqCare"
                      width={420}
                      height={120}
                      className="h-auto w-full object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {t("login.badge")}
                  </span>
                </div>

                {/* Auth Mode Tabs */}
                <div className="mb-6 flex gap-1 border-b border-slate-200">
                  {authConfig.microsoft_sso_enabled && (
                    <button
                      onClick={() => {
                        setAuthMode("microsoft");
                        setError("");
                        setNotice("");
                      }}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "microsoft"
                        ? "border-[var(--primary)] text-[var(--primary-pressed)]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <span>{t("loginPage.tabMicrosoft")}</span>
                    </button>
                  )}
                  {authConfig.secure_link_enabled && (
                    <button
                      onClick={() => {
                        setAuthMode("magic-link");
                        setError("");
                        setNotice("");
                      }}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "magic-link"
                        ? "border-[var(--primary)] text-[var(--primary-pressed)]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>{t("loginPage.tabMagicLink")}</span>
                    </button>
                  )}
                  {authConfig.password_enabled && (
                    <button
                      onClick={() => {
                        setAuthMode("password");
                        setError("");
                        setNotice("");
                      }}
                      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "password"
                        ? "border-[var(--primary)] text-[var(--primary-pressed)]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>{t("loginPage.tabPassword")}</span>
                    </button>
                  )}
                </div>

                {enabledModes.length === 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {txt("All sign-in methods are disabled for this tenant.", "جميع طرق تسجيل الدخول معطلة لهذا المستأجر.")}
                  </div>
                )}

                {/* Microsoft SSO */}
                {authConfig.microsoft_sso_enabled && authMode === "microsoft" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{t("loginPage.microsoftTitle")}</h2>
                    <p className="text-sm text-gray-600">{t("loginPage.microsoftSubtitle")}</p>

                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder={t("loginPage.microsoftEmailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)]"
                      />

                      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                      <button
                        onClick={handleMicrosoftSSO}
                        disabled={loading || !email}
                        className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {loading ? t("loginPage.microsoftSigning") : t("loginPage.microsoftBtn")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Magic Link */}
                {authConfig.secure_link_enabled && authMode === "magic-link" && (
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{t("loginPage.magicTitle")}</h2>
                    <p className="text-sm text-gray-600">{t("loginPage.magicSubtitle")}</p>

                    <div>
                      <label htmlFor="magic-email" className="mb-1 block text-sm font-medium text-gray-700">
                        {t("loginPage.magicEmailLabel")}
                      </label>
                      <input
                        id="magic-email"
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] disabled:bg-slate-100"
                        placeholder={t("loginPage.magicEmailPlaceholder")}
                      />
                    </div>

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] py-2.5 font-semibold text-[var(--primary-pressed)] transition hover:border-[var(--primary)] hover:bg-[#e2edf8] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Mail className="h-4 w-4" />
                      {loading ? t("loginPage.magicSending") : t("loginPage.magicSendBtn")}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      {authConfig.password_enabled && (
                        <button
                          type="button"
                          onClick={() => { setAuthMode("password"); setError(""); setNotice(""); }}
                          className="text-slate-500 transition hover:text-[var(--primary-pressed)]"
                        >
                          {t("loginPage.magicSwitchToPassword")}
                        </button>
                      )}
                      <Link href="/auth/password-reset" className="text-[var(--primary-pressed)] hover:text-[var(--primary)] font-semibold">
                        {t("loginPage.forgotPassword")}
                      </Link>
                    </div>
                  </form>
                )}

                {/* Password Login */}
                {authConfig.password_enabled && authMode === "password" && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{t("loginPage.passwordTitle")}</h2>
                    <p className="text-sm text-gray-600">{t("loginPage.passwordSubtitle")}</p>

                    <div>
                      <label htmlFor="password-email" className="mb-1 block text-sm font-medium text-gray-700">
                        {t("loginPage.passwordEmailLabel")}
                      </label>
                      <input
                        id="password-email"
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] disabled:bg-slate-100"
                        placeholder={t("loginPage.passwordEmailPlaceholder")}
                      />
                    </div>

                    <div>
                      <label htmlFor="password-input" className="mb-1 block text-sm font-medium text-gray-700">
                        {t("loginPage.passwordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          id="password-input"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] disabled:bg-slate-100"
                          placeholder={txt("Enter your password", "أدخل كلمة المرور")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showPassword ? t("loginPage.passwordHide") : t("loginPage.passwordShow")}
                        </button>
                      </div>
                    </div>

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] py-2.5 font-semibold text-[var(--primary-pressed)] transition hover:border-[var(--primary)] hover:bg-[#e2edf8] focus:outline-none focus:ring-2 focus:ring-[var(--primary-soft)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      {loading ? t("loginPage.passwordSigning") : t("loginPage.passwordBtn")}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <Link href="/auth/password-reset" className="text-[var(--primary-pressed)] hover:text-[var(--primary)] font-semibold">
                        {t("loginPage.forgotPasswordLink")}
                      </Link>
                      {authConfig.secure_link_enabled && (
                        <button
                          type="button"
                          onClick={() => { setAuthMode("magic-link"); setError(""); setNotice(""); }}
                          className="text-slate-500 transition hover:text-[var(--primary-pressed)]"
                        >
                          {t("loginPage.switchToMagicLink")}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .login-top-bar {
          height: 3px;
          background: var(--primary);
        }

        .login-shell {
          box-shadow: var(--shadow-lg);
        }

        .login-brand-panel {
          background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
          border-color: var(--border);
        }
      `}</style>
    </main>
  );
}

