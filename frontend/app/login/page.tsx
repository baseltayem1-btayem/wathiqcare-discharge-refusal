"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, LogIn } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LoginBrandPanel from "@/components/login/LoginBrandPanel";
import PasswordField from "@/components/login/PasswordField";
import { useI18n } from "@/i18n/I18nProvider";
import { setToken, apiFetch } from "@/utils/api";

export default function LoginPage() {
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const allowDevPrefill =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true";
  const [email, setEmail] = useState(allowDevPrefill ? "admin@wathiqcare.online" : "");
  const [password, setPassword] = useState(allowDevPrefill ? "WCare@2026" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiFetch<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(result.access_token);
      const nextPath =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") || "/dashboard"
          : "/dashboard";
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#eff7fa]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-login-1 absolute -left-24 top-[-140px] h-[340px] w-[340px] rounded-full" />
        <div className="orb-login-2 absolute -right-24 top-[12%] h-[360px] w-[360px] rounded-full" />
        <div className="orb-login-3 absolute bottom-[-150px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full" />
      </div>

      <div style={{ height: "3px", background: "linear-gradient(90deg, #0f766e, #0891b2, #0f766e)" }} />

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

        <section
          className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 backdrop-blur-xl"
          style={{ boxShadow: "0 18px 48px rgba(12,74,110,0.16)" }}
        >
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className="relative border-b p-5 md:p-7 lg:border-b-0 lg:border-e"
              style={{
                background:
                  "radial-gradient(90% 130% at 18% 20%, rgba(34,211,238,0.17) 0%, rgba(15,23,42,0.03) 75%), linear-gradient(165deg, #ecfeff 0%, #f8fafc 55%, #e6f6fb 100%)",
                borderColor: "#dbeafe",
              }}
            >
              <LoginBrandPanel />
            </div>

            <div className="p-5 md:p-7 lg:p-9" dir={isRtl ? "rtl" : "ltr"}>
              <div
                className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] md:p-6"
              >
                <div className="mb-5 flex justify-center">
                  <div className="relative w-[160px] sm:w-[190px] md:w-[210px]">
                    <Image
                      src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
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

                <h2 className="text-xl font-bold text-gray-900">{t("login.formTitle")}</h2>
                <p className="mt-1.5 text-sm text-gray-500">{t("login.formSubtitle")}</p>

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">
                      {t("login.email")}
                    </label>
                    <input
                      id="login-email"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      autoComplete="email"
                      autoFocus
                      disabled={loading}
                    />
                  </div>

                  <PasswordField
                    id="login-password"
                    label={t("login.password")}
                    value={password}
                    showPassword={showPassword}
                    isDisabled={loading}
                    showLabel={t("login.showPassword")}
                    hideLabel={t("login.hidePassword")}
                    onChange={setPassword}
                    onToggleVisibility={() => setShowPassword((previous) => !previous)}
                  />

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="sr-only"
                    />
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded border bg-white text-slate-800 transition"
                      style={{ borderColor: rememberMe ? "#0891b2" : "#cbd5e1", background: rememberMe ? "#ecfeff" : "#ffffff" }}
                      aria-hidden
                    >
                      {rememberMe ? <Check className="h-3.5 w-3.5" style={{ color: "#0891b2" }} /> : null}
                    </span>
                    {t("login.rememberMe")}
                  </label>

                  {error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:translate-y-[-1px] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(120deg, #0f766e, #0891b2, #06b6d4)", boxShadow: "0 8px 20px rgba(8,145,178,0.28)" }}
                  >
                    <LogIn className="h-4 w-4" />
                    {loading ? t("login.submitting") : t("login.submit")}
                  </button>
                </form>
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
      `}</style>
    </main>
  );
}
