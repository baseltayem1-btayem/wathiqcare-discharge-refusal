"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
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
  LogIn,
  Menu,
  X,
  ChevronDown,
  FileText,
  Banknote,
  FileWarning,
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

type NavItem = {
  label: string;
  href: string;
  isButton?: boolean;
  variant?: "primary" | "outline" | "ghost";
};

const MODULES = [
  {
    id: "informed-consent",
    icon: ClipboardCheck,
    eyebrowKey: "informedConsentEyebrow",
    titleKey: "informedConsentTitle",
    descKey: "informedConsentDesc",
    href: "/modules/informed-consents",
    tags: ["Patient Journey", "Digital Signature", "Bilingual"],
    tagsAr: ["رحلة المريض", "توقيع رقمي", "ثنائي اللغة"],
  },
  {
    id: "wathiqnote",
    icon: Banknote,
    eyebrowKey: "wathiqnoteEyebrow",
    titleKey: "wathiqnoteTitle",
    descKey: "wathiqnoteDesc",
    href: "/modules/promissory-notes/enterprise",
    tags: ["Financial Undertaking", "OTP Signing", "Legal Record"],
    tagsAr: ["تعهد مالي", "توقيع برمز تحقق", "سجل قانوني"],
  },
  {
    id: "discharge-refusal",
    icon: FileWarning,
    eyebrowKey: "dischargeRefusalEyebrow",
    titleKey: "dischargeRefusalTitle",
    descKey: "dischargeRefusalDesc",
    href: "/modules/discharge-refusal",
    tags: ["Medico-Legal", "Patient Acknowledgment", "Evidence Trail"],
    tagsAr: ["طبيب قانوني", "إقرار المريض", "سجل الأدلة"],
  },
  {
    id: "approved-forms",
    icon: BookOpen,
    eyebrowKey: "approvedFormsEyebrow",
    titleKey: "approvedFormsTitle",
    descKey: "approvedFormsDesc",
    href: "/modules/informed-consents/forms",
    tags: ["Controlled Library", "PDF Preview", "Version Control"],
    tagsAr: ["مكتبة منضبطة", "معاينة PDF", "التحكم بالإصدارات"],
  },
  {
    id: "audit-trail",
    icon: ShieldCheck,
    eyebrowKey: "auditTrailEyebrow",
    titleKey: "auditTrailTitle",
    descKey: "auditTrailDesc",
    href: "/modules",
    tags: ["Governance", "Traceability", "Compliance"],
    tagsAr: ["حوكمة", "تتبع", "امتثال"],
  },
];

const COPY = {
  en: {
    dir: "ltr",
    nav: {
      platformModules: "Platform Modules",
      subscriberLogin: "Subscriber Login",
      requestDemo: "Request Demo",
      contactUs: "Contact Us",
    },
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
    modulesSection: {
      eyebrow: "PLATFORM MODULES",
      title: "Enterprise Healthcare Legal Suite",
      subtitle:
        "Unified modules for clinical governance, traceability, speed, and controlled production workflows.",
      cta: "Explore Modules",
    },
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
    trustBar: {
      poweredBy: "Powered by",
      inPartnership: "In partnership with",
      enterpriseGrade: "Enterprise-grade security & governance",
    },
    footerQuickLinks: "Quick Links",
    footerResources: "Resources",
    footerLegal: "Legal",
    footerContact: "Contact",
    footerQuickItems: ["Home", "Platform Modules", "Request Demo"],
    footerResourceItems: ["News", "Insights", "Support"],
    footerLegalItems: ["Contact", "Privacy", "Terms"],
    footerRights: "© 2026 WathiqCare. All rights reserved.",
    // Module cards
    informedConsentEyebrow: "INFORMED CONSENT MANAGEMENT",
    informedConsentTitle: "Informed Consents",
    informedConsentDesc:
      "Approved consent library, patient journey, procedure selection, anesthesia review, education, physician approval, and secure patient signing.",
    wathiqnoteEyebrow: "WATHIQNOTE PROMISSORY NOTES",
    wathiqnoteTitle: "WathiqNote",
    wathiqnoteDesc:
      "Controlled legal workflow for financial undertakings, case tracking, approvals, supporting documents, OTP signing, and PDF evidence.",
    dischargeRefusalEyebrow: "DISCHARGE REFUSAL DOCUMENTATION",
    dischargeRefusalTitle: "Discharge Refusal",
    dischargeRefusalDesc:
      "Structured medico-legal documentation for discharge against medical advice, patient acknowledgment, and evidence trail.",
    approvedFormsEyebrow: "APPROVED MEDICAL FORMS LIBRARY",
    approvedFormsTitle: "Approved Forms",
    approvedFormsDesc:
      "Smart governed search for approved consent templates with in-page PDF preview and version control.",
    auditTrailEyebrow: "CLINICAL-LEGAL AUDIT TRAIL",
    auditTrailTitle: "Audit Trail",
    auditTrailDesc:
      "Controlled medico-legal traceability aligned with healthcare governance and production review.",
  },
  ar: {
    dir: "rtl",
    nav: {
      platformModules: "وحدات المنصة",
      subscriberLogin: "دخول المشتركين",
      requestDemo: "طلب عرض توضيحي",
      contactUs: "تواصل معنا",
    },
    heroTitle: "موافقات طبية إنسانية بركيزة قانونية أكثر صلابة.",
    heroSubtitle:
      "منصة رقمية ذكية لإدارة الموافقات الطبية والتفويضات العلاجية في المملكة العربية السعودية.",
    primaryCta: "ابدأ الآن",
    secondaryCta: "اعرف المزيد",
    trustLead: "موثوق من خبراء القطاع",
    statsTitle: "لماذا تختار واثق كير؟",
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
    modulesSection: {
      eyebrow: "وحدات المنصة",
      title: "حلول قانونية صحية مؤسسية",
      subtitle:
        "وحدات موحدة للحوكمة السريرية، التتبع، السرعة، ومسارات الإنتاج المنضبطة.",
      cta: "استكشف الوحدات",
    },
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
    trustBar: {
      poweredBy: "مدعومة بواسطة",
      inPartnership: "بالشراكة مع",
      enterpriseGrade: "أمان وحوكمة على مستوى المؤسسات",
    },
    footerQuickLinks: "روابط سريعة",
    footerResources: "الموارد",
    footerLegal: "قانوني",
    footerContact: "التواصل",
    footerQuickItems: ["الرئيسية", "وحدات المنصة", "طلب عرض توضيحي"],
    footerResourceItems: ["الأخبار", "الرؤى", "الدعم"],
    footerLegalItems: ["التواصل", "الخصوصية", "الشروط"],
    footerRights: "© 2026 واثق كير. جميع الحقوق محفوظة.",
    // Module cards
    informedConsentEyebrow: "إدارة الموافقات المستنيرة",
    informedConsentTitle: "الموافقات المستنيرة",
    informedConsentDesc:
      "مكتبة موافقات معتمدة، رحلة المريض، اختيار الإجراء، مراجعة التخدير، التثقيف، اعتماد الطبيب، والتوقيع الآمن للمريض.",
    wathiqnoteEyebrow: "سندات واثق والتعهدات المالية",
    wathiqnoteTitle: "واثق نوت",
    wathiqnoteDesc:
      "مسار قانوني منضبط للتعهدات المالية، متابعة الحالات، الاعتمادات، المستندات الداعمة، التوقيع برمز التحقق، وأدلة PDF.",
    dischargeRefusalEyebrow: "توثيق رفض الخروج",
    dischargeRefusalTitle: "رفض الخروج",
    dischargeRefusalDesc:
      "توثيق طبي قانوني منظم لحالات الخروج خلافاً للنصيحة الطبية، إقرار المريض، وسجل الأدلة.",
    approvedFormsEyebrow: "مكتبة النماذج الطبية المعتمدة",
    approvedFormsTitle: "النماذج المعتمدة",
    approvedFormsDesc:
      "بحث ذكي منضبط لقوالب الموافقات المعتمدة مع معاينة PDF داخل الصفحة والتحكم بالإصدارات.",
    auditTrailEyebrow: "سجل التدقيق الطبي القانوني",
    auditTrailTitle: "سجل التدقيق",
    auditTrailDesc:
      "تتبع طبي قانوني منضبط متوافق مع حوكمة الرعاية الصحية ومراجعة الإنتاج.",
  },
} as const;

function TrustBadge({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </div>
  );
}

export default function WathiqcareWhiteLanding() {
  const { lang, isRtl, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render the server-safe default locale on first paint to avoid hydration
  // mismatches, then switch to the user's persisted locale after mount.
  const effectiveLang = mounted ? lang : "en";
  const effectiveIsRtl = effectiveLang === "ar";
  const isArabic = effectiveLang === "ar";
  const copy = isArabic ? COPY.ar : COPY.en;
  const textAlign = isArabic ? "text-right items-end" : "text-left items-start";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: copy.nav.platformModules, href: "#platform-modules" },
      { label: copy.nav.contactUs, href: "#contact" },
      { label: copy.nav.requestDemo, href: "/request-demo", variant: "outline" },
      { label: copy.nav.subscriberLogin, href: "/login", variant: "primary" },
    ],
    [copy.nav]
  );

  return (
    <main className="landing-root bg-white text-[#07111F]" dir={copy.dir}>
      {/* ─── NAV ─────────────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-9 w-9">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-extrabold text-[#002B5C]">WathiqCare</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const baseClasses =
                "rounded-lg px-4 py-2 text-sm font-bold transition";
              const variantClasses =
                item.variant === "primary"
                  ? "bg-[#0B5A70] text-white hover:bg-[#074a5c]"
                  : item.variant === "outline"
                  ? "border border-[#0B5A70] text-[#0B5A70] hover:bg-[#0B5A70]/5"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0B5A70]";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`${baseClasses} ${variantClasses}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setLang(isArabic ? "en" : "ar")}
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-[#0B5A70] transition hover:bg-slate-50"
              aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}
            >
              <Languages className="h-4 w-4" />
              {isArabic ? "EN" : "عربي"}
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setLang(isArabic ? "en" : "ar")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-[#0B5A70]"
            >
              {isArabic ? "EN" : "عربي"}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-50"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const variantClasses =
                  item.variant === "primary"
                    ? "bg-[#0B5A70] text-white"
                    : item.variant === "outline"
                    ? "border border-[#0B5A70] text-[#0B5A70]"
                    : "text-slate-700";
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm font-bold ${variantClasses}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] overflow-hidden pt-16">
        <Image
          src="/images/demo-hero.jpg"
          alt="Healthcare professionals collaborating in a clinical environment"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B5A70]/85 via-[#0B5A70]/60 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[90vh] max-w-7xl flex-col justify-center px-4 py-20 md:px-6 lg:px-8">
          <div className={`max-w-3xl ${isArabic ? "mr-auto text-right" : ""}`}>
            <div className="mb-6 flex flex-wrap gap-2">
              <TrustBadge icon={ShieldCheck}>{copy.trustBar.enterpriseGrade}</TrustBadge>
              <TrustBadge>IMC {isArabic ? "©" : "×"} WathiqCare</TrustBadge>
            </div>

            <h1 className="font-[Manrope,Inter,system-ui,sans-serif] text-4xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 md:text-xl">
              {copy.heroSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/request-demo"
                className="rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#075061] shadow-lg transition hover:bg-slate-100"
              >
                {copy.primaryCta}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <LogIn className="h-4 w-4" />
                {copy.nav.subscriberLogin}
              </Link>
              <a
                href="#platform-modules"
                className="rounded-xl border border-white/30 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
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

      {/* ─── STATS ───────────────────────────────────────────── */}
      <section className="w-full bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-4 py-8 text-white md:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 text-center md:grid-cols-4 md:text-left">
          <div className="text-lg font-bold">{copy.statsTitle}</div>
          {copy.statsItems.map((item) => (
            <div key={item} className="flex items-center justify-center gap-2 text-sm font-semibold md:justify-start">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ─── STAKEHOLDERS ────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            {copy.stakeholdersTitle}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[#4B5563]">
            {copy.stakeholdersSubtitle}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {copy.stakeholders.map(({ title, Icon }) => (
              <article key={title} className="rounded-2xl border border-[#2596BE]/18 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7F7FB] text-[#0B5A70]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#07111F]">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLATFORM MODULES ────────────────────────────────── */}
      <section id="platform-modules" className="bg-[#F6FAFC] px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 text-center">
            <span className="text-sm font-black uppercase tracking-[0.28em] text-[#2596BE]">
              {copy.modulesSection.eyebrow}
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-[#07111F] md:text-4xl">
              {copy.modulesSection.title}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[#4B5563]">
              {copy.modulesSection.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((module) => {
              const Icon = module.icon;
              const tags = isArabic ? module.tagsAr : module.tags;
              return (
                <article
                  key={module.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7F7FB] text-[#0B5A70]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2596BE]">
                    {(copy as Record<string, string>)[module.eyebrowKey]}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#07111F]">
                    {(copy as Record<string, string>)[module.titleKey]}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-[#4B5563]">
                    {(copy as Record<string, string>)[module.descKey]}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={module.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#0B5A70] transition group-hover:gap-3"
                  >
                    {copy.modulesSection.cta}
                    <ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FOCUS ───────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
            {copy.focusTitle}
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[#4B5563]">
            {copy.focusSubtitle}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {copy.focusTiles.map(({ title, Icon, imageSrc }) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200"
              >
                <div className="relative h-48 w-full">
                  <Image src={imageSrc} alt={title} fill className="object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B5A70]/90 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONSENT FEATURES ────────────────────────────────── */}
      <section className="bg-[#F6FAFC] px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-[#07111F] md:text-4xl">
              {copy.consentTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-4xl text-base leading-8 text-[#4B5563]">
              {copy.consentSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {copy.consentFeatures.map(({ title, Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E7F7FB] text-[#0B5A70]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-[#07111F]">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PARTNERS ────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20 md:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                    className="h-full w-full object-contain"
                  />
                </a>
              </article>

              <article className="overflow-hidden rounded-2xl border border-[#2596BE]/20 bg-white p-3 shadow-sm">
                <div
                  title={isArabic ? "المركز الطبي الدولي" : "International Medical Center"}
                  aria-label={isArabic ? "المركز الطبي الدولي" : "International Medical Center"}
                  className="flex h-40 w-full items-center justify-center rounded-xl bg-white p-5"
                >
                  <Image
                    src="/images/imc-logo.png"
                    alt={isArabic ? "المركز الطبي الدولي" : "International Medical Center"}
                    width={500}
                    height={220}
                    className="h-full w-full object-contain"
                  />
                </div>
              </article>
            </div>
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
                    className="h-14 w-auto object-contain"
                  />
                  <div className={`flex flex-col ${textAlign}`}>
                    <h3 className="text-lg font-bold text-[#07111F]">{copy.darAlMithaqLabel}</h3>
                    <span className="text-sm text-[#4B5563]">daralmithaq.sa</span>
                  </div>
                </a>
              </article>

              <article className="rounded-2xl border border-[#2596BE]/18 bg-white p-5 shadow-sm">
                <a href="https://www.btayem.com/" target="_blank" rel="noopener noreferrer" className={`flex gap-4 ${isArabic ? "flex-row-reverse items-center text-right" : "items-center"}`}>
                  <Image
                    src="/images/partners/tayem-co-logo-royal-blue.png"
                    alt={copy.partnerTwoLabel}
                    width={180}
                    height={78}
                    className="h-16 w-auto object-contain opacity-100"
                  />
                  <div className={`flex flex-col ${textAlign}`}>
                    <h3 className="text-lg font-bold text-[#07111F]">{copy.partnerTwoLabel}</h3>
                    <span className="text-sm text-[#4B5563]">btayem.com</span>
                  </div>
                </a>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <section className="bg-[linear-gradient(90deg,#0B5A70_0%,#2596BE_100%)] px-4 py-16 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">
            {copy.ctaTitle}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/request-demo"
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#075061] transition hover:bg-slate-100"
            >
              {copy.ctaButton}
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              {copy.nav.subscriberLogin}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer id="contact" className="border-t border-[#2596BE]/20 bg-white px-4 py-14 md:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative mb-4 h-12 w-44">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                fill
                sizes="176px"
                className="object-contain"
              />
            </div>
            <p className="max-w-xs text-sm leading-7 text-[#4B5563]">
              {copy.trustBar.enterpriseGrade}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#E7F7FB] px-3 py-1 text-xs font-bold text-[#0B5A70]">IMC</span>
              <span className="rounded-full bg-[#E7F7FB] px-3 py-1 text-xs font-bold text-[#0B5A70]">WathiqCare</span>
              <span className="rounded-full bg-[#E7F7FB] px-3 py-1 text-xs font-bold text-[#0B5A70]">MOH Aligned</span>
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
            <h4 className="text-sm font-bold text-[#07111F]">{copy.footerContact}</h4>
            <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2596BE]" />
                demo@wathiqcare.online
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#2596BE]" />
                +966 543587772
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-[#2596BE]" />
                {isArabic ? "المركز الطبي الدولي، المملكة العربية السعودية" : "International Medical Center, Saudi Arabia"}
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex w-full max-w-7xl flex-col items-center justify-between gap-4 border-t border-[#2596BE]/16 pt-5 text-sm text-[#4B5563] md:flex-row">
          <p>{copy.footerRights}</p>
          <div className="flex gap-4">
            {copy.footerLegalItems.map((item) => (
              <span key={item} className="hover:text-[#0B5A70]">{item}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
