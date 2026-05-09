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
  ClipboardList,
  Receipt,
  LogOut,
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={140}
            height={40}
            className="h-auto w-full max-w-[220px] object-contain"
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

  return (
    <section
      className="hero relative overflow-hidden mt-16 w-full"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="hero-content space-y-5 px-8 py-10 md:px-10 md:py-12">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
            {t("landing.hero.badge")}
          </span>
          <span className="rounded-full border border-[#b89546] bg-[#b89546]/15 px-3 py-1 text-[#f5df9a]">
            PDPL Compliant
          </span>
        </div>
        <h1 className="font-serif text-4xl font-semibold leading-tight text-white md:text-5xl">
          {t("landing.hero.title").split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </h1>
        <p className="hero-subtext text-base leading-7 text-white md:text-lg">
          {t("landing.hero.subtitle")}
        </p>
        <div className="hero-actions flex flex-wrap gap-3">
          <Link
            href={`/${lang}/request-demo`}
            className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#002B5C] shadow-[0_10px_24px_rgba(15,23,42,0.28)] transition hover:bg-slate-100"
          >
            {t("landing.hero.cta1")}
          </Link>
          <Link
            href={`/${lang}/login`}
            className="inline-flex items-center justify-center rounded-xl border border-white bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            style={{ color: '#ffffff', borderColor: '#ffffff' }}
          >
            {t("landing.hero.cta2")}
          </Link>
        </div>
      </div>
      <style jsx>{`
        .hero {
          min-height: 80vh;
          display: flex;
          align-items: center;
          padding: 100px 0 80px;
          background-image: url("/images/demo-hero.jpg");
          background-size: cover;
          background-position: center;
          width: 100%;
        }

        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            rgba(0, 43, 92, 0.9) 0%,
            rgba(0, 43, 92, 0.75) 40%,
            rgba(0, 43, 92, 0.85) 100%
          );
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 1;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 25% 35%,
            rgba(75, 156, 211, 0.25),
            transparent 60%
          );
          z-index: 2;
        }

        .hero-content {
          position: relative;
          z-index: 3;
          max-width: 700px;
          width: 100%;
          padding-inline: 2rem;
        }

        .hero-subtext {
          opacity: 0.85;
        }

        @media (max-width: 768px) {
          .hero::before {
            background: linear-gradient(
              120deg,
              rgba(0, 43, 92, 0.95) 0%,
              rgba(0, 43, 92, 0.95) 40%,
              rgba(0, 43, 92, 0.95) 100%
            );
          }

          .hero-content {
            margin: 0 auto;
            text-align: center;
          }

          .hero {
            min-height: 70vh;
          }

          .hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .hero-actions :global(a) {
            width: 100%;
          }
        }
      `}</style>
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

function ModulesSection() {
  const { t, isRtl } = useI18n();

  const MODULES = [
    { key: "consents", Icon: ClipboardList },
    { key: "promissory", Icon: Receipt },
    { key: "discharge", Icon: LogOut },
  ] as const;

  return (
    <section className="py-16 px-6 bg-slate-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="wc-h2 text-brand-navy mb-3">
            {t("landing.modules.title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MODULES.map(({ key, Icon }) => (
            <div
              key={key}
              className="wc-card-soft text-center"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                <Icon size={26} className="text-cyan-700" />
              </div>
              <h3 className="font-bold text-cyan-900 text-lg">
                {t(`landing.modules.${key}.title`)}
              </h3>
            </div>
          ))}
        </div>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <ModulesSection />
      <FeaturesSection />
      <HowItWorksSection />
      <WhoIsItForSection />
      <ComplianceSection />
      <DemoSection lang={lang} />
      <Footer lang={lang} />
    </>
  );
}
