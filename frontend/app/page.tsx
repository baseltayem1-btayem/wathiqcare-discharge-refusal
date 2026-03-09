"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileCheck2, Gavel, Languages, ShieldCheck, Stethoscope, Workflow } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export default function HomePage() {
  const { lang, isRtl } = useI18n();

  const content =
    lang === "ar"
      ? {
          badge: "منصة واثق كير",
          heroTitle: "حوكمة رقمية موثوقة لمسارات الموافقة ورفض الخروج الطبي",
          heroSubtitle:
            "WathiqCare منصة تشغيلية مؤسسية توحد التوثيق الطبي والقانوني، وتدير مسارات الإقرار الرقمي، وتدعم المنشآت الصحية بالامتثال والتتبع الكامل.",
          enterSystem: "الدخول إلى النظام",
          requestDemo: "طلب عرض توضيحي",
          highlights: [
            "إقرار وموافقة مستنيرة قابلة للتدقيق",
            "نماذج رفض خروج طبي مع توقيع إلكتروني",
            "مسارات تصعيد قانوني وأرشفة أدلة",
            "تتبع امتثال تشغيلي CBAHI / JCI / PDPL",
          ],
          whatTitle: "ما هي WathiqCare؟",
          whatBody:
            "منصة تشغيلية طبية قانونية مصممة للمستشفيات ومقدمي الرعاية الصحية، لرقمنة قرارات الخروج الطبي وتوثيق حالات الرفض، وتوحيد الدليل النظامي عبر رحلة الحالة كاملة.",
          purposeTitle: "الهدف",
          purposeBody:
            "خفض المخاطر القانونية ورفع جودة التوثيق السريري والقانوني من خلال مسارات عمل واضحة، وقرارات موثقة، وسجلات تدقيق غير قابلة للإنكار.",
          visionTitle: "الرؤية",
          visionBody:
            "تمكين المنشآت الصحية في المملكة من معيار موحد لإدارة الموافقات والرفض والتصعيد القانوني ضمن إطار امتثال رقمي متكامل.",
          capabilityTitle: "القدرات الأساسية",
          capabilities: [
            {
              title: "الموافقة المستنيرة",
              body: "إدارة جلسات الإقرار والتوقيع الرقمي مع توثيق الأدلة وحالة التحقق لكل حالة.",
              icon: FileCheck2,
            },
            {
              title: "رفض الخروج الطبي",
              body: "سير عمل منظم لتسجيل قرار الطبيب وسبب الرفض والتدخلات الاجتماعية والإدارية.",
              icon: Stethoscope,
            },
            {
              title: "الحماية القانونية",
              body: "تجميع ملف قانوني متكامل مع مستندات الحالة وخطوات التصعيد ضمن إطار حوكمة واضح.",
              icon: Gavel,
            },
            {
              title: "الامتثال والتدقيق",
              body: "لوحات تشغيلية لمؤشرات الامتثال ومسار تدقيق زمني يدعم الجاهزية للمراجعة الداخلية والخارجية.",
              icon: ShieldCheck,
            },
            {
              title: "سير مؤسسي للمستشفى",
              body: "ربط فرق الطب والشؤون القانونية وعلاقات المرضى في رحلة عمل موحدة قابلة للتوسع.",
              icon: Workflow,
            },
          ],
          footerTitle: "منصة مؤسسية للتوثيق الطبي القانوني",
          footerBody:
            "تم بناء WathiqCare لتكون الواجهة الموثوقة لمسارات الإقرار، الرفض، والتصعيد القانوني داخل المنشآت الصحية.",
          statOneLabel: "قابلية التتبع",
          statOneValue: "100%",
          statTwoLabel: "جاهزية الامتثال",
          statTwoValue: "مؤسسية",
          statThreeLabel: "ربط الفرق",
          statThreeValue: "تشغيلي",
        }
      : {
          badge: "WathiqCare Platform",
          heroTitle: "Trusted Digital Governance for Consent and Discharge Refusal Workflows",
          heroSubtitle:
            "WathiqCare is an enterprise medico-legal operating platform that unifies clinical and legal documentation, orchestrates digital acknowledgment flows, and strengthens compliance readiness across hospitals.",
          enterSystem: "Enter System",
          requestDemo: "Request Demo",
          highlights: [
            "Audit-ready informed consent workflows",
            "Digitally signed discharge refusal forms",
            "Structured legal escalation and evidence files",
            "Operational CBAHI / JCI / PDPL compliance tracking",
          ],
          whatTitle: "What is WathiqCare?",
          whatBody:
            "A healthcare-grade medico-legal platform built for hospitals to digitize discharge decisions, document refusal scenarios, and preserve defensible case evidence across the full care journey.",
          purposeTitle: "Purpose",
          purposeBody:
            "Reduce legal risk and elevate documentation quality through standardized workflows, traceable decisions, and verifiable audit records.",
          visionTitle: "Vision",
          visionBody:
            "Establish a national-class standard for consent, refusal, and legal escalation management under one secure digital compliance framework.",
          capabilityTitle: "Core Capabilities",
          capabilities: [
            {
              title: "Informed Consent",
              body: "Manage acknowledgment sessions with digital signature methods and evidence-backed verification per case.",
              icon: FileCheck2,
            },
            {
              title: "Discharge Refusal",
              body: "A structured workflow to document physician decision, refusal rationale, and social-administrative interventions.",
              icon: Stethoscope,
            },
            {
              title: "Legal Protection",
              body: "Build complete legal case files with document lineage and escalation checkpoints under governed policy controls.",
              icon: Gavel,
            },
            {
              title: "Compliance and Auditability",
              body: "Operational dashboards and immutable audit timelines to support internal and external review readiness.",
              icon: ShieldCheck,
            },
            {
              title: "Institutional Hospital Workflow",
              body: "Connect clinical, legal, and patient affairs teams through one coordinated enterprise workflow.",
              icon: Workflow,
            },
          ],
          footerTitle: "Enterprise Medico-Legal Workflow Platform",
          footerBody:
            "WathiqCare is designed as the trusted digital front door for consent, refusal, and legal escalation operations in healthcare institutions.",
          statOneLabel: "Traceability",
          statOneValue: "100%",
          statTwoLabel: "Compliance Readiness",
          statTwoValue: "Enterprise",
          statThreeLabel: "Team Integration",
          statThreeValue: "Operational",
        };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f6f8] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-emerald-100/65 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
        <header className="rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.65)] backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                WC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{content.badge}</p>
                <p className="text-lg font-semibold leading-tight">WathiqCare</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2">
              <LanguageSwitcher className="bg-white" />
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_80px_-45px_rgba(2,6,23,0.55)] lg:col-span-8 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">
              <Languages className="h-3.5 w-3.5" />
              {lang === "ar" ? "منصة ثنائية اللغة" : "Bilingual Platform"}
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.8rem] lg:leading-[1.1]">
              {content.heroTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700 sm:text-lg">{content.heroSubtitle}</p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              {content.highlights.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  {point}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {content.enterSystem}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:demo@wathiqcare.online?subject=WathiqCare%20Demo%20Request"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {content.requestDemo}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_20px_70px_-45px_rgba(2,6,23,0.8)] lg:col-span-4 lg:p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">WathiqCare</p>
            <h2 className="mt-3 text-xl font-semibold leading-tight">{content.footerTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-200">{content.footerBody}</p>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-xs text-slate-300">{content.statOneLabel}</p>
                <p className="mt-1 text-base font-semibold">{content.statOneValue}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-xs text-slate-300">{content.statTwoLabel}</p>
                <p className="mt-1 text-base font-semibold">{content.statTwoValue}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                <p className="text-xs text-slate-300">{content.statThreeLabel}</p>
                <p className="mt-1 text-base font-semibold">{content.statThreeValue}</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">{content.whatTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">{content.whatBody}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">{content.purposeTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">{content.purposeBody}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">{content.visionTitle}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-700">{content.visionBody}</p>
          </article>
        </section>

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_15px_50px_-40px_rgba(2,6,23,0.55)] lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">WathiqCare</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{content.capabilityTitle}</h2>
            </div>
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              {content.enterSystem}
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {content.capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900 shadow-sm">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{item.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} WathiqCare. {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
            <div className="inline-flex items-center gap-2">
              <Link href="/login" className="font-semibold text-slate-800 hover:text-slate-900">
                {content.enterSystem}
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="mailto:demo@wathiqcare.online?subject=WathiqCare%20Demo%20Request"
                className="font-semibold text-slate-800 hover:text-slate-900"
              >
                {content.requestDemo}
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">{isRtl ? "واجهة عامة ثنائية اللغة، مع الحفاظ على وصول كامل للنظام الداخلي عبر /login." : "Public bilingual landing, while preserving full internal system access via /login."}</p>
        </div>
      </div>
    </main>
  );
}
