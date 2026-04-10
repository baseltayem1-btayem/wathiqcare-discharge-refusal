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
import { apiFetch } from "@/utils/api";

type AuthMode = "microsoft" | "magic-link" | "password";

export default function LangLoginPage() {
  const { t, isRtl, lang } = useI18n();
  const router = useRouter();
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;
  const fieldAlignClass = isRtl ? "text-right placeholder:text-right" : "text-left";

  function localizeAuthError(err: unknown): string {
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
      const nextPath =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") || result.redirectTo
          : result.redirectTo;
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
    <main className="relative min-h-screen overflow-x-hidden bg-[#eff7fa]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-login-1 absolute -left-24 top-[-140px] h-[340px] w-[340px] rounded-full" />
        <div className="orb-login-2 absolute -right-24 top-[12%] h-[360px] w-[360px] rounded-full" />
        <div className="orb-login-3 absolute bottom-[-150px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full" />
      </div>

      <div className="login-top-bar" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur transition hover:border-cyan-200 hover:bg-cyan-50 sm:text-sm"
          >
            <ArrowBack className="h-4 w-4" />
            {t("loginPage.homeLink")}
          </Link>
          <LanguageSwitcher className="bg-white/95" />
        </div>

        <section className="login-shell overflow-hidden rounded-[28px] border border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className={`login-brand-panel relative border-b p-5 md:p-7 lg:border-b-0 ${isRtl ? "lg:order-1 lg:border-r" : "lg:order-2 lg:border-l"}`}
            >
              <LoginBrandPanel />
            </div>

            <div className={`p-5 md:p-7 lg:p-9 ${isRtl ? "lg:order-2" : "lg:order-1"}`}>
              <div className={`mx-auto w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] md:p-6 ${isRtl ? "text-right" : "text-left"}`}>
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
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                    {t("loginPage.badge")}
                  </span>
                </div>

                {/* Auth Mode Tabs */}
                <div className={`mb-6 flex gap-1 border-b border-slate-200 ${isRtl ? "justify-end" : "justify-start"}`}>
                  <button
                    onClick={() => { setAuthMode("microsoft"); clearMsgs(); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "microsoft" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    {t("loginPage.tabMicrosoft")}
                  </button>
                  <button
                    onClick={() => { setAuthMode("magic-link"); clearMsgs(); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "magic-link" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t("loginPage.tabMagicLink")}
                  </button>
                  <button
                    onClick={() => { setAuthMode("password"); clearMsgs(); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "password" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
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
                        className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 ${fieldAlignClass}`}
                      />
                      {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {error}
                        </div>
                      )}
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
                {authMode === "magic-link" && (
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
                        placeholder={t("loginPage.magicEmailPlaceholder")}
                        className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 ${fieldAlignClass}`}
                      />
                    </div>
                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    {notice && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                        {notice}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit-btn inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
                      <label htmlFor="pw-email" className="mb-1 block text-sm font-medium text-gray-700">
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
                        className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 ${fieldAlignClass}`}
                      />
                    </div>
                    <div>
                      <label htmlFor="pw-input" className="mb-1 block text-sm font-medium text-gray-700">
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
                          className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 ${fieldAlignClass}`}
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
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit-btn inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
        .orb-login-1, .orb-login-2, .orb-login-3 { filter: blur(56px); }
        .orb-login-1 { background: rgba(8,145,178,0.24); animation: driftLogin 10s ease-in-out infinite; }
        .orb-login-2 { background: rgba(13,148,136,0.18); animation: driftLogin 12s ease-in-out infinite reverse; }
        .orb-login-3 { background: rgba(34,211,238,0.2); animation: driftLogin 14s ease-in-out infinite; }
        @keyframes driftLogin {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-14px) translateX(9px); }
        }
        .login-top-bar { height: 3px; background: linear-gradient(90deg, #0f766e, #0891b2, #0f766e); }
        .login-shell { box-shadow: 0 18px 48px rgba(12,74,110,0.16); }
        .login-brand-panel {
          background: radial-gradient(90% 130% at 18% 20%, rgba(34,211,238,0.17) 0%, rgba(15,23,42,0.03) 75%),
            linear-gradient(165deg, #ecfeff 0%, #f8fafc 55%, #e6f6fb 100%);
          border-color: #dbeafe;
        }
        .login-submit-btn {
          background: linear-gradient(120deg, #0f766e, #0891b2, #06b6d4);
          box-shadow: 0 8px 20px rgba(8,145,178,0.28);
        }
      `}</style>
    </main>
  );
}
