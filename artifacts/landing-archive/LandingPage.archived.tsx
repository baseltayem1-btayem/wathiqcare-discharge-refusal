import React from 'react';
import { ArrowRight, BadgeCheck, Globe2, Layers3, Shield, Sparkles, Workflow } from 'lucide-react';

interface Props {
  lang: 'en' | 'ar';
  onToggleLang: () => void;
  onEnterWorkspace: () => void;
  onOpenTracking: () => void;
}

const copy = {
  en: {
    eyebrow: 'Clinical consent operating system',
    title: 'Restore confidence across landing, modules, and informed consent flow.',
    subtitle: 'A production-ready physician workspace shaped around secure consent issuance, bilingual patient journeys, and auditable legal evidence.',
    primaryCta: 'Enter Modules Workspace',
    secondaryCta: 'Open Status Tracking',
    stats: [
      { label: 'Active modules', value: '08' },
      { label: 'Pending consents', value: '12' },
      { label: 'Compliance readiness', value: '98%' },
    ],
    pillars: [
      { title: 'Physician Modules', body: 'Search, compose, validate, and issue consents from one operational surface.' },
      { title: 'Patient Journey', body: 'Guide Arabic and English patients through OTP-secured consent steps with clinical context.' },
      { title: 'Evidence & Audit', body: 'Track immutable events, sealed PDFs, and package readiness without leaving the workspace.' },
    ],
    calloutTitle: 'Designed from the Figma system',
    calloutBody: 'The landing restores the branded first-touch experience instead of dropping physicians straight into an internal table view.',
    langSwitch: 'AR',
  },
  ar: {
    eyebrow: 'نظام تشغيل الموافقات السريرية',
    title: 'استعادة اللاندينج والموديولات ومسار الموافقة ضمن تجربة موحدة وواضحة.',
    subtitle: 'مساحة طبيب جاهزة للإنتاج مبنية على إصدار الموافقات الآمنة، ورحلة مريض ثنائية اللغة، وحزمة أدلة قابلة للتدقيق.',
    primaryCta: 'الدخول إلى مساحة الموديولات',
    secondaryCta: 'فتح متابعة الحالة',
    stats: [
      { label: 'الموديولات النشطة', value: '08' },
      { label: 'الموافقات المعلقة', value: '12' },
      { label: 'جاهزية الامتثال', value: '98%' },
    ],
    pillars: [
      { title: 'موديولات الطبيب', body: 'ابحث وابنِ وراجع وأصدر الموافقات من سطح تشغيلي واحد.' },
      { title: 'رحلة المريض', body: 'وجّه المريض العربي والإنجليزي خلال خطوات مؤمنة بـ OTP مع سياق سريري كامل.' },
      { title: 'الأدلة والتدقيق', body: 'تابع الأحداث غير القابلة للتغيير، والـ PDF المختوم، وجهوزية الحزمة الدليلية من نفس المكان.' },
    ],
    calloutTitle: 'مصممة بهوية الفيجما',
    calloutBody: 'اللاندينج تعيد نقطة الدخول البصرية الأصلية بدلاً من إسقاط المستخدم مباشرة في شاشة داخلية جافة.',
    langSwitch: 'EN',
  },
};

export function LandingPage({ lang, onToggleLang, onEnterWorkspace, onOpenTracking }: Props) {
  const isArabic = lang === 'ar';
  const content = copy[lang];

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#07111f] text-white ${isArabic ? '[font-family:Cairo,sans-serif]' : '[font-family:Manrope,sans-serif]'}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,144,199,0.30),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(18,183,181,0.24),transparent_25%),linear-gradient(180deg,#07111f_0%,#102a43_52%,#f7fbfc_160%)]" />
      <div className="absolute -left-28 top-28 h-72 w-72 rounded-full bg-[#12b7b5]/20 blur-3xl" />
      <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#2f90c7]/25 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d9a93b] via-[#f5c14d] to-[#12b7b5] shadow-lg shadow-cyan-950/30">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-[-0.03em]">WathiqCare</div>
              <div className="text-xs uppercase tracking-[0.34em] text-white/50">IMC Clinical Consent Platform</div>
            </div>
          </div>
          <button
            onClick={onToggleLang}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/86 transition-colors hover:bg-white/10"
          >
            {content.langSwitch}
          </button>
        </header>

        <main className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.25fr_0.9fr] lg:py-14">
          <section className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#12b7b5]/30 bg-[#12b7b5]/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-[#9be8de]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{content.eyebrow}</span>
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04] tracking-[-0.05em] text-white lg:text-7xl">
              {content.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68 lg:text-xl">
              {content.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={onEnterWorkspace}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-[#102a43] shadow-lg shadow-slate-950/20 transition-transform hover:-translate-y-0.5"
              >
                {content.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenTracking}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-6 py-4 text-sm font-semibold text-white/86 transition-colors hover:bg-white/10"
              >
                <Workflow className="h-4 w-4 text-[#9be8de]" />
                {content.secondaryCta}
              </button>
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {content.stats.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-5 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{item.label}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-white/45">{content.calloutTitle}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">WathiqCare Experience Map</div>
                </div>
                <BadgeCheck className="h-10 w-10 text-[#f5c14d]" />
              </div>
              <p className="mt-4 text-sm leading-7 text-white/68">{content.calloutBody}</p>

              <div className="mt-6 space-y-3">
                {content.pillars.map((pillar, index) => (
                  <div key={pillar.title} className="rounded-[24px] border border-white/10 bg-[#07111f]/34 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2f90c7] to-[#12b7b5] text-sm font-semibold text-white">
                        0{index + 1}
                      </div>
                      <div className="text-base font-semibold">{pillar.title}</div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/62">{pillar.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-[#102a43]/70 p-5 backdrop-blur-xl">
                <Layers3 className="h-5 w-5 text-[#9be8de]" />
                <div className="mt-3 text-lg font-semibold">{isArabic ? 'مركز الموديولات' : 'Modules hub'}</div>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  {isArabic ? 'بطاقات تشغيل واضحة بدلاً من لوحة جامدة، مع انتقالات مباشرة للبحث والبناء والتتبع.' : 'A clearer operational hub with module cards instead of a flat dashboard table.'}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-[#102a43]/70 p-5 backdrop-blur-xl">
                <Globe2 className="h-5 w-5 text-[#f5c14d]" />
                <div className="mt-3 text-lg font-semibold">{isArabic ? 'لغة موحدة' : 'Unified language state'}</div>
                <p className="mt-2 text-sm leading-7 text-white/62">
                  {isArabic ? 'اللغة والاتجاه الآن ينتقلان عبر كامل التطبيق بدل أن تتبدل كل شاشة بمعزل.' : 'Language and layout direction now flow through the whole app instead of resetting per screen.'}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}