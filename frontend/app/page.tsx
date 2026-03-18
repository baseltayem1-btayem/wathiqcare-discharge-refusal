"use client";

"use client";

import Link from "next/link";
import Image from "next/image";
import type { ComponentType } from "react";
import { ActivitySquare, BellRing, FileCheck2, Gavel, HeartPulse, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

type LandingFeature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

type JourneyStep = {
  step: string;
  title: string;
  description: string;
};

type StatItem = {
  value: string;
  label: string;
};

type LandingCopy = {
  headerRequestDemo: string;
  headerLogin: string;
  heroBadge: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroDescription: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  commandCenterLabel: string;
  commandCenterTitle: string;
  snapshotLabel: string;
  snapshotTitle: string;
  snapshotDescription: string;
  corePlatformLabel: string;
  corePlatformTitle: string;
  timelineStepPrefix: string;
  footerText: string;
  journeySteps: JourneyStep[];
  features: LandingFeature[];
  stats: StatItem[];
};

const LANDING_COPY: Record<"ar" | "en", LandingCopy> = {
  ar: {
    headerRequestDemo: "طلب عرض",
    headerLogin: "تسجيل الدخول",
    heroBadge: "منصة صحية قانونية متقدمة",
    heroTitleLead: "تجربة عالمية لإدارة",
    heroTitleAccent: "حالات رفض الخروج الطبي",
    heroDescription:
      "واثق كير يجمع الفريق الطبي والقانوني في لوحة عمليات واحدة، مع توثيق شفاف، توقيع رقمي، وتنبيهات تصعيد مبنية على الوقت لرفع جودة القرار وتقليل المخاطر.",
    heroPrimaryCta: "ابدأ الآن",
    heroSecondaryCta: "استعراض المنصة",
    commandCenterLabel: "Care Command Center",
    commandCenterTitle: "لوحة مراقبة لحظية لمسار الحالة",
    snapshotLabel: "Workflow Snapshot",
    snapshotTitle: "خط زمني تشغيلي داخل الإطار دائمًا",
    snapshotDescription:
      "التصميم التالي يعتمد شبكة مرنة تتكيّف تلقائيًا مع عرض الشاشة، من الجوال حتى الشاشات الكبيرة، دون خروج أي عنصر عن حدود النافذة.",
    corePlatformLabel: "Core Platform",
    corePlatformTitle: "مصمم وفق معايير منتجات الصحة الرقمية العالمية",
    timelineStepPrefix: "المرحلة",
    footerText: "تصميم وتجربة تشغيل وفق أفضل ممارسات SaaS للقطاع الصحي.",
    journeySteps: [
      {
        step: "01",
        title: "تسجيل الحالة",
        description: "توثيق بيانات المريض وقرار الخروج في نموذج موحد متوافق مع السياسة.",
      },
      {
        step: "02",
        title: "تواصل موثّق",
        description: "حفظ كل المحاولات والتدخلات الاجتماعية والطبية مع طابع زمني كامل.",
      },
      {
        step: "03",
        title: "اعتماد وتوقيع",
        description: "إصدار النماذج القانونية وجمع التوقيع الرقمي مع تتبّع الشهود.",
      },
      {
        step: "04",
        title: "تصعيد ذكي",
        description: "تنبيه تلقائي للتصعيد القانوني مع حزمة أدلة جاهزة للمراجعة.",
      },
    ],
    features: [
      {
        icon: HeartPulse,
        title: "إدارة الخروج الطبي",
        description: "مسار موحد من قرار الخروج حتى إغلاق الحالة بوضوح تشغيلي كامل.",
      },
      {
        icon: FileCheck2,
        title: "التوقيع الرقمي",
        description: "توقيع إلكتروني موثّق للمريض أو الولي مع إثبات زمني قابل للتدقيق.",
      },
      {
        icon: Gavel,
        title: "التصعيد القانوني",
        description: "تفعيل تصعيد تدريجي تلقائي يحافظ على الالتزام القانوني للمؤسسة.",
      },
      {
        icon: ActivitySquare,
        title: "الموافقات المستنيرة",
        description: "نماذج عربية وإنجليزية جاهزة مع حالة فورية لكل نموذج قانوني.",
      },
      {
        icon: BellRing,
        title: "الإشعارات الفورية",
        description: "تنبيهات آلية للفرق الطبية والقانونية عند كل انتقال في مسار الحالة.",
      },
      {
        icon: ShieldCheck,
        title: "سجل التدقيق",
        description: "سجل أحداث غير قابل للتلاعب يوثق كل قرار وتعديل ضمن القضية.",
      },
    ],
    stats: [
      { value: "99.9%", label: "جاهزية تشغيل" },
      { value: "< 90 ثانية", label: "لبدء قضية جديدة" },
      { value: "24/7", label: "مراقبة سير الحالة" },
      { value: "ISO 27001", label: "حوكمة أمن معلومات" },
    ],
  },
  en: {
    headerRequestDemo: "Request Demo",
    headerLogin: "Login",
    heroBadge: "Advanced Medico-Legal Health Platform",
    heroTitleLead: "A Global Experience for Managing",
    heroTitleAccent: "Medical Discharge Refusal Cases",
    heroDescription:
      "WathiqCare unifies medical and legal teams in one operations workspace with transparent documentation, digital signing, and timeline-based escalation alerts to improve decision quality and reduce risk.",
    heroPrimaryCta: "Get Started",
    heroSecondaryCta: "Explore Platform",
    commandCenterLabel: "Care Command Center",
    commandCenterTitle: "Real-Time Case Workflow Control",
    snapshotLabel: "Workflow Snapshot",
    snapshotTitle: "Operational Timeline That Always Fits",
    snapshotDescription:
      "This design uses a responsive grid that adapts from mobile to large screens so no element overflows or breaks layout boundaries.",
    corePlatformLabel: "Core Platform",
    corePlatformTitle: "Built to Global Digital Health Product Standards",
    timelineStepPrefix: "Stage",
    footerText: "Built with modern SaaS operating standards for the healthcare sector.",
    journeySteps: [
      {
        step: "01",
        title: "Case Registration",
        description: "Capture patient details and discharge decisions in a policy-aligned unified form.",
      },
      {
        step: "02",
        title: "Documented Communication",
        description: "Store all medical and social interventions with complete timestamps.",
      },
      {
        step: "03",
        title: "Approval & Signature",
        description: "Issue legal forms and collect digital signatures with witness tracking.",
      },
      {
        step: "04",
        title: "Smart Escalation",
        description: "Automatically trigger legal escalation with a ready-to-review evidence bundle.",
      },
    ],
    features: [
      {
        icon: HeartPulse,
        title: "Discharge Workflow Management",
        description: "A unified path from discharge decision to case closure with full operational clarity.",
      },
      {
        icon: FileCheck2,
        title: "Digital Signature",
        description: "Verified e-signature for patient or guardian with auditable timestamp proof.",
      },
      {
        icon: Gavel,
        title: "Legal Escalation",
        description: "Automated staged escalation to preserve institutional legal compliance.",
      },
      {
        icon: ActivitySquare,
        title: "Informed Consents",
        description: "Ready Arabic and English forms with instant status per legal document.",
      },
      {
        icon: BellRing,
        title: "Real-Time Alerts",
        description: "Automated notifications for medical and legal teams at each workflow transition.",
      },
      {
        icon: ShieldCheck,
        title: "Audit Trail",
        description: "Tamper-resistant event history for every decision and case update.",
      },
    ],
    stats: [
      { value: "99.9%", label: "Operational Uptime" },
      { value: "< 90 sec", label: "To Start a New Case" },
      { value: "24/7", label: "Workflow Monitoring" },
      { value: "ISO 27001", label: "Information Security Governance" },
    ],
  },
};

export default function HomePage() {
  const { lang, isRtl } = useI18n();
  const copy = LANDING_COPY[lang];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f2f9fa] text-slate-900" dir={isRtl ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute -left-24 top-[-120px] h-[340px] w-[340px] rounded-full" />
        <div className="orb-2 absolute -right-20 top-[90px] h-[360px] w-[360px] rounded-full" />
        <div className="orb-3 absolute bottom-[-180px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" />
      </div>

      <div style={{ height: "3px", background: "linear-gradient(90deg, #0ea5a4, #06b6d4, #0ea5a4)" }} />

      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Image
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={180}
            height={56}
            className="h-auto w-[128px] object-contain sm:w-[160px]"
            priority
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link
              href="/request-demo"
              className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 sm:text-sm"
            >
              {copy.headerRequestDemo}
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] hover:shadow-cyan-500/30 sm:text-sm"
              style={{ background: "linear-gradient(120deg, #0f766e, #0891b2, #06b6d4)" }}
            >
              {copy.headerLogin}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-16 md:pt-16">
        <div className="hero-reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-teal-700">
            {copy.heroBadge}
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {copy.heroTitleLead}
            <span className="block text-transparent" style={{ backgroundImage: "linear-gradient(120deg, #0f766e, #0891b2)", WebkitBackgroundClip: "text" }}>
              {copy.heroTitleAccent}
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            {copy.heroDescription}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-2xl px-6 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px]"
              style={{ background: "linear-gradient(120deg, #0f766e, #0891b2, #06b6d4)" }}
            >
              {copy.heroPrimaryCta}
            </Link>
            <Link
              href="/request-demo"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              {copy.heroSecondaryCta}
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {copy.stats.map((stat, index) => (
              <div key={stat.label} className="hero-reveal rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_24px_rgba(12,74,110,0.08)]" style={{ animationDelay: `${0.14 + index * 0.08}s` }}>
                <p className="text-2xl font-extrabold text-cyan-700">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-reveal" style={{ animationDelay: "0.16s" }}>
          <div className="relative overflow-hidden rounded-[28px] border border-teal-100 bg-white p-5 shadow-[0_20px_50px_rgba(8,145,178,0.18)] sm:p-6">
            <div className="absolute -left-10 top-16 h-24 w-24 rounded-full bg-cyan-100/60" />
            <div className="absolute -bottom-16 -right-8 h-40 w-40 rounded-full bg-teal-100/60" />

            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{copy.commandCenterLabel}</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">{copy.commandCenterTitle}</h2>

              <div className="mt-5 space-y-3">
                {copy.journeySteps.map((item) => (
                  <div key={item.step} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">{item.step}</span>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 md:px-8">
        <div className="rounded-3xl border border-cyan-100 bg-white/85 p-5 shadow-[0_14px_40px_rgba(8,145,178,0.12)] md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{copy.snapshotLabel}</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">{copy.snapshotTitle}</h3>
            </div>
            <p className="max-w-lg text-sm leading-7 text-slate-600">
              {copy.snapshotDescription}
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {copy.journeySteps.map((item, index) => (
              <article key={`timeline-${item.step}`} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
                <span className="text-xs font-bold text-teal-700">{copy.timelineStepPrefix} {item.step}</span>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
                {index < copy.journeySteps.length - 1 ? <div className="mt-3 h-px w-full bg-gradient-to-l from-cyan-300 to-transparent" /> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{copy.corePlatformLabel}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">{copy.corePlatformTitle}</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {copy.features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="hero-reveal group rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200" style={{ animationDelay: `${0.16 + index * 0.07}s` }}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25">
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/70 bg-white/80 px-4 py-6 text-center text-xs text-slate-500 md:px-8">
        © {new Date().getFullYear()} WathiqCare | {copy.footerText}
      </footer>

      <style jsx>{`
        .hero-reveal {
          animation: rise 0.7s ease both;
        }

        .orb-1,
        .orb-2,
        .orb-3 {
          filter: blur(52px);
        }

        .orb-1 {
          background: rgba(8, 145, 178, 0.25);
          animation: drift 10s ease-in-out infinite;
        }

        .orb-2 {
          background: rgba(13, 148, 136, 0.2);
          animation: drift 12s ease-in-out infinite reverse;
        }

        .orb-3 {
          background: rgba(34, 211, 238, 0.2);
          animation: drift 14s ease-in-out infinite;
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drift {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-14px) translateX(10px);
          }
        }
      `}</style>
    </main>
  );
}
