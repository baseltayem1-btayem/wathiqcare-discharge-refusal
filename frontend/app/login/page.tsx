"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckSquare, LogIn, Square } from "lucide-react";
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
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #f0fdff 0%, #f5f7fa 60%, #e0f2fe 100%)" }}
    >
      {/* Top accent bar */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #0891b2, #06b6d4, #0891b2)" }} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-4 flex items-center justify-end">
          <LanguageSwitcher className="bg-white/95" />
        </div>

        <section
          className="overflow-hidden rounded-2xl"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(8,145,178,0.10), 0 2px 8px rgba(0,0,0,0.06)" }}
        >
          <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
            {/* Brand panel */}
            <div
              className="border-b p-5 md:p-7 lg:border-b-0 lg:border-e"
              style={{ background: "#f0fdff", borderColor: "#e0f2fe" }}
            >
              <LoginBrandPanel />
            </div>

            {/* Form panel */}
            <div className="p-5 md:p-7 lg:p-9" dir={isRtl ? "rtl" : "ltr"}>
              <div
                className="mx-auto w-full max-w-xl rounded-2xl p-5 md:p-6"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                {/* Logo */}
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

                <h2 className="text-xl font-bold text-gray-900">{t("login.formTitle")}</h2>
                <p className="mt-1.5 text-sm text-gray-500">{t("login.formSubtitle")}</p>

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">
                      {t("login.email")}
                    </label>
                    <input
                      id="login-email"
                      className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:ring-2 disabled:bg-gray-100"
                      style={{ borderColor: "#cbd5e1" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#0891b2"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(8,145,178,0.12)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = ""; }}
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
                      className="inline-flex h-4 w-4 items-center justify-center rounded border bg-white text-gray-800 transition"
                      style={{ borderColor: rememberMe ? "#0891b2" : "#cbd5e1", background: rememberMe ? "#ecfeff" : "#ffffff" }}
                      aria-hidden
                    >
                      {rememberMe ? <CheckSquare className="h-3.5 w-3.5" style={{ color: "#0891b2" }} /> : <Square className="h-3.5 w-3.5" />}
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", boxShadow: "0 4px 14px rgba(8,145,178,0.28)" }}
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
    </main>
  );
}
