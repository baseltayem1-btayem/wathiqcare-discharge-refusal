"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, KeyRound, Eye, EyeOff, CheckCircle, Shield, FileText, Users } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
  // --- RTL/LTR and language ---
  const { isRtl, lang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // TODO: Implement real login logic
    setTimeout(() => {
      setLoading(false);
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }, 1200);
  };

  // --- Layout ---
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="wc-auth-bg min-h-screen flex flex-col"
      style={{ background: "#002B5C" }}
    >
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* LEFT: Brand Experience */}
        <aside className="wc-auth-left hidden lg:flex flex-col justify-between w-1/2 min-h-screen p-12 bg-gradient-to-br from-[#002B5C] via-[#193A6A] to-[#274B7A] relative">
          {/* Overlay for subtle geometry/lighting */}
          <div className="absolute inset-0 z-0" style={{
            background: "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(75,156,211,0.10) 0%, transparent 100%)"
          }} />
          <div className="relative z-10 flex flex-col gap-12">
            {/* Logo Area */}
            <div className="flex flex-col items-center mt-8 mb-8">
              <img
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare Logo"
                className="w-[260px] h-auto mb-8 drop-shadow-xl"
                style={{ maxWidth: 340 }}
                draggable={false}
                loading="eager"
                decoding="async"
              />
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'IBM Plex Sans Arabic, DIN Next Arabic, Inter, Segoe UI, sans-serif' }}>
                منصة الرعاية الصحية القانونية
              </h2>
              <div className="text-base text-blue-100 mb-4 max-w-md text-center" style={{ fontWeight: 400 }}>
                ذكاء قانوني متكامل لدعم الامتثال، إدارة المخاطر، وحماية البيانات.
              </div>
            </div>
            {/* Features */}
            <div className="flex flex-col gap-6 mt-8">
              <div className="flex items-start gap-4">
                <Shield className="w-7 h-7 text-[#C9A13B] flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-lg text-white font-semibold mb-1">أمن وخصوصية</div>
                  <div className="text-blue-100 text-sm">تشفير متقدم وحماية على أعلى المستويات.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <FileText className="w-7 h-7 text-[#C9A13B] flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-lg text-white font-semibold mb-1">امتثال قانوني</div>
                  <div className="text-blue-100 text-sm">متوافق مع الأنظمة والمعايير التنظيمية.</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Users className="w-7 h-7 text-[#C9A13B] flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="text-lg text-white font-semibold mb-1">حوكمة ومخاطر</div>
                  <div className="text-blue-100 text-sm">إدارة المخاطر بكفاءة .</div>
                </div>
              </div>
            </div>
          </div>
          {/* Compliance Badges */}
          <div className="relative z-10 flex flex-row gap-4 mt-12 mb-2 justify-center">
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-5 py-3 flex flex-col items-center min-w-[90px]">
              <span className="text-white font-bold text-lg">PDPL</span>
              <span className="text-blue-100 text-xs mt-1">امتثال</span>
            </div>
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-5 py-3 flex flex-col items-center min-w-[90px]">
              <span className="text-white font-bold text-lg">IMC</span>
              <span className="text-blue-100 text-xs mt-1">ترخيص</span>
            </div>
            <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-5 py-3 flex flex-col items-center min-w-[90px]">
              <span className="text-white font-bold text-lg">ISO 27001</span>
              <span className="text-blue-100 text-xs mt-1">شهادة</span>
            </div>
          </div>
        </aside>

        {/* RIGHT: Login Experience */}
        <main className="flex flex-1 flex-col items-center justify-center min-h-screen bg-[#F8FAFC] p-4 relative">
          {/* Language Switcher */}
          <div className="absolute top-8 end-8 z-20">
            <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 shadow-sm px-2 py-1">
              <button
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${isRtl ? "text-gray-400" : "text-[#002B5C] bg-blue-50"}`}
                style={{ fontFamily: 'IBM Plex Sans Arabic, DIN Next Arabic, Inter, Segoe UI, sans-serif' }}
                disabled={isRtl}
              >العربية</button>
              <span className="w-px h-5 bg-gray-200 mx-1" />
              <button
                className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${!isRtl ? "text-gray-400" : "text-[#002B5C] bg-blue-50"}`}
                style={{ fontFamily: 'Inter, Segoe UI, IBM Plex Sans Arabic, sans-serif' }}
                disabled={!isRtl}
              >EN</button>
            </div>
          </div>

          {/* Login Card */}
          <section className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-12 flex flex-col gap-6 border border-gray-100" style={{ minWidth: 340 }}>
            <div className="mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-[#002B5C] mb-2" style={{ fontFamily: 'IBM Plex Sans Arabic, DIN Next Arabic, Inter, Segoe UI, sans-serif' }}>
                مرحباً بك في واثق كير
              </h1>
              <div className="text-gray-600 text-base mb-2">سجل الدخول للوصول إلى المنصة</div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} autoComplete="on">
              <div>
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-1">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 start-4 -translate-y-1/2 w-5 h-5 text-blue-300" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-gray-200 bg-blue-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] focus:border-[#4B9CD3] transition placeholder:text-gray-400"
                    style={{ direction: isRtl ? "rtl" : "ltr" }}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-1">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute top-1/2 start-4 -translate-y-1/2 w-5 h-5 text-blue-300" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    className="w-full h-14 pl-12 pr-12 rounded-xl border border-gray-200 bg-blue-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] focus:border-[#4B9CD3] transition placeholder:text-gray-400"
                    style={{ direction: isRtl ? "rtl" : "ltr" }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute top-1/2 end-4 -translate-y-1/2 text-blue-400 hover:text-blue-700 focus:outline-none"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-gray-700 text-sm select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="accent-[#002B5C] w-5 h-5 rounded border-gray-300"
                  />
                  تذكرني
                </label>
                <Link href="/auth/password-reset" className="text-blue-700 hover:underline text-sm font-medium">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm mt-2">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full h-14 mt-2 rounded-xl bg-[#002B5C] text-white text-lg font-bold shadow-lg hover:bg-[#193A6A] transition disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "..." : "تسجيل الدخول"}
              </button>
              <button
                type="button"
                className="w-full h-14 mt-2 rounded-xl border-2 border-[#C9A13B] text-[#C9A13B] text-lg font-bold shadow-none flex flex-col items-center justify-center opacity-60 cursor-not-allowed"
                disabled
                tabIndex={-1}
                style={{ background: "#fff" }}
              >
                الدخول بحساب IMC
                <span className="text-xs font-normal mt-1">سيتم تفعيله قريباً</span>
              </button>
            </form>
            {/* Footer */}
            <footer className="flex flex-row gap-6 justify-center mt-8 border-t border-gray-100 pt-4">
              <Link href="/contact" className="flex items-center gap-2 text-gray-500 hover:text-[#002B5C] text-sm font-medium">
                <Mail className="w-4 h-4" /> دعم فني
              </Link>
              <Link href="/privacy" className="flex items-center gap-2 text-gray-500 hover:text-[#002B5C] text-sm font-medium">
                <Shield className="w-4 h-4" /> خصوصية البيانات
              </Link>
              <Link href="/contact" className="flex items-center gap-2 text-gray-500 hover:text-[#002B5C] text-sm font-medium">
                <Users className="w-4 h-4" /> تواصل معنا
              </Link>
            </footer>
          </section>
        </main>
      </div>
      {/* Mobile: Branding on top, login below */}
      <div className="lg:hidden flex flex-col w-full">
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-gradient-to-br from-[#002B5C] via-[#193A6A] to-[#274B7A]">
          <img
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare Logo"
            className="w-[180px] h-auto mb-6 drop-shadow-xl"
            style={{ maxWidth: 240 }}
            draggable={false}
            loading="eager"
            decoding="async"
          />
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'IBM Plex Sans Arabic, DIN Next Arabic, Inter, Segoe UI, sans-serif' }}>
            منصة الرعاية الصحية القانونية
          </h2>
          <div className="text-sm text-blue-100 mb-2 max-w-xs text-center" style={{ fontWeight: 400 }}>
            ذكاء قانوني متكامل لدعم الامتثال، إدارة المخاطر، وحماية البيانات.
          </div>
        </div>
      </div>
    </div>
  );
}

