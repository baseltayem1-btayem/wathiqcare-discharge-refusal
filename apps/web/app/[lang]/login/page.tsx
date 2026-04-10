"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, Lock, KeyRound } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import { useI18n } from "@/i18n/I18nProvider";
import { ApiHttpError, apiFetch } from "@/utils/api";

type AuthMode = "microsoft" | "magic-link" | "password";

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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

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
        : `/${lang}`;
      const nextPath =
        typeof window !== "undefined"
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
          <LanguageSwitcher className="bg-white/95" />
        </div>

        <section className="login-shell overflow-hidden rounded-[28px] border border-border bg-white/80 backdrop-blur-xl">
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
                    <Image
                      src="/images/wathiqcare-logo.png"
                      alt="WathiqCare"
                      width={420}
                      height={120}
                      className="h-auto w-full object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Badge */}
                <div className="mb-4 flex justify-center">
                  <span className="wc-badge wc-badge-info gap-2 border border-cyan-200 bg-cyan-50 text-[11px] uppercase tracking-[0.12em]">
                    {t("loginPage.badge")}
                  </span>
                </div>

                {/* Auth Mode Tabs */}
                <div className={`mb-6 flex gap-1 border-b border-slate-200 ${isRtl ? "justify-end" : "justify-start"}`}>
                  <button
                    onClick={() => { setAuthMode("microsoft"); clearMsgs(); }}
                    className={`wc-tab ${authMode === "microsoft" ? "wc-tab-active" : ""}`}
                  >
                    {t("loginPage.tabMicrosoft")}
                  </button>
                  <button
                    onClick={() => { setAuthMode("magic-link"); clearMsgs(); }}
                    className={`wc-tab ${authMode === "magic-link" ? "wc-tab-active" : ""}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t("loginPage.tabMagicLink")}
                  </button>
                  <button
                    onClick={() => { setAuthMode("password"); clearMsgs(); }}
                    className={`wc-tab ${authMode === "password" ? "wc-tab-active" : ""}`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {t("loginPage.tabPassword")}
                  </button>
                </div>

                {/* Microsoft SSO */}
                {authMode === "microsoft" && (
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
                {authMode === "magic-link" && (
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
                      <button
                        type="button"
                        onClick={() => { setAuthMode("password"); clearMsgs(); }}
                        className="text-slate-500 hover:text-cyan-700 transition"
                      >
                        {t("loginPage.magicSwitchToPassword")}
                      </button>
                      <Link
                        href="/auth/password-reset"
                        className="text-cyan-600 hover:text-cyan-700 font-semibold"
                      >
                        {t("loginPage.forgotPassword")}
                      </Link>
                    </div>
                  </form>
                )}

                {/* Password Login */}
                {authMode === "password" && (
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
                        className="text-cyan-600 hover:text-cyan-700 font-semibold"
                      >
                        {t("loginPage.forgotPasswordLink")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setAuthMode("magic-link"); clearMsgs(); }}
                        className="text-slate-500 hover:text-cyan-700 transition"
                      >
                        {t("loginPage.switchToMagicLink")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .login-top-bar { height: 3px; background: linear-gradient(90deg, #0f8b8d, #17b7d8, #114c8d); }
        .login-shell { box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08); }
        .login-brand-panel {
          background: linear-gradient(165deg, #f4fbfe 0%, #f8fafc 55%, #eef6fb 100%);
          border-color: #dce5ec;
        }
      `}</style>
    </main>
  );
}
