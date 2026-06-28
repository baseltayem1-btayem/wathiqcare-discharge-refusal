"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpLeft,
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
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Container,
  Form,
  FormField,
  Grid,
  Input,
  Section,
  Stack,
} from "@/components/design-system";

function normalizePostLoginDestination(nextCandidate: string | null, fallbackPath: string): string {
  const fallback = fallbackPath.trim() || "/modules";
  if (!nextCandidate) {
    return fallback;
  }

  const candidate = nextCandidate.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  const deLocalized = candidate.replace(/^\/(ar|en)(?=\/|$)/, "") || "/";

  if (deLocalized === "/" || deLocalized === "/login" || deLocalized === "/platform") {
    return "/modules";
  }

  if (deLocalized === "/dashboard" || deLocalized === "/dashboards") {
    return "/modules/discharge-refusal/dashboard";
  }

  if (deLocalized === "/cases" || deLocalized.startsWith("/cases/")) {
    return deLocalized.replace(/^\/cases/, "/modules/discharge-refusal/cases");
  }

  const operationalPrefixes = [
    "/modules",
    "/platform",
    "/tenant",
    "/admin",
    "/operations",
    "/reports",
    "/compliance",
    "/archive",
    "/dashboards",
  ];

  if (operationalPrefixes.some((prefix) => deLocalized === prefix || deLocalized.startsWith(`${prefix}/`))) {
    return deLocalized;
  }

  return fallback;
}

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
    panelTitle: isRtl ? "WathiqCare™" : "WathiqCare™",
    panelSubtitle: isRtl
      ? "منصة الأتمتة القانونية للرعاية الصحية"
      : "Enterprise Healthcare Legal Automation Platform",
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
      const nextPathRaw =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next") || result.redirectTo || fallbackRedirect
          : result.redirectTo || fallbackRedirect;

      router.push(normalizePostLoginDestination(nextPathRaw, fallbackRedirect));
    } catch {
      setError(copy.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  const brandFeatures = [
    { icon: ShieldCheck, title: copy.privacyTitle, desc: copy.privacyDesc },
    { icon: CheckCircle2, title: copy.complianceTitle, desc: copy.complianceDesc },
    { icon: Scale, title: copy.governanceTitle, desc: copy.governanceDesc },
  ];

  return (
    <main className="login-root min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      <Container
        as="div"
        size="full"
        className="login-grid mx-auto grid min-h-screen w-full max-w-[1740px] grid-cols-1 lg:grid-cols-2 !px-0"
      >
        {/* Brand panel */}
        <Section
          spacing="none"
          className={`login-brand relative overflow-hidden px-6 py-5 sm:py-8 sm:px-10 lg:px-14 lg:py-12 ${
            isRtl ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <div className="login-brand-texture absolute inset-0" aria-hidden="true" />
          <div className="login-orb login-orb--top absolute -top-20 -start-16 h-72 w-72 rounded-full" aria-hidden="true" />
          <div className="login-orb login-orb--bottom absolute -bottom-0 -end-0 h-80 w-80 rounded-full" aria-hidden="true" />

          <div className="relative z-10 flex h-full w-full max-w-[720px] flex-col">
            <div className="mb-5 flex items-start justify-between gap-4 sm:mb-10">
              <div className="login-logo-shell">
                <Image
                  src="/images/wathiqcare-logo.png"
                  alt="WathiqCare"
                  width={620}
                  height={190}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>
              <span className="login-trust-badge">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {copy.badge}
              </span>
            </div>

            <div className="max-w-[540px] space-y-3 sm:space-y-4">
              <p className="login-eyebrow">{copy.panelTitle}</p>
              <h1 className={`login-headline ${isRtl ? "arabic-headline" : ""}`}>{copy.panelSubtitle}</h1>
              <p className={`login-lead ${isRtl ? "arabic-body" : ""}`}>
                {isRtl
                  ? "حلول موثوقة لإدارة الموافقات والتفويضات القانونية في البيئات الصحية."
                  : "Trusted solutions for managing consents and legal authorizations in healthcare environments."}
              </p>
            </div>

            <Stack direction="column" gap={4} className="mt-6 sm:mt-10">
              {brandFeatures.map((item) => (
                <article key={item.title} className="login-feature">
                  <div className="login-feature-icon">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className={`login-feature-title ${isRtl ? "arabic-body" : ""}`}>{item.title}</h2>
                    <p className={`login-feature-desc ${isRtl ? "arabic-body" : ""}`}>{item.desc}</p>
                  </div>
                </article>
              ))}
            </Stack>

          </div>
        </Section>

        {/* Form panel */}
        <Section
          spacing="none"
          className={`login-form-wrap flex items-center justify-center px-5 py-5 sm:py-8 sm:px-10 lg:px-14 lg:py-12 ${
            isRtl ? "lg:order-2" : "lg:order-1"
          }`}
        >
          <div className="w-full max-w-[600px]">
            <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
              <Link href={`/${lang}`} className="login-home-link">
                {isRtl ? (
                  <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                )}
                {copy.home}
              </Link>

              <span className="login-lang-pill" aria-disabled="true">
                {isRtl ? "العربية" : "EN"}
              </span>
            </div>

            <Card variant="default" className="login-card">
              <CardHeader className="login-card-header p-0">
                <CardTitle className={`login-card-title ${isRtl ? "arabic-headline" : ""}`}>
                  {copy.title}
                </CardTitle>
                <CardDescription className={`login-card-subtitle ${isRtl ? "arabic-body" : ""}`}>
                  {copy.subtitle}
                </CardDescription>
              </CardHeader>

              <Form onSubmit={handlePasswordSubmit} className="space-y-5" noValidate>
                <FormField
                  name="email"
                  label={<span className={isRtl ? "arabic-body" : ""}>{copy.emailLabel}</span>}
                  htmlFor="email"
                  className="login-field"
                  labelClassName="login-field-label"
                >
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.emailPlaceholder}
                    size="xl"
                    startIcon={<Mail className="h-5 w-5" aria-hidden="true" />}
                    className={`login-input-wrap ${isRtl ? "text-right arabic-body" : "text-left"}`}
                  />
                </FormField>

                <FormField
                  name="password"
                  label={<span className={isRtl ? "arabic-body" : ""}>{copy.passwordLabel}</span>}
                  htmlFor="password"
                  className="login-field"
                  labelClassName="login-field-label"
                >
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    size="xl"
                    startIcon={<Lock className="h-5 w-5" aria-hidden="true" />}
                    endIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="login-eye-btn"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    }
                    className={`login-input-wrap ${isRtl ? "text-right arabic-body" : "text-left"}`}
                  />
                </FormField>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <label
                    className={`login-remember inline-flex cursor-pointer items-center gap-2 ${
                      isRtl ? "arabic-body" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="login-checkbox"
                    />
                    {copy.rememberMe}
                  </label>
                  <button
                    type="button"
                    className={`login-forgot ${isRtl ? "arabic-body" : ""}`}
                    aria-disabled="true"
                    disabled
                  >
                    {copy.forgotPassword}
                  </button>
                </div>

                {error ? (
                  <Alert variant="error" className={`login-error ${isRtl ? "arabic-body" : ""}`}>
                    {error}
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  variant="brand"
                  size="xl"
                  fullWidth
                  uppercase={false}
                  disabled={loading}
                  className={`login-primary-btn ${isRtl ? "arabic-body" : ""}`}
                >
                  {loading ? copy.signingIn : copy.signIn}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="xl"
                  fullWidth
                  uppercase={false}
                  disabled
                  className={`login-secondary-btn ${isRtl ? "arabic-body" : ""}`}
                >
                  <span className="font-semibold">{copy.imcBtn}</span>
                  <span className="login-secondary-btn-hint">{copy.imcSoon}</span>
                </Button>
              </Form>

              <footer className={`login-footer ${isRtl ? "arabic-body" : ""}`}>
                <a href="mailto:support@wathiqcare.online" className="login-footer-link">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {copy.support}
                </a>
                <span className="login-footer-item" aria-disabled="true">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {copy.privacy}
                </span>
                <a href="mailto:care@wathiqcare.online" className="login-footer-link">
                  {isRtl ? (
                    <ArrowUpLeft className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copy.contact}
                </a>
              </footer>
            </Card>

            <p
              className={`login-mobile-copy mt-6 text-center text-xs text-[#5b6f86] lg:hidden ${
                isRtl ? "arabic-body" : ""
              }`}
            >
              © {new Date().getFullYear()} WathiqCare. {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
          </div>
        </Section>
      </Container>

    </main>
  );
}
