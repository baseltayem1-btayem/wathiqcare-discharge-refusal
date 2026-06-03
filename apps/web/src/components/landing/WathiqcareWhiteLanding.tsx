"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Stethoscope,
  Users,
  ShieldCheck,
  Scale,
  HeartPulse,
  FileCheck2,
  Signature,
  Archive,
  Languages,
  Network,
  Hospital,
} from "lucide-react";

type WathiqcareWhiteLandingProps = {
  lang?: string;
};

const LANDING_COPY = {
  en: {
    dir: "ltr",
    navItems: ["Home", "How It Works", "FAQ", "News", "Contact"],
    contactCta: "Get in Touch",
    heroTitle: "Human-Centered Informed Consent, Legally Protected Care.",
    heroSubtitle:
      "A Smart Digital Platform for Informed Consent and Medical Authorization in Saudi Arabia.",
    primaryCta: "Get started now",
    secondaryCta: "Learn more information",
    trustLead: "Trusted by industry experts",
    statsTitle: "Why To Choose WathiqCare?",
    statsItems: ["100% Secure Data Handling", "99.9% System Reliability", "0 Security Breaches"],
    stakeholdersTitle: "Designed for Every Stakeholder in the Healthcare Journey",
    stakeholdersSubtitle:
      "An advanced medical platform that leverages technology to streamline clinical workflows, enhance patient engagement, and enable data-driven healthcare decisions with confidence.",
    stakeholders: [
      { title: "Health Facilities", Icon: Building2 },
      { title: "Doctors & Care Staff", Icon: Stethoscope },
      { title: "Patients & Their Families", Icon: Users },
    ],
    stakeholdersSpotlightTitle: "Where Privacy Meets Performance Excellence",
    stakeholdersSpotlightBody:
      "Built to protect patient autonomy while accelerating clinical and legal workflows across modern care environments.",
    focusTitle: "What We Focus On",
    focusSubtitle:
      "We focus on delivering safer, more human-centered healthcare through strict regulatory compliance, stronger medico-legal governance, and patient-first workflows that preserve clarity, privacy, and accountability.",
    focusTiles: [
      { title: "Legal Protection & Documentation", Icon: Scale, imageSrc: "/images/landing-focus-legal.jpg" },
      { title: "Healthcare-Centered Patient Experience", Icon: HeartPulse, imageSrc: "/images/landing-focus-healthcare.jpg" },
      { title: "Compliance, Contracts & Governance", Icon: ShieldCheck, imageSrc: "/images/landing-focus-governance.jpg" },
    ],
    consentTitle: "Consent Made Simple, Secure, and Smart",
    consentSubtitle:
      "Our platform streamlines the creation, digital signing, and secure archiving of patient consent forms with full legal compliance, offering a bilingual interface that ensures clarity for patients and seamless integration with hospital systems to enhance workflow and safety.",
    consentFeatures: [
      { title: "Consent Editing in Seconds", Icon: FileCheck2 },
      { title: "Digital Signature via Nafaz", Icon: Signature },
      { title: "Smart Archiving Solutions", Icon: Archive },
      { title: "Strong Legal & Medical Foundation", Icon: Scale },
      { title: "Multilingual Tech Solution", Icon: Languages },
      { title: "Integrates with Hospital Systems", Icon: Network },
    ],
    partnersTitle: "Our Partners",
    partnersSubtitle:
      "Our platform is strengthened by legal, healthcare, and governance partners that support compliant, patient-centered digital workflows for the medical sector.",
    darAlMithaqLabel: "Dar Al-Mithaq Law Firm",
    partnerTwoLabel: "Tayem & Co",
    ctaTitle: "Ready to Transform Your Consent Process?",
    ctaButton: "Get Started Now",
    footerQuickLinks: "Quick Links",
    footerResources: "Resources",
    footerLegal: "Legal",
    footerQuickItems: ["Home", "How It Works", "FAQ"],
    footerResourceItems: ["News", "Insights", "Support"],
    footerLegalItems: ["Contact", "Privacy", "Terms"],
    footerRights: "© 2026 WathiqCare. All rights reserved.",
  },
  ar: {
    dir: "rtl",
    navItems: ["الرئيسية", "آلية العمل", "الأسئلة الشائعة", "الأخبار", "التواصل"],
    contactCta: "تواصل معنا",
    heroTitle: "موافقات طبية إنسانية بركيزة قانونية أكثر صلابة.",
    heroSubtitle:
      "منصة رقمية ذكية لإدارة الموافقات الطبية والتفويضات العلاجية في المملكة العربية السعودية.",
    primaryCta: "ابدأ الآن",
    secondaryCta: "اعرف المزيد",
    trustLead: "موثوق من خبراء القطاع",
    statsTitle: "لماذا تختار وثيق كير؟",
    statsItems: ["معالجة آمنة للبيانات بنسبة 100%", "اعتمادية تشغيلية 99.9%", "0 اختراقات أمنية"],
    stakeholdersTitle: "مصممة لكل طرف في رحلة الرعاية الصحية",
    stakeholdersSubtitle:
      "منصة طبية متقدمة توظف التقنية لتبسيط المسارات السريرية، وتعزيز تفاعل المرضى، وتمكين قرارات صحية موثوقة مدعومة بالبيانات.",
    stakeholders: [
      { title: "المنشآت الصحية", Icon: Building2 },
      { title: "الأطباء وفرق الرعاية", Icon: Stethoscope },
      { title: "المرضى وعائلاتهم", Icon: Users },
    ],
    stakeholdersSpotlightTitle: "حيث تلتقي الخصوصية مع التميز التشغيلي",
    stakeholdersSpotlightBody:
      "بنية مصممة لحماية استقلالية المريض وتسريع المسارات الطبية والقانونية داخل بيئات الرعاية الحديثة.",
    focusTitle: "ما الذي نركز عليه",
    focusSubtitle:
      "نركز على تقديم رعاية أكثر أماناً وإنسانية عبر الامتثال التنظيمي، وتعزيز الحوكمة الطبية القانونية، وبناء مسارات متمحورة حول المريض تحفظ الوضوح والخصوصية وقابلية التتبع.",
    focusTiles: [
      { title: "حماية قانونية وتوثيق رصين", Icon: Scale, imageSrc: "/images/landing-focus-legal.jpg" },
      { title: "تجربة صحية متمحورة حول المريض", Icon: HeartPulse, imageSrc: "/images/landing-focus-healthcare.jpg" },
      { title: "امتثال وعقود وحوكمة صحية", Icon: ShieldCheck, imageSrc: "/images/landing-focus-governance.jpg" },
    ],
    consentTitle: "موافقات مبسطة وآمنة وذكية",
    consentSubtitle:
      "تُبسّط منصتنا إنشاء نماذج الموافقات الطبية وتوقيعها رقمياً وأرشفتها بشكل آمن مع امتثال قانوني كامل، وواجهة ثنائية اللغة تمنح المرضى وضوحاً أكبر وتتكامل بسلاسة مع أنظمة المنشآت الصحية.",
    consentFeatures: [
      { title: "تحرير الموافقة خلال ثوانٍ", Icon: FileCheck2 },
      { title: "توقيع رقمي عبر نفاذ", Icon: Signature },
      { title: "أرشفة ذكية وآمنة", Icon: Archive },
      { title: "أساس طبي وقانوني قوي", Icon: Scale },
      { title: "تجربة ثنائية اللغة", Icon: Languages },
      { title: "تكامل مع أنظمة المنشأة", Icon: Network },
    ],
    partnersTitle: "شركاؤنا",
    partnersSubtitle:
      "تعتمد المنصة على شراكات قانونية وصحية وحوكمية تدعم مسارات رقمية متوافقة ومتمحورة حول المريض داخل القطاع الطبي.",
    darAlMithaqLabel: "دار الميثاق للمحاماة",
    partnerTwoLabel: "Tayem & Co",
    ctaTitle: "هل أنت جاهز لتحويل رحلة الموافقات لديك؟",
    ctaButton: "ابدأ الآن",
    footerQuickLinks: "روابط سريعة",
    footerResources: "الموارد",
    footerLegal: "قانوني",
    footerQuickItems: ["الرئيسية", "آلية العمل", "الأسئلة الشائعة"],
    footerResourceItems: ["الأخبار", "الرؤى", "الدعم"],
    footerLegalItems: ["التواصل", "الخصوصية", "الشروط"],
    footerRights: "© 2026 وثيق كير. جميع الحقوق محفوظة.",
  },
} as const;

export default function WathiqcareWhiteLanding({
  lang = "en",
}: WathiqcareWhiteLandingProps) {
  const routePrefix = lang ? `/${lang}` : "";
  const isArabic = lang === "ar";
  const copy = isArabic ? LANDING_COPY.ar : LANDING_COPY.en;
  const textAlign = isArabic ? "text-right items-end" : "text-left items-start";

  return (
    <main className="landing-root bg-white text-[#07111F]" dir={copy.dir}>
      <section className="hero relative min-h-[84vh] overflow-hidden">
        <Image
          src="/images/demo-hero.jpg"
          alt="Healthcare professionals collaborating in a clinical environment"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="hero-overlay absolute inset-0" />

        <div className="relative z-10 mx-auto flex min-h-[84vh] w-full max-w-7xl flex-col px-6 pb-16 pt-6 md:px-10">
          <header className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between md:items-center md:gap-5">
            <Image
              src="/images/wathiqcare-logo.png"
              alt="WathiqCare"
              width={460}
              height={130}
              priority
              className="h-auto w-auto shrink-0 object-cover brightness-0 invert max-w-[280px] max-h-[84px] sm:max-w-[300px] sm:max-h-[90px] md:max-w-[430px] md:max-h-[128px] lg:max-w-[520px] lg:max-h-[156px]"
            />

            <nav className="hidden items-center gap-4 text-xs font-medium text-white/95 2xl:flex">
              {copy.navItems.map((item) => (
                <a key={item} href="#" className="transition hover:text-white">
                  {item}
                </a>
              ))}
            </nav>

            <Link
              href={`${routePrefix}/contact`}
              className="self-end rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:self-auto sm:px-4 sm:text-sm"
            >
              {copy.contactCta}
            </Link>
          </header>

          <div className={`my-auto max-w-3xl pt-14 md:pt-10 ${isArabic ? "mr-auto text-right" : ""}`}>
            <h1 className="font-[Manrope,Inter,system-ui,sans-serif] text-4xl font-extrabold leading-tight text-white md:text-6xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90 md:text-xl">
              {copy.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${routePrefix}/request-demo`}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#075061] shadow-lg transition hover:bg-slate-100"
              >
                {copy.primaryCta}
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.secondaryCta}
              </a>
            </div>

            <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white/90">
              <span className="font-semibold">{copy.trustLead}</span>
              <span className="h-1 w-1 rounded-full bg-white/80" />
              <span className="font-bold">4.9</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-6 py-8 text-white md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 text-center md:grid-cols-4 md:text-left">
          <div className="text-lg font-bold">{copy.statsTitle}</div>
          {copy.statsItems.map((item) => (
            <div key={item} className="text-sm font-semibold">{item}</div>
          ))}
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            {copy.stakeholdersTitle}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[#4B5563]">
            {copy.stakeholdersSubtitle}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-8">
              {copy.stakeholders.map(({ title, Icon }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#0B5A70_0%,#2596BE_100%)] p-6 text-white shadow-[0_14px_28px_rgba(7,80,97,0.2)]"
                >
                  <Icon className="h-7 w-7 text-white" />
                  <h3 className="mt-4 text-lg font-bold">{title}</h3>
                </article>
              ))}
            </div>

            <article className="rounded-2xl bg-[linear-gradient(180deg,#075061_0%,#2596BE_100%)] p-7 text-white shadow-[0_18px_36px_rgba(7,80,97,0.24)] lg:col-span-4">
              <Hospital className="h-8 w-8" />
              <h3 className="mt-4 text-2xl font-extrabold leading-snug">
                {copy.stakeholdersSpotlightTitle}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/90">
                {copy.stakeholdersSpotlightBody}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            {copy.focusTitle}
          </h2>
          <p className="mt-4 max-w-5xl text-base leading-8 text-[#4B5563]">
            {copy.focusSubtitle}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.focusTiles.map(({ title, Icon, imageSrc }) => (
              <article
                key={title}
                className="relative overflow-hidden rounded-2xl border border-[#2596BE]/20"
              >
                <Image
                  src={imageSrc}
                  alt={title}
                  width={1100}
                  height={500}
                  className="h-52 w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.72),rgba(37,150,190,0.38))]" />
                <div className="absolute inset-0 flex items-end p-6">
                  <div className="flex items-center gap-3 text-white">
                    <Icon className="h-6 w-6" />
                    <h3 className="text-lg font-bold">{title}</h3>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            {copy.consentTitle}
          </h2>
          <p className="mt-4 max-w-5xl text-base leading-8 text-[#4B5563]">
            {copy.consentSubtitle}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {copy.consentFeatures.map(({ title, Icon }) => (
              <article
                key={title}
                className="rounded-2xl bg-[linear-gradient(180deg,#0B5A70_0%,#2596BE_100%)] p-6 text-white shadow-[0_14px_28px_rgba(7,80,97,0.2)]"
              >
                <Icon className="h-6 w-6" />
                <h3 className="mt-4 text-lg font-bold leading-snug">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            <article className="overflow-hidden rounded-2xl border border-[#2596BE]/20 bg-white p-3 shadow-sm">
              <Image
                src="/images/landing-focus-healthcare.jpg"
                alt={copy.focusTiles[1].title}
                width={700}
                height={500}
                className="h-40 w-full rounded-xl object-cover"
              />
            </article>
            <article className="overflow-hidden rounded-2xl border border-[#2596BE]/20 bg-white p-3 shadow-sm">
              <a
                href="https://daralmithaq.sa"
                target="_blank"
                rel="noopener noreferrer"
                title={copy.darAlMithaqLabel}
                aria-label={copy.darAlMithaqLabel}
                className="flex h-40 w-full items-center justify-center rounded-xl bg-white p-5"
              >
                <Image
                  src="/images/partners/dar-al-mithaq-logo.png"
                  alt={copy.darAlMithaqLabel}
                  width={500}
                  height={220}
                  className="h-full w-full object-cover"
                />
              </a>
            </article>
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
              {copy.partnersTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#4B5563]">
              {copy.partnersSubtitle}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-[#2596BE]/18 bg-white p-5 shadow-sm">
                <a href="https://daralmithaq.sa" target="_blank" rel="noopener noreferrer" className={`flex gap-4 ${isArabic ? "flex-row-reverse items-center text-right" : "items-center"}`}>
                  <Image
                    src="/images/partners/dar-al-mithaq-logo.png"
                    alt={copy.darAlMithaqLabel}
                    width={180}
                    height={78}
                    className="h-14 w-auto object-cover"
                  />
                  <div className={`flex flex-col ${textAlign}`}>
                    <h3 className="text-lg font-bold text-[#07111F]">{copy.darAlMithaqLabel}</h3>
                    <span className="text-sm text-[#4B5563]">daralmithaq.sa</span>
                  </div>
                </a>
              </article>
              <article className="rounded-2xl border border-[#2596BE]/18 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-[#07111F]">{copy.partnerTwoLabel}</h3>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-6 py-16 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            {copy.ctaTitle}
          </h2>
          <Link
            href={`${routePrefix}/request-demo`}
            className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#075061] transition hover:bg-slate-100"
          >
            {copy.ctaButton}
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#2596BE]/20 bg-white px-6 py-14 md:px-10">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative h-10 w-44">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                fill
                sizes="176px"
                className="object-cover"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">{copy.footerQuickLinks}</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              {copy.footerQuickItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">{copy.footerResources}</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              {copy.footerResourceItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#07111F]">{copy.footerLegal}</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              {copy.footerLegalItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-7xl border-t border-[#2596BE]/16 pt-5 text-sm text-[#4B5563]">
          <p>{copy.footerRights}</p>
        </div>
      </footer>
    </main>
  );
}
