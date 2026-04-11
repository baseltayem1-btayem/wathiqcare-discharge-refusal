"use client";

import Link from "next/link";
import {
  Shield,
  FileText,
  Clock,
  BarChart3,
  Link2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Lock,
  Stethoscope,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// ─── Feature icon map ────────────────────────────────────────────────────────

const FEATURE_ICONS = [Clock, Shield, FileText, Link2, BarChart3, Lock];
const FEATURE_KEYS = [
  "workflow",
  "legal",
  "forms",
  "emr",
  "dashboard",
  "security",
] as const;

const WHO_ICONS = [Stethoscope, Building2, Users];
const WHO_KEYS = ["clinical", "facility", "legal"] as const;

// ─── Components ──────────────────────────────────────────────────────────────

function NavBar({ lang }: { lang: string }) {
  const { t, isRtl } = useI18n();

  return (
    <header className="wc-nav-shell fixed top-0 inset-x-0 z-50">
      <div
        className="wc-container h-16 flex items-center justify-between"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex items-center gap-3">
          <img
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={140}
            height={40}
            className="h-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-600 font-medium">
          <a href="#features" className="hover:text-cyan-700 transition">
            {t("landing.nav.features")}
          </a>
          <a href="#how" className="hover:text-cyan-700 transition">
            {t("landing.nav.howItWorks")}
          </a>
          <a href="#demo" className="hover:text-cyan-700 transition">
            {t("landing.nav.demo")}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href={`/${lang}/login`}
            className="wc-button-ghost h-10 px-4 text-sm"
          >
            {t("landing.nav.login")}
          </Link>
          <Link
            href={`/${lang}/request-demo`}
            className="wc-button-primary hidden sm:inline-flex h-10 px-4 text-sm"
          >
            {t("landing.nav.demo")}
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ lang }: { lang: string }) {
  const { t, isRtl } = useI18n();
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  return (
    <section
      className="pt-32 pb-20 px-6 bg-[linear-gradient(135deg,#EAF6FB_0%,#F8FCFE_100%)]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
        <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 text-xs font-semibold px-4 py-1.5 rounded-full border border-cyan-200">
          <Stethoscope size={14} />
          {t("landing.hero.badge")}
        </span>
        <h1 className="wc-h1 text-brand-navy leading-tight">
          {t("landing.hero.title")}
        </h1>
        <p className="wc-body text-neutral-600 max-w-2xl leading-relaxed">
          {t("landing.hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link
            href={`/${lang}/request-demo`}
            className="wc-button-primary px-8"
          >
            {t("landing.hero.cta1")}
            <ChevronDir size={18} />
          </Link>
          <Link
            href={`/${lang}/login`}
            className="wc-button-secondary px-8"
          >
            {t("landing.hero.cta2")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const { t, isRtl } = useI18n();

  const stats = [
    { value: t("landing.stats.pdplVal"), label: t("landing.stats.pdpl") },
    { value: t("landing.stats.uptimeVal"), label: t("landing.stats.uptime") },
    { value: t("landing.stats.docTimeVal"), label: t("landing.stats.docTime") },
    { value: t("landing.stats.icdVal"), label: t("landing.stats.icd") },
  ];

  return (
    <section className="bg-cyan-800 py-10 px-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-extrabold text-white">{s.value}</div>
            <div className="text-sky-100 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const { t, isRtl } = useI18n();

  return (
    <section id="features" className="py-20 px-6 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="wc-h2 text-brand-navy mb-3">
            {t("landing.features.title")}
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            {t("landing.features.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_KEYS.map((key, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div
                key={key}
                className="wc-card-soft hover:shadow-card transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center mb-4 group-hover:bg-cyan-700 transition">
                  <Icon size={22} className="text-cyan-700 group-hover:text-white transition" />
                </div>
                <h3 className="font-bold text-cyan-900 text-base mb-2">
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t(`landing.features.${key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { t, isRtl } = useI18n();

  const steps = [1, 2, 3, 4] as const;

  return (
    <section id="how" className="py-20 px-6 bg-[linear-gradient(135deg,#F5F9FC_0%,#EAF6FB_100%)]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="wc-h2 text-brand-navy mb-3">
            {t("landing.howItWorks.title")}
          </h2>
          <p className="text-slate-500 text-lg">{t("landing.howItWorks.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((n) => (
            <div key={n} className="wc-card flex gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xl font-extrabold">
                {n}
              </div>
              <div>
                <h3 className="font-bold text-cyan-900 text-base mb-1">
                  {t(`landing.howItWorks.step${n}.title`)}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t(`landing.howItWorks.step${n}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoIsItForSection() {
  const { t, isRtl } = useI18n();

  return (
    <section className="py-20 px-6 bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="wc-h2 text-brand-navy mb-3">
            {t("landing.whoFor.title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHO_KEYS.map((key, i) => {
            const Icon = WHO_ICONS[i];
            return (
              <div
                key={key}
                className="wc-card-soft text-center hover:shadow-card transition"
              >
                <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <Icon size={26} className="text-cyan-700" />
                </div>
                <h3 className="font-bold text-cyan-900 mb-2">
                  {t(`landing.whoFor.${key}.title`)}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t(`landing.whoFor.${key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComplianceSection() {
  const { t, isRtl } = useI18n();

  const items = [
    t("landing.compliance.items.0"),
    t("landing.compliance.items.1"),
    t("landing.compliance.items.2"),
    t("landing.compliance.items.3"),
    t("landing.compliance.items.4"),
    t("landing.compliance.items.5"),
  ];

  return (
    <section className="py-16 px-6 bg-cyan-900" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="wc-h3 text-white mb-2">
            {t("landing.compliance.title")}
          </h2>
          <p className="text-cyan-200 text-sm">{t("landing.compliance.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-3 border border-slate-600 bg-slate-800/60"
            >
              <CheckCircle2 size={18} className="text-cyan-300 flex-shrink-0" />
              <span className="text-white text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection({ lang }: { lang: string }) {
  const { t, isRtl } = useI18n();
  const ChevronDir = isRtl ? ChevronLeft : ChevronRight;

  return (
    <section
      id="demo"
      className="py-20 px-6 bg-[linear-gradient(135deg,#EAF6FB_0%,#F8FCFE_100%)]"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className="wc-h2 text-brand-navy">{t("landing.demo.title")}</h2>
        <p className="text-slate-600 text-lg leading-relaxed">{t("landing.demo.subtitle")}</p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href={`/${lang}/request-demo`}
            className="wc-button-primary px-10"
          >
            {t("landing.demo.cta1")}
            <ChevronDir size={18} />
          </Link>
          <Link
            href={`/${lang}/login`}
            className="wc-button-secondary px-10"
          >
            {t("landing.demo.cta2")}
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {t("landing.demo.contact")}{" "}
          <a href="mailto:demo@wathiqcare.online" className="text-cyan-600 underline">
            {t("landing.demo.email")}
          </a>
        </p>
      </div>
    </section>
  );
}

function Footer({ lang }: { lang: string }) {
  const { t, isRtl } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="wc-footer py-10 px-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="wc-container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={120}
            height={34}
            className="h-auto object-contain brightness-0 invert"
            loading="eager"
            decoding="async"
          />
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-slate-400 text-sm">
          <a href="#features" className="hover:text-white transition">
            {t("landing.footer.features")}
          </a>
          <a href="#how" className="hover:text-white transition">
            {t("landing.footer.howItWorks")}
          </a>
          <a href="#demo" className="hover:text-white transition">
            {t("landing.footer.demo")}
          </a>
          <Link href={`/${lang}/login`} className="hover:text-white transition">
            {t("landing.footer.login")}
          </Link>
          <Link href={`/${lang}/contact`} className="hover:text-white transition">
            {t("landing.footer.contact")}
          </Link>
          <Link href={`/${lang}/privacy`} className="hover:text-white transition">
            {t("landing.footer.privacy")}
          </Link>
          <Link href={`/${lang}/terms`} className="hover:text-white transition">
            {t("landing.footer.terms")}
          </Link>
        </nav>
        <p className="text-slate-500 text-xs">
          © {year} WathiqCare · {t("landing.footer.rights")}
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  // params.lang is accessed via useI18n (seeded from layout)
  // We still need lang for href construction — extract from useI18n
  return <LandingPageInner />;
}

function LandingPageInner() {
  const { lang } = useI18n();

  return (
    <>
      <NavBar lang={lang} />
      <HeroSection lang={lang} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <WhoIsItForSection />
      <ComplianceSection />
      <DemoSection lang={lang} />
      <Footer lang={lang} />
    </>
  );
}
