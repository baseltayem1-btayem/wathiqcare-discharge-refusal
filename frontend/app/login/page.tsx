"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { setToken, apiFetch } from "@/utils/api";

export default function LoginPage() {
  const authDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const allowDevPrefill =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN_PREFILL === "true";
  const devEmailPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "";
  const devPasswordPrefill = process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "";
  const [email, setEmail] = useState(allowDevPrefill ? devEmailPrefill : "");
  const [password, setPassword] = useState(allowDevPrefill ? devPasswordPrefill : "");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const copy = {
    home: isRtl ? "الصفحة الرئيسية" : "Home",
    panelBadge: isRtl ? "منصة موثوقة" : "Trusted Platform",
    panelTitle: isRtl ? "مركز الامتثال والرعاية" : "Compliance and Care Hub",
    panelSubtitle: isRtl
      ? "منصة قانونية صحية موثوقة تدعم الخصوصية، الامتثال، وإدارة المخاطر."
      : "A trusted legal-health platform for privacy, compliance, and risk oversight.",
    cardTitle: isRtl ? "دخول آمن إلى واثق كير" : "Secure Access to WathiqCare",
    cardSubtitle: isRtl ? "سجّل الدخول لمتابعة أعمالك بثقة." : "Sign in to continue with confidence.",
    email: isRtl ? "البريد الإلكتروني" : "Email",
    password: isRtl ? "كلمة المرور" : "Password",
    remember: isRtl ? "تذكرني" : "Remember me",
    submit: isRtl ? "تسجيل الدخول" : "Sign In",
    submitting: isRtl ? "جاري تسجيل الدخول..." : "Signing in...",
    forgotPassword: isRtl ? "نسيت كلمة المرور؟" : "Forgot password?",
    quality1Title: isRtl ? "خصوصية طبية" : "Medical Privacy",
    quality1Desc: isRtl ? "حماية عالية للبيانات الحساسة." : "High protection for sensitive data.",
    quality2Title: isRtl ? "امتثال مستمر" : "Continuous Compliance",
    quality2Desc: isRtl ? "متابعة متطلبات التنظيم بشكل آني." : "Real-time alignment with regulations.",
    quality3Title: isRtl ? "حوكمة واضحة" : "Clear Governance",
    quality3Desc: isRtl ? "قرارات دقيقة مدعومة بسياق قانوني." : "Precise decisions with legal context.",
  };

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
      if (authDebug) {
        console.info("[auth-debug] login_success", {
          nextPath,
          tokenLength: result.access_token.length,
          expiresAt: (() => {
            try {
              const base64 = result.access_token.split(".")[1] || "";
              const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
              const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
              const payload = JSON.parse(atob(padded)) as { exp?: number };
              return payload.exp ?? null;
            } catch {
              return null;
            }
          })(),
        });
      }
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-grid mx-auto grid min-h-screen w-full max-w-[1740px] grid-cols-1 lg:grid-cols-2">
        <section className="auth-brand relative overflow-hidden px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="auth-brand-noise absolute inset-0" aria-hidden="true" />
          <div className="auth-orb auth-orb-a absolute -top-20 -left-16 h-72 w-72 rounded-full" aria-hidden="true" />
          <div className="auth-orb auth-orb-b absolute bottom-0 right-0 h-80 w-80 rounded-full" aria-hidden="true" />

          <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col">
            <div className="mb-10 flex items-start justify-between gap-4">
              <div className="logo-shell w-[228px] sm:w-[278px]">
                <img
                  src="/images/wathiqcare-logo.png"
                  alt="WathiqCare"
                  width={620}
                  height={190}
                  className="h-auto w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="chip">
                <ShieldCheck className="h-4 w-4" />
                {copy.panelBadge}
              </span>
            </div>

            <div className="max-w-[540px] space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">{copy.panelTitle}</h1>
              <p className="text-base leading-7 text-[#d8e8ff] sm:text-lg">{copy.panelSubtitle}</p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, title: copy.quality1Title, desc: copy.quality1Desc },
                { icon: CheckCircle2, title: copy.quality2Title, desc: copy.quality2Desc },
                { icon: Scale, title: copy.quality3Title, desc: copy.quality3Desc },
              ].map((item) => (
                <article key={item.title} className="brand-item">
                  <item.icon className="h-5 w-5 text-[#b9d8ff]" />
                  <div>
                    <h2 className="text-base font-semibold text-white">{item.title}</h2>
                    <p className="mt-1 text-sm text-[#cfe3ff]">{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-form-wrap flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-[600px]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link href="/" className="home-link">
                <ArrowLeft className="h-4 w-4" />
                {copy.home}
              </Link>
              <LanguageSwitcher className="bg-white/95" />
            </div>

            <div className="auth-card rounded-[32px] border border-[#d9e3f0] bg-white p-6 sm:p-10">
              <div className="mb-7 space-y-2">
                <h2 className="text-[2rem] font-semibold leading-tight text-[#18324f]">{copy.cardTitle}</h2>
                <p className="text-[1.01rem] text-[#5e7289]">{copy.cardSubtitle}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5" noValidate>
                <div className="space-y-2.5">
                  <label htmlFor="login-email" className="text-sm font-semibold text-[#324862]">
                    {copy.email}
                  </label>
                  <div className="auth-input-wrap">
                    <Mail className="h-5 w-5 text-[#2f77b7]" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@hospital.sa"
                      className={`auth-input ${isRtl ? "text-right" : "text-left"}`}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="login-password" className="text-sm font-semibold text-[#324862]">
                    {copy.password}
                  </label>
                  <div className="auth-input-wrap">
                    <Lock className="h-5 w-5 text-[#2f77b7]" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`auth-input ${isRtl ? "text-right" : "text-left"}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="auth-eye-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-[#4f6278]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-[#b8c9dd] text-[#0e376d] focus:ring-[#4b9cd3]"
                    />
                    {copy.remember}
                  </label>
                  <Link href="/forgot-password" className="font-semibold text-[#1e598f] hover:text-[#113d6e]">
                    {copy.forgotPassword}
                  </Link>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#8f3232]">
                    {error}
                  </div>
                ) : null}

                <button type="submit" disabled={loading} className="auth-primary-btn">
                  <LogIn className="h-4 w-4" />
                  {loading ? copy.submitting : copy.submit}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .auth-shell {
          background:
            radial-gradient(circle at 82% 10%, rgba(173, 213, 255, 0.28), transparent 34%),
            linear-gradient(180deg, #f2f7fc 0%, #edf3fa 100%);
        }

        .auth-brand {
          background: linear-gradient(158deg, #0a2a53 0%, #123f74 52%, #1e5b95 100%);
        }

        .auth-brand-noise {
          background-image:
            linear-gradient(118deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 46%),
            linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
          background-size: 100% 100%, 46px 46px, 46px 46px;
          opacity: 0.42;
        }

        .auth-orb {
          filter: blur(0.6px);
        }

        .auth-orb-a {
          background: radial-gradient(circle, rgba(146, 200, 255, 0.28) 0%, rgba(146, 200, 255, 0) 68%);
        }

        .auth-orb-b {
          background: radial-gradient(circle, rgba(71, 148, 222, 0.28) 0%, rgba(71, 148, 222, 0) 70%);
        }

        .logo-shell {
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.34);
          background: rgba(255, 255, 255, 0.97);
          padding: 0.75rem 0.95rem;
          box-shadow: 0 12px 26px rgba(7, 31, 62, 0.28);
        }

        .chip {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.34);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.45rem 0.85rem;
          color: rgba(255, 255, 255, 0.95);
          font-size: 0.74rem;
          font-weight: 600;
          letter-spacing: 0.08em;
        }

        .brand-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.9rem;
          backdrop-filter: blur(1.8px);
        }

        .auth-card {
          box-shadow: 0 30px 70px rgba(17, 47, 81, 0.16);
        }

        .home-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          border: 1px solid #cfdaea;
          background: #ffffff;
          padding: 0.55rem 0.95rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f4a7b;
          box-shadow: 0 8px 24px rgba(27, 56, 93, 0.08);
        }

        .auth-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.78rem;
          min-height: 58px;
          border-radius: 15px;
          border: 1px solid #d2ddea;
          background: #f9fbfe;
          padding-inline: 1rem;
          transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .auth-input-wrap:focus-within {
          border-color: #4a8fcd;
          box-shadow: 0 0 0 3px rgba(67, 143, 206, 0.16);
          background: #ffffff;
        }

        .auth-input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e334d;
          font-size: 1rem;
        }

        .auth-input::placeholder {
          color: #8ea0b7;
        }

        .auth-eye-btn {
          color: #6f87a4;
          transition: color 180ms ease;
        }

        .auth-eye-btn:hover {
          color: #1e598f;
        }

        .auth-primary-btn {
          width: 100%;
          min-height: 56px;
          border-radius: 15px;
          border: 0;
          background: linear-gradient(136deg, #0d3568 0%, #1f5a95 100%);
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 14px 30px rgba(14, 56, 105, 0.28);
          transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
        }

        .auth-primary-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 36px rgba(14, 56, 105, 0.34);
        }

        .auth-primary-btn:disabled {
          cursor: not-allowed;
          opacity: 0.74;
        }

        @media (min-width: 700px) {
          .auth-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
        }

        @media (max-width: 1023px) {
          .auth-brand {
            min-height: 42vh;
          }

          .auth-form-wrap {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
        }

        @media (max-width: 639px) {
          .auth-brand {
            min-height: 38vh;
          }

          .chip {
            font-size: 0.68rem;
            letter-spacing: 0.04em;
          }

          .auth-card {
            border-radius: 26px;
          }
        }
      `}</style>
    </main>
  );
}
