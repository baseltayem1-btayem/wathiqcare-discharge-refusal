"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, Lock, KeyRound } from "lucide-react";
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

function normalizePostLoginDestination(nextCandidate: string | null, fallbackPath: string): string {
  const fallback = fallbackPath.trim() || "/modules";
  if (!nextCandidate) {
    return fallback;
  }

  const candidate = nextCandidate.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  if (
    candidate === "/" ||
    candidate === "/login" ||
    candidate === "/platform" ||
    candidate === "/ar/login" ||
    candidate === "/en/login" ||
    candidate === "/ar/platform" ||
    candidate === "/en/platform"
  ) {
    return "/modules";
  }

  if (
    candidate === "/dashboard" ||
    candidate === "/dashboards" ||
    candidate === "/ar/dashboard" ||
    candidate === "/en/dashboard" ||
    candidate === "/ar/dashboards" ||
    candidate === "/en/dashboards"
  ) {
    return "/modules/discharge-refusal/dashboard";
  }

  if (candidate === "/cases" || candidate.startsWith("/cases/")) {
    return candidate.replace(/^\/cases/, "/modules/discharge-refusal/cases");
  }

  if (candidate.startsWith("/ar/cases") || candidate.startsWith("/en/cases")) {
    return candidate.replace(/^\/(ar|en)\/cases/, "/modules/discharge-refusal/cases");
  }

  return candidate;
}

export default function LangLoginPage() {
  const { t, isRtl, lang } = useI18n();
  const router = useRouter();
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;
  const fieldAlignClass = isRtl ? "text-right placeholder:text-right" : "text-left";

  function localizeAuthError(err: unknown): string {
    if (err instanceof ApiHttpError) {
      console.warn("[auth-ui] Login request failed", {
        status: err.status,
        code: err.code,
        details: err.details,
      });

      if (err.status === 401) {
        return isRtl
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : "Invalid email or password.";
      }

      if (err.status === 403 && /password reset required/i.test(err.message || "")) {
        return isRtl
          ? "تم طلب إعادة تعيين كلمة المرور لهذا الحساب. يرجى استخدام رابط إعادة التعيين المرسل إلى بريدك الإلكتروني."
          : "Password reset is required for this account. Use the reset link sent to your email.";
      }
    }

    if (!(err instanceof Error)) {
      return t("loginPage.errorGeneric");
    }

    const raw = err.message || "";
    const normalized = raw.replace(/^\d{3}\s*:\s*/, "").trim();

    if (isRtl) {
      if (/network|failed to fetch|unable to reach|timeout|timed out|server/i.test(raw)) {
        return t("loginPage.errorNetwork");
      }

      if (/invalid|credentials|unauthorized|auth required|session validation|required/i.test(raw)) {
        return t("loginPage.errorInvalidCredentials");
      }

      return t("loginPage.errorGeneric");
    }

    return normalized || t("loginPage.errorGeneric");
  }

  const allowDevPrefill =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true";

  const [email, setEmail] = useState(
    allowDevPrefill ? (process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "") : ""
  );
  const [password, setPassword] = useState(
    allowDevPrefill ? (process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "") : ""
  );
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
        const query = email.trim()
          ? `?email=${encodeURIComponent(email.trim())}`
          : "";
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
      setNotice(isRtl ? t("loginPage.noticeGeneric") : response.message || t("loginPage.noticeGeneric"));
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
        : "/modules";
      const requestedNext =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(normalizePostLoginDestination(requestedNext, safeRedirect));
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
      const redirectUrl = `/api/auth/microsoft/login?email=${encodeURIComponent(email)}`;
      window.location.href = redirectUrl;
    } catch (err) {
      setError(localizeAuthError(err));
      setLoading(false);
    }
  }

  function clearMsgs() {
    setError("");
    setNotice("");
  }

  return (
    <main className="wc-page relative overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"}>
      <div className="login-top-bar" />

      <div className="wc-container relative py-8 md:py-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href={`/${lang}`}
            className="wc-button-secondary h-10 gap-2 px-3 text-xs sm:text-sm"
          >
            <ArrowBack className="h-4 w-4" />
            {t("loginPage.homeLink")}
          </Link>
          <LanguageSwitcher className="bg-white" />
        </div>

        <section className="login-shell overflow-hidden rounded-[24px] border border-border bg-white">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className={`login-brand-panel relative border-b p-5 md:p-7 lg:border-b-0 ${isRtl ? "lg:order-1 lg:border-r" : "lg:order-2 lg:border-l"}`}
            >
              <LoginBrandPanel />
            </div>

            <div className={`p-5 md:p-7 lg:p-9 ${isRtl ? "lg:order-2" : "lg:order-1"}`}>
              <div className={`wc-card mx-auto w-full max-w-xl p-5 md:p-6 ${isRtl ? "text-right" : "text-left"}`}>
                {/* Logo */}
                <div className="mb-5 flex justify-center">
                  <div className="relative w-[160px] sm:w-[190px] md:w-[210px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

                {/* Badge */}
                <div className="mb-4 flex justify-center">
                  <span className="wc-badge gap-2 border border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-700">
                    {t("loginPage.badge")}
                  </span>
                </div>

                {/* Auth Mode Tabs */}
                <div className={`mb-6 flex gap-1 border-b border-slate-200 ${isRtl ? "justify-end" : "justify-start"}`}>
                  {authConfig.microsoft_sso_enabled && (
                    <button
                      onClick={() => { setAuthMode("microsoft"); clearMsgs(); }}
                      className={`wc-tab ${authMode === "microsoft" ? "wc-tab-active" : ""}`}
                    >
                      {t("loginPage.tabMicrosoft")}
                    </button>
                  )}
                  {authConfig.secure_link_enabled && (
                    <button
                      onClick={() => { setAuthMode("magic-link"); clearMsgs(); }}
                      className={`wc-tab ${authMode === "magic-link" ? "wc-tab-active" : ""}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {t("loginPage.tabMagicLink")}
                    </button>
                  )}
                  {authConfig.password_enabled && (
                    <button
                      onClick={() => { setAuthMode("password"); clearMsgs(); }}
                      className={`wc-tab ${authMode === "password" ? "wc-tab-active" : ""}`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      {t("loginPage.tabPassword")}
                    </button>
                  )}
                </div>

                {enabledModes.length === 0 && (
                  <div className="wc-alert-error">
                    {isRtl ? "تم تعطيل جميع طرق تسجيل الدخول لهذا المستأجر." : "All sign-in methods are disabled for this tenant."}
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
                        className={`wc-input ${fieldAlignClass}`}
                      />
                      {error && (
                        <div className="wc-alert-error">
                          {error}
                        </div>
                      )}
                      <button
                        onClick={handleMicrosoftSSO}
                        disabled={loading || !email}
                        className="wc-button-secondary w-full"
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
                      <label htmlFor="magic-email" className="wc-label">
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
                        placeholder={t("loginPage.magicEmailPlaceholder")}
                        className={`wc-input ${fieldAlignClass}`}
                      />
                    </div>
                    {error && (
                      <div className="wc-alert-error">
                        {error}
                      </div>
                    )}
                    {notice && (
                      <div className="wc-alert-success">
                        {notice}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="wc-button-primary w-full"
                    >
                      <Mail className="h-4 w-4" />
                      {loading ? t("loginPage.magicSending") : t("loginPage.magicSendBtn")}
                    </button>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      {authConfig.password_enabled && (
                        <button
                          type="button"
                          onClick={() => { setAuthMode("password"); clearMsgs(); }}
                          className="text-slate-500 transition hover:text-[var(--primary-pressed)]"
                        >
                          {t("loginPage.magicSwitchToPassword")}
                        </button>
                      )}
                      <Link
                        href="/auth/password-reset"
                        className="text-[var(--primary-pressed)] hover:text-[var(--primary)] font-semibold"
                      >
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
                      <label htmlFor="pw-email" className="wc-label">
                        {t("loginPage.passwordEmailLabel")}
                      </label>
                      <input
                        id="pw-email"
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        placeholder={t("loginPage.passwordEmailPlaceholder")}
                        className={`wc-input ${fieldAlignClass}`}
                      />
                    </div>
                    <div>
                      <label htmlFor="pw-input" className="wc-label">
                        {t("loginPage.passwordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          id="pw-input"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className={`wc-input ${fieldAlignClass}`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 font-medium"
                        >
                          {showPassword ? t("loginPage.passwordHide") : t("loginPage.passwordShow")}
                        </button>
                      </div>
                    </div>
                    {error && (
                      <div className="wc-alert-error">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="wc-button-primary w-full"
                    >
                      <KeyRound className="h-4 w-4" />
                      {loading ? t("loginPage.passwordSigning") : t("loginPage.passwordBtn")}
                    </button>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <Link
                        href="/auth/password-reset"
                        className="text-[var(--primary-pressed)] hover:text-[var(--primary)] font-semibold"
                      >
                        {t("loginPage.forgotPasswordLink")}
                      </Link>
                      {authConfig.secure_link_enabled && (
                        <button
                          type="button"
                          onClick={() => { setAuthMode("magic-link"); clearMsgs(); }}
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
        .login-top-bar { height: 3px; background: var(--primary); }
        .login-shell { box-shadow: var(--shadow-lg); }
        .login-brand-panel {
          background: linear-gradient(180deg, #f8fbff 0%, #f8fafc 100%);
          border-color: var(--border);
        }
      `}</style>
    </main>
  );
}

