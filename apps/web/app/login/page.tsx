"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Lock, KeyRound, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type AuthMode = "microsoft" | "magic-link" | "password";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", labelAr: "مدير النظام", username: "superadmin", password: "Admin@12345", role: "platform_superadmin" },
  { label: "IMC Admin", labelAr: "مدير المستشفى", username: "imc.admin", password: "Welcome@123", role: "tenant_admin" },
  { label: "Doctor", labelAr: "طبيب", username: "imc.jeddah.doctor1", password: "Doctor@123", role: "doctor" },
  { label: "Nurse", labelAr: "ممرض/ة", username: "imc.jeddah.nurse1", password: "Nurse@123", role: "nursing" },
  { label: "Legal", labelAr: "مستشار قانوني", username: "imc.legal", password: "Legal@123", role: "legal_admin" },
  { label: "Medical Director", labelAr: "المدير الطبي", username: "imc.medicaldirector", password: "Medical@123", role: "medical_director" },
] as const;

export default function LoginPage() {
  const { t, isRtl } = useI18n();
  const router = useRouter();
  const allowDevPrefill =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true";
  const devEmailPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
  const devPasswordPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";

  // State
  const [identifier, setIdentifier] = useState(allowDevPrefill ? devEmailPrefill : "");
  const [password, setPassword] = useState(allowDevPrefill ? devPasswordPrefill : "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  // Resolve username to email format for login
  function resolveIdentifier(input: string): string {
    const trimmed = input.trim();
    if (trimmed.includes("@")) return trimmed;
    // Map known username aliases to email domains
    const knownDomains: Record<string, string> = {
      superadmin: "wathiqcare.local",
      "imc.admin": "imc.local",
      "imc.jeddah.doctor1": "imc.local",
      "imc.jeddah.nurse1": "imc.local",
      "imc.legal": "imc.local",
      "imc.medicaldirector": "imc.local",
      "imc.finance": "imc.local",
    };
    const domain = knownDomains[trimmed] ?? "wathiqcare.local";
    return `${trimmed}@${domain}`;
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const email = resolveIdentifier(identifier);
      const response = await apiFetch<{ message?: string }>("/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      setNotice(response.message || "If your email is registered, a secure login link has been sent.");
      setIdentifier("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send login link");
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
      const email = resolveIdentifier(identifier);
      const result = await apiFetch<{ redirectTo: string; mustChangePassword?: boolean }>("/api/auth/password/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
        authFailureMode: "inline",
      });

      if (result.mustChangePassword) {
        router.push("/first-login");
        return;
      }

      const nextPath = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") || result.redirectTo
        : result.redirectTo;
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : isRtl ? "بيانات الدخول غير صحيحة" : "Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftSSO() {
    setError("");
    setLoading(true);

    try {
      const redirectUrl = `/api/auth/microsoft/login?email=${encodeURIComponent(resolveIdentifier(identifier))}`;
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microsoft login failed");
      setLoading(false);
    }
  }

  function handleDemoLogin(username: string, pwd: string) {
    setIdentifier(username);
    setPassword(pwd);
    setAuthMode("password");
    setError("");
    setNotice("");
    setShowDemoAccounts(false);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#eff7fa]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-login-1 absolute -left-24 top-[-140px] h-[340px] w-[340px] rounded-full" />
        <div className="orb-login-2 absolute -right-24 top-[12%] h-[360px] w-[360px] rounded-full" />
        <div className="orb-login-3 absolute bottom-[-150px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full" />
      </div>

      <div className="login-top-bar" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 backdrop-blur transition hover:border-cyan-200 hover:bg-cyan-50 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {isRtl ? "الصفحة الرئيسية" : "Home"}
          </Link>
          <LanguageSwitcher className="bg-white/95" />
        </div>

        <section className="login-shell overflow-hidden rounded-[28px] border border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="login-brand-panel relative border-b p-5 md:p-7 lg:border-b-0 lg:border-e">
              <LoginBrandPanel />
            </div>

            <div className="p-5 md:p-7 lg:p-9" dir={isRtl ? "rtl" : "ltr"}>
              <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] md:p-6">
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

                <div className="mb-4 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
                    {t("login.badge")}
                  </span>
                </div>

                {/* Auth Mode Tabs */}
                <div className="mb-6 flex gap-1 border-b border-slate-200">
                  <button
                    onClick={() => { setAuthMode("password"); setError(""); setNotice(""); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "password" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{isRtl ? "كلمة المرور" : "Password"}</span>
                  </button>
                  <button
                    onClick={() => { setAuthMode("magic-link"); setError(""); setNotice(""); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "magic-link" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{isRtl ? "رابط آمن" : "Secure Link"}</span>
                  </button>
                  <button
                    onClick={() => { setAuthMode("microsoft"); setError(""); setNotice(""); }}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${authMode === "microsoft" ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                  >
                    <span>Microsoft SSO</span>
                  </button>
                </div>

                {/* Microsoft SSO */}
                {authMode === "microsoft" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{isRtl ? "تسجيل الدخول المؤسسي" : "Institutional Sign-In"}</h2>
                    <p className="text-sm text-gray-600">{isRtl ? "للمستشفيات والمؤسسات الصحية التي تستخدم Microsoft 365" : "For hospital and healthcare organization accounts using Microsoft 365"}</p>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder={isRtl ? "اسم المستخدم أو البريد الإلكتروني" : "Username or email"}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                      />
                      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                      <button
                        onClick={handleMicrosoftSSO}
                        disabled={loading || !identifier}
                        className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {loading ? (isRtl ? "جاري التسجيل..." : "Signing in...") : (isRtl ? "المتابعة مع Microsoft" : "Continue with Microsoft")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Magic Link */}
                {authMode === "magic-link" && (
                  <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{isRtl ? "الدخول برابط آمن" : "Sign In via Secure Link"}</h2>
                    <p className="text-sm text-gray-600">{isRtl ? "أدخل بريدك الإلكتروني وستصلك رابط دخول مؤقتة" : "Enter your email and receive a one-time sign-in link — no password needed"}</p>

                    <div>
                      <label htmlFor="magic-identifier" className="mb-1 block text-sm font-medium text-gray-700">
                        {isRtl ? "البريد الإلكتروني" : "Email"}
                      </label>
                      <input
                        id="magic-identifier"
                        type="text"
                        required
                        autoFocus
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                        placeholder={isRtl ? "your.email@domain.com" : "your.email@domain.com"}
                      />
                    </div>

                    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit-btn inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Mail className="h-4 w-4" />
                      {loading ? (isRtl ? "جاري الإرسال..." : "Sending...") : (isRtl ? "إرسال رابط الدخول" : "Send Secure Login Link")}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <button type="button" onClick={() => { setAuthMode("password"); setError(""); setNotice(""); }} className="text-slate-500 hover:text-cyan-700 transition">
                        {isRtl ? "الدخول بكلمة المرور" : "Sign in with password instead"}
                      </button>
                      <Link href="/forgot-password" className="text-cyan-600 hover:text-cyan-700 font-semibold">
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </Link>
                    </div>
                  </form>
                )}

                {/* Password Login */}
                {authMode === "password" && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-900">{isRtl ? "تسجيل الدخول" : "Sign In"}</h2>

                    <div>
                      <label htmlFor="login-identifier" className="mb-1 block text-sm font-medium text-gray-700">
                        {isRtl ? "اسم المستخدم أو البريد الإلكتروني" : "Username or Email"}
                      </label>
                      <input
                        id="login-identifier"
                        type="text"
                        required
                        autoFocus
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                        placeholder={isRtl ? "اسم المستخدم أو البريد الإلكتروني" : "username or email@domain.com"}
                      />
                    </div>

                    <div>
                      <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-gray-700">
                        {isRtl ? "كلمة المرور" : "Password"}
                      </label>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pe-10 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                          placeholder={isRtl ? "كلمة المرور" : "Enter your password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center gap-2">
                      <input
                        id="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
                        {isRtl ? "تذكرني" : t("login.rememberMe")}
                      </label>
                    </div>

                    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit-btn inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      {loading ? (isRtl ? "جاري التسجيل..." : t("login.submitting")) : (isRtl ? "تسجيل الدخول" : t("login.submit"))}
                    </button>

                    <div className="flex items-center justify-between text-xs">
                      <Link href="/forgot-password" className="text-cyan-600 hover:text-cyan-700 font-semibold">
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </Link>
                      <button type="button" onClick={() => { setAuthMode("magic-link"); setError(""); setNotice(""); }} className="text-slate-500 hover:text-cyan-700 transition">
                        {isRtl ? "الدخول برابط آمن" : "Use secure link instead"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Demo Accounts */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <span>{isRtl ? "حسابات تجريبية" : "Demo Accounts"}</span>
                    {showDemoAccounts ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {showDemoAccounts && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handleDemoLogin(acc.username, acc.password)}
                          className="rounded-xl border border-cyan-100 bg-cyan-50 px-2 py-1.5 text-center text-[11px] font-semibold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"
                        >
                          {isRtl ? acc.labelAr : acc.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .orb-login-1,
        .orb-login-2,
        .orb-login-3 {
          filter: blur(56px);
        }

        .orb-login-1 {
          background: rgba(8, 145, 178, 0.24);
          animation: driftLogin 10s ease-in-out infinite;
        }

        .orb-login-2 {
          background: rgba(13, 148, 136, 0.18);
          animation: driftLogin 12s ease-in-out infinite reverse;
        }

        .orb-login-3 {
          background: rgba(34, 211, 238, 0.2);
          animation: driftLogin 14s ease-in-out infinite;
        }

        @keyframes driftLogin {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-14px) translateX(9px);
          }
        }

        .login-top-bar {
          height: 3px;
          background: linear-gradient(90deg, #0f766e, #0891b2, #0f766e);
        }

        .login-shell {
          box-shadow: 0 18px 48px rgba(12, 74, 110, 0.16);
        }

        .login-brand-panel {
          background: radial-gradient(90% 130% at 18% 20%, rgba(34, 211, 238, 0.17) 0%, rgba(15, 23, 42, 0.03) 75%),
            linear-gradient(165deg, #ecfeff 0%, #f8fafc 55%, #e6f6fb 100%);
          border-color: #dbeafe;
        }

        .login-submit-btn {
          background: linear-gradient(120deg, #0f766e, #0891b2, #06b6d4);
          box-shadow: 0 8px 20px rgba(8, 145, 178, 0.28);
        }
      `}</style>
    </main>
  );
}
