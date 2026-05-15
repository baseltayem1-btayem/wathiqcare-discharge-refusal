"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

export default function LangLoginPage() {
  const { isRtl, lang } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const copy = {
    title: isRtl ? "دخول آمن إلى واثق كير" : "Secure Access to WathiqCare",
    subtitle: isRtl ? "سجّل الدخول لمتابعة أعمالك بثقة." : "Sign in to continue with confidence.",
    home: isRtl ? "العودة للرئيسية" : "Back to Home",
    emailLabel: isRtl ? "البريد الإلكتروني" : "Email",
    emailPlaceholder: isRtl ? "example@hospital.sa" : "example@hospital.sa",
    passwordLabel: isRtl ? "كلمة المرور" : "Password",
    rememberMe: isRtl ? "تذكرني" : "Remember me",
    forgotPassword: isRtl ? "نسيت كلمة المرور؟" : "Forgot password?",
    signIn: isRtl ? "تسجيل الدخول" : "Sign In",
    signingIn: isRtl ? "جاري تسجيل الدخول..." : "Signing in...",
    imcBtn: isRtl ? "الدخول بحساب IMC" : "Sign in with IMC Account",
    imcSoon: isRtl ? "سيتم تفعيله قريباً" : "Available soon",
    support: isRtl ? "دعم فني" : "Support",
    privacy: isRtl ? "خصوصية البيانات" : "Data Privacy",
    contact: isRtl ? "تواصل معنا" : "Contact Us",
    invalidCredentials: isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password",
    panelTitle: isRtl ? "مركز الامتثال والرعاية" : "Compliance and Care Hub",
    panelSubtitle: isRtl
      ? "منصة قانونية صحية موثوقة تدعم الخصوصية، الامتثال، وإدارة المخاطر."
      : "A trusted legal-health platform for privacy, compliance, and risk oversight.",
    badge: isRtl ? "منصة موثوقة" : "Trusted Platform",
    privacyTitle: isRtl ? "خصوصية طبية" : "Medical Privacy",
    privacyDesc: isRtl ? "حماية عالية للبيانات الحساسة." : "High protection for sensitive data.",
    complianceTitle: isRtl ? "امتثال مستمر" : "Continuous Compliance",
    complianceDesc: isRtl ? "متابعة متطلبات التنظيم بشكل آني." : "Real-time alignment with regulations.",
    governanceTitle: isRtl ? "حوكمة واضحة" : "Clear Governance",
    governanceDesc: isRtl ? "قرارات دقيقة مدعومة بسياق قانوني." : "Precise decisions with legal context.",
  };

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiFetch<{ redirectTo: string; mustChangePassword?: boolean }>("/api/auth/password/login", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe }),
        authFailureMode: "inline",
      });

      if (result.mustChangePassword) {
        router.push("/first-login");
        return;
      }

      const fallbackRedirect = `/${lang}`;
      const nextPath =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") || result.redirectTo || fallbackRedirect
          : result.redirectTo || fallbackRedirect;

      router.push(nextPath);
    } catch {
      setError(copy.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      <div className="auth-grid mx-auto grid min-h-screen w-full max-w-[1740px] grid-cols-1 lg:grid-cols-2">
        <section className={`auth-brand relative overflow-hidden px-6 py-8 sm:px-10 lg:px-14 lg:py-12 ${isRtl ? "lg:order-1" : "lg:order-2"}`}>
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
              <span className={`chip ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                <ShieldCheck className="h-4 w-4" />
                {copy.badge}
              </span>
            </div>

            <div className="max-w-[540px] space-y-4">
              <h1 className={`text-3xl font-semibold leading-tight text-white sm:text-4xl ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                {copy.panelTitle}
              </h1>
              <p className={`text-base leading-7 text-[#d8e8ff] sm:text-lg ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                {copy.panelSubtitle}
              </p>
            </div>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, title: copy.privacyTitle, desc: copy.privacyDesc },
                { icon: CheckCircle2, title: copy.complianceTitle, desc: copy.complianceDesc },
                { icon: Scale, title: copy.governanceTitle, desc: copy.governanceDesc },
              ].map((item) => (
                <article key={item.title} className="brand-item">
                  <item.icon className="h-5 w-5 text-[#b9d8ff]" />
                  <div>
                    <h2 className={`text-base font-semibold text-white ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                      {item.title}
                    </h2>
                    <p className={`mt-1 text-sm text-[#cfe3ff] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                      {item.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`auth-form-wrap flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14 lg:py-12 ${isRtl ? "lg:order-2" : "lg:order-1"}`}>
          <div className="w-full max-w-[600px]">
            <div className="mb-6 flex items-center justify-between gap-3">
              <Link href={`/${lang}`} className="home-link">
                <ArrowUpRight className="h-4 w-4" />
                {copy.home}
              </Link>

              <div className="inline-flex rounded-full border border-[#cfdaea] bg-white p-1 shadow-[0_8px_24px_rgba(27,56,93,0.08)]">
                <Link
                  href="/ar/login"
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${isRtl ? "bg-[#0e376d] text-white" : "text-[#15457c] hover:bg-[#edf3fb]"}`}
                >
                  العربية
                </Link>
                <Link
                  href="/en/login"
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${!isRtl ? "bg-[#0e376d] text-white" : "text-[#15457c] hover:bg-[#edf3fb]"}`}
                >
                  EN
                </Link>
              </div>
            </div>

            <div className="auth-card rounded-[32px] border border-[#d9e3f0] bg-white p-6 sm:p-10">
              <div className="mb-7 space-y-2">
                <h2 className={`text-[2rem] font-semibold leading-tight text-[#18324f] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                  {copy.title}
                </h2>
                <p className={`text-[1.01rem] text-[#5e7289] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                  {copy.subtitle}
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
                <div className="space-y-2.5">
                  <label htmlFor="email" className={`text-sm font-semibold text-[#324862] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                    {copy.emailLabel}
                  </label>
                  <div className="auth-input-wrap">
                    <Mail className="h-5 w-5 text-[#2f77b7]" aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={copy.emailPlaceholder}
                      className={`auth-input ${isRtl ? "text-right" : "text-left"} ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="password" className={`text-sm font-semibold text-[#324862] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                    {copy.passwordLabel}
                  </label>
                  <div className="auth-input-wrap">
                    <Lock className="h-5 w-5 text-[#2f77b7]" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`auth-input ${isRtl ? "text-right" : "text-left"} ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}
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
                  <label className={`inline-flex cursor-pointer items-center gap-2 text-[#4f6278] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-[#b8c9dd] text-[#0e376d] focus:ring-[#4b9cd3]"
                    />
                    {copy.rememberMe}
                  </label>
                  <Link href="/auth/password-reset" className={`font-semibold text-[#1e598f] hover:text-[#113d6e] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                    {copy.forgotPassword}
                  </Link>
                </div>

                {error ? (
                  <div role="alert" className={`rounded-2xl border border-[#f2c7c7] bg-[#fff5f5] px-4 py-3 text-sm text-[#8f3232] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                    {error}
                  </div>
                ) : null}

                <button type="submit" disabled={loading} className={`auth-primary-btn ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                  {loading ? copy.signingIn : copy.signIn}
                </button>

                <button type="button" disabled className={`auth-secondary-btn ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`} aria-disabled="true">
                  <span className="font-semibold">{copy.imcBtn}</span>
                  <span className="text-xs text-[#6f8197]">{copy.imcSoon}</span>
                </button>
              </form>

              <footer className={`mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#e9eff6] pt-5 text-sm text-[#5b6f86] ${isRtl ? "font-[\"IBM_Plex_Sans_Arabic\",\"DIN_Next_Arabic\",sans-serif]" : ""}`}>
                <a href="mailto:support@wathiqcare.online" className="inline-flex items-center gap-2 hover:text-[#113d6e]">
                  <Phone className="h-4 w-4" />
                  {copy.support}
                </a>
                <Link href={`/${lang}/privacy`} className="inline-flex items-center gap-2 hover:text-[#113d6e]">
                  <ShieldCheck className="h-4 w-4" />
                  {copy.privacy}
                </Link>
                <a href="mailto:care@wathiqcare.online" className="inline-flex items-center gap-2 hover:text-[#113d6e]">
                  <ArrowUpRight className="h-4 w-4" />
                  {copy.contact}
                </a>
              </footer>
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
          pointer-events: none;
        }

        .auth-orb {
          filter: blur(0.6px);
          pointer-events: none;
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
          position: relative;
          z-index: 1;
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
          position: relative;
          z-index: 2;
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
          position: relative;
          z-index: 2;
          transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
        }

        .auth-input-wrap > :global(svg) {
          flex-shrink: 0;
          pointer-events: none;
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
          position: relative;
          z-index: 3;
          pointer-events: auto;
        }

        .auth-input::placeholder {
          color: #8ea0b7;
        }

        .auth-eye-btn {
          color: #6f87a4;
          position: relative;
          z-index: 3;
          pointer-events: auto;
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
          position: relative;
          z-index: 3;
          pointer-events: auto;
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

        .auth-form-wrap {
          position: relative;
          z-index: 1;
          isolation: isolate;
        }

        .auth-secondary-btn {
          width: 100%;
          min-height: 56px;
          border-radius: 15px;
          border: 1px solid #cfdaea;
          background: #f4f8fc;
          color: #3d5673;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.15;
          cursor: not-allowed;
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
