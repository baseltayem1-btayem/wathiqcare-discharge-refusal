"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  HeartHandshake,
  Hospital,
  Landmark,
  LogIn,
  QrCode,
  ReceiptText,
  Scale,
  ScrollText,
  ShieldCheck,
  Signature,
  Smartphone,
  Stethoscope,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

type LandingProps = {
  informedConsentsHref?: string;
  promissoryNotesHref?: string;
};

type Copy = {
  nav: {
    home: string;
    modules: string;
    about: string;
    sponsors: string;
    contact: string;
    login: string;
  };
  hero: {
    brand: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
    operationalTag: string;
    operationalSubtag: string;
  };
  trustItems: string[];
  modules: {
    kicker: string;
    title: string;
    subtitle: string;
    consent: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
    notes: {
      title: string;
      description: string;
      features: string[];
      action: string;
    };
  };
  why: {
    title: string;
    subtitle: string;
    cards: Array<{ title: string; body: string; icon: LucideIcon }>;
  };
  sponsors: {
    title: string;
    subtitle: string;
    description: string;
    platformLabel: string;
    platformRole: string;
    lawLabel: string;
    lawRole: string;
    imcLabel: string;
    imcRole: string;
  };
  founder: {
    eyebrow: string;
    lead: string;
    name: string;
    role: string;
    reference: string;
  };
  contact: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
  legal: {
    privacyTitle: string;
    privacyBody: string;
    termsTitle: string;
    termsBody: string;
  };
  footer: {
    tagline: string;
    modulesTitle: string;
    linksTitle: string;
    sponsorsTitle: string;
    rights: string;
    moduleLinks: string[];
    linkLabels: {
      login: string;
      privacy: string;
      terms: string;
      contact: string;
    };
  };
};

const COPY: Record<"ar" | "en", Copy> = {
  ar: {
    nav: {
      home: "الرئيسية",
      modules: "الوحدات",
      about: "عن المنصة",
      sponsors: "الرعاة",
      contact: "تواصل معنا",
      login: "تسجيل الدخول",
    },
    hero: {
      brand: "واثق كير",
      title: "الهندسة القانونية الرقمية للرعاية الصحية",
      body: "منصة مؤسسية لتوثيق الموافقات الطبية والسندات لأمر الإلكترونية المرتبطة بالقطاع الصحي، بما يعزز حماية المريض، ويدعم مقدم الخدمة، ويوثق الحقوق والالتزامات بصورة آمنة وقابلة للإثبات.",
      primary: "اختر وحدتك الآن",
      secondary: "تسجيل الدخول",
      operationalTag: "منصة تشغيلية مؤسسية مرتبطة بهوية واثق كير",
      operationalSubtag: "توثيق الموافقات المستنيرة والسندات لأمر الإلكترونية بمسارات تحقق وتوقيع وأرشفة قابلة للإثبات.",
    },
    trustItems: [
      "توثيق صحي آمن",
      "تجربة مريض إنسانية",
      "حماية قانونية",
      "مسارات متوافقة",
      "أدلة رقمية قابلة للتحقق",
    ],
    modules: {
      kicker: "اختر وحدتك",
      title: "اختر وحدتك",
      subtitle: "وحدات تشغيلية متخصصة للقطاع الصحي",
      consent: {
        title: "الموافقات المستنيرة الإلكترونية",
        description: "إدارة نماذج الموافقات الطبية المعتمدة، إرسالها للمريض، التحقق بالرمز، التوقيع الإلكتروني، وإصدار نسخة PDF موثقة تتضمن بيانات المريض، رقم المستند، رقم التوقيع، وQR للتحقق.",
        features: [
          "نماذج طبية معتمدة",
          "تحقق OTP",
          "توقيع إلكتروني",
          "PDF موثق",
          "QR للتحقق",
          "سجل إثبات",
        ],
        action: "الدخول إلى وحدة الموافقات",
      },
      notes: {
        title: "السندات لأمر الإلكترونية",
        description: "إدارة السندات لأمر المرتبطة بالخدمات الصحية، توثيق الالتزامات المالية، وربطها ببيانات المريض أو الخدمة، مع مسار توقيع وتحقق إلكتروني آمن.",
        features: [
          "إنشاء سند لأمر",
          "بيانات المدين والمستفيد",
          "ربط بالخدمة الصحية",
          "توقيع إلكتروني",
          "PDF موثق",
          "سجل إثبات",
        ],
        action: "الدخول إلى وحدة السندات",
      },
    },
    why: {
      title: "لماذا واثق كير؟",
      subtitle: "امتداد تشغيلي رسمي لهوية واثق كير يترجم الحماية القانونية إلى مسارات عمل يومية داخل القطاع الصحي.",
      cards: [
        {
          title: "الامتثال والتنظيم",
          body: "مسارات مصممة وفق توقعات التنظيم الصحي السعودي ومبادئ حماية البيانات والحوكمة التشغيلية.",
          icon: Landmark,
        },
        {
          title: "الحماية القانونية",
          body: "توثيق شفاف يعزز الثقة بين المريض ومقدم الخدمة ويقلل فجوات الإثبات والالتباس الإجرائي.",
          icon: Scale,
        },
        {
          title: "تجربة المريض",
          body: "رحلات ثنائية اللغة تدعم الفهم والاستقلالية واتخاذ القرار المستنير بصورة واضحة وإنسانية.",
          icon: HeartHandshake,
        },
        {
          title: "الأرشفة والإثبات",
          body: "مستندات موقعة، QR للتحقق، أحداث تدقيق، وسجل رقمي قابل للاستناد القانوني.",
          icon: Archive,
        },
      ],
    },
    sponsors: {
      title: "الرعاة والأساس المؤسسي",
      subtitle: "تقاطع القانون والرعاية الصحية والتحول الرقمي داخل منصة تشغيلية جادة وقابلة للاعتماد.",
      description: "تم تطوير واثق كير عند تقاطع القانون، الرعاية الصحية، والتحول الرقمي، بدعم قانوني واستراتيجي من دار الميثاق للمحاماة، وبيئة طبية رائدة يمثلها المركز الطبي الدولي.",
      platformLabel: "واثق كير",
      platformRole: "المنصة والمشغل التقني",
      lawLabel: "Dar Al-Mithaq Law Firm",
      lawRole: "الراعي القانوني والاستراتيجي",
      imcLabel: "International Medical Center",
      imcRole: "الراعي الطبي / الشريك الطبي",
    },
    founder: {
      eyebrow: "القيادة القانونية الهندسية",
      lead: "بقيادة هندسة قانونية متخصصة",
      name: "Basel T. Tayem",
      role: "المؤسس / مهندس قانوني للرعاية الصحية",
      reference: "BTAYEM.COM",
    },
    contact: {
      title: "تواصل مؤسسي مباشر",
      body: "للتنسيق المؤسسي، العروض التعريفية، أو مناقشة التفعيل داخل المنشأة، استخدم القنوات الرسمية لواثق كير أو ادخل مباشرة إلى المنصة بحسب صلاحياتك.",
      primary: "زيارة WathiqCare.sa",
      secondary: "تسجيل الدخول",
    },
    legal: {
      privacyTitle: "سياسة الخصوصية",
      privacyBody: "تعرض هذه الصفحة العامة معلومات تشغيلية عالية المستوى فقط. تبقى البيانات الحساسة ومسارات العمل التفصيلية داخل الوحدات المحمية وصلاحياتها النظامية.",
      termsTitle: "الشروط والأحكام",
      termsBody: "الدخول إلى الوحدات يخضع للمصادقة والصلاحيات المؤسسية. تبقى مسارات التوقيع العام للمريض وروابط التحقق العامة متاحة بحسب تصميمها التشغيلي القائم.",
    },
    footer: {
      tagline: "Digital Legal Engineering for Healthcare",
      modulesTitle: "وحدات المنصة",
      linksTitle: "روابط",
      sponsorsTitle: "الرعاة",
      rights: "© 2026 واثق كير. جميع الحقوق محفوظة.",
      moduleLinks: ["الموافقات المستنيرة الإلكترونية", "السندات لأمر الإلكترونية"],
      linkLabels: {
        login: "تسجيل الدخول",
        privacy: "سياسة الخصوصية",
        terms: "الشروط والأحكام",
        contact: "تواصل معنا",
      },
    },
  },
  en: {
    nav: {
      home: "Home",
      modules: "Modules",
      about: "About",
      sponsors: "Sponsors",
      contact: "Contact",
      login: "Login",
    },
    hero: {
      brand: "WathiqCare",
      title: "Digital Legal Engineering for Healthcare",
      body: "An enterprise healthcare platform for electronic informed consents and healthcare-linked electronic promissory notes, designed to protect patients, support providers, and produce legally defensible digital records.",
      primary: "Choose Your Module",
      secondary: "Login",
      operationalTag: "Enterprise platform entry point aligned with official WathiqCare identity",
      operationalSubtag: "Operational workflows for informed consent, secure signing, verification evidence, and healthcare-linked promissory documentation.",
    },
    trustItems: [
      "Secure healthcare documentation",
      "Patient-centered experience",
      "Legal protection",
      "PDPL-aware workflows",
      "Verified digital evidence",
    ],
    modules: {
      kicker: "Choose Your Module",
      title: "Choose Your Module",
      subtitle: "Specialized operational modules for the healthcare sector",
      consent: {
        title: "Electronic Informed Consents",
        description: "Approved medical consent workflows, patient OTP verification, electronic signature, and verified signed PDF evidence.",
        features: [
          "Approved medical forms",
          "OTP verification",
          "Electronic signature",
          "Verified PDF",
          "QR verification",
          "Evidence record",
        ],
        action: "Open Consent Module",
      },
      notes: {
        title: "Electronic Promissory Notes",
        description: "Healthcare-linked electronic promissory note workflows for documenting financial commitments with secure digital signing and verification.",
        features: [
          "Create promissory note",
          "Debtor and beneficiary data",
          "Healthcare service linkage",
          "Electronic signature",
          "Verified PDF",
          "Evidence record",
        ],
        action: "Open Promissory Notes Module",
      },
    },
    why: {
      title: "Why WathiqCare?",
      subtitle: "An official operational extension of WathiqCare.sa that translates legal healthcare positioning into everyday enterprise execution.",
      cards: [
        {
          title: "Compliance & Regulation",
          body: "Workflows designed around Saudi healthcare regulatory expectations and data protection principles.",
          icon: Landmark,
        },
        {
          title: "Legal Protection",
          body: "Transparent documentation that strengthens patient-provider trust and reduces evidentiary gaps.",
          icon: Scale,
        },
        {
          title: "Patient Experience",
          body: "Clear bilingual patient journeys that support understanding, autonomy, and informed decision-making.",
          icon: HeartHandshake,
        },
        {
          title: "Archiving & Evidence",
          body: "Signed documents, verification QR, audit events, and legally defensible evidence records.",
          icon: Archive,
        },
      ],
    },
    sponsors: {
      title: "Sponsors & Institutional Foundation",
      subtitle: "Built where law, healthcare, and digital transformation meet inside a serious operational platform.",
      description: "WathiqCare is built at the intersection of law, healthcare, and digital transformation, supported by Dar Al-Mithaq Law Firm as legal and strategic sponsor and International Medical Center as medical sponsor.",
      platformLabel: "WathiqCare",
      platformRole: "Platform and technical operator",
      lawLabel: "Dar Al-Mithaq Law Firm",
      lawRole: "Legal and strategic sponsor",
      imcLabel: "International Medical Center",
      imcRole: "Medical sponsor / medical partner",
    },
    founder: {
      eyebrow: "Legal engineering leadership",
      lead: "Basel T. Tayem",
      name: "Founder / Legal Architect",
      role: "Healthcare Legal Engineering",
      reference: "BTAYEM.COM",
    },
    contact: {
      title: "Direct enterprise access",
      body: "For enterprise coordination, onboarding conversations, or sponsor-facing communication, use official WathiqCare channels or sign in directly to the platform based on your role.",
      primary: "Visit WathiqCare.sa",
      secondary: "Login",
    },
    legal: {
      privacyTitle: "Privacy Policy",
      privacyBody: "This public entry point presents only high-level operational information. Sensitive records and detailed workflows remain inside protected modules and governed access layers.",
      termsTitle: "Terms & Conditions",
      termsBody: "Module access remains subject to authentication and institutional authorization. Public patient signing routes and verification flows remain public by design.",
    },
    footer: {
      tagline: "Digital Legal Engineering for Healthcare",
      modulesTitle: "Platform Modules",
      linksTitle: "Links",
      sponsorsTitle: "Sponsors",
      rights: "© 2026 WathiqCare. All rights reserved.",
      moduleLinks: ["Electronic Informed Consents", "Electronic Promissory Notes"],
      linkLabels: {
        login: "Login",
        privacy: "Privacy Policy",
        terms: "Terms & Conditions",
        contact: "Contact",
      },
    },
  },
};

function LandingSection({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`landing-fade w-full ${className ?? ""}`.trim()}>
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">{children}</div>
    </section>
  );
}

function TrustChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="landing-slide flex items-center gap-3 rounded-full border border-[#d9e6f2] bg-white/80 px-4 py-3 text-sm font-semibold text-[#133a68] shadow-[0_8px_24px_rgba(8,33,61,0.05)] backdrop-blur">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#eef5fb,#f8f0db)] text-[#0f3765]">
        <Icon className="h-4 w-4" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export default function WathiqcareWhiteLanding({
  informedConsentsHref = "/login?next=%2Fmodules%2Finformed-consents",
  promissoryNotesHref = "/login?next=%2Fmodules%2Fpromissory-notes",
}: LandingProps) {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const copy = COPY[isArabic ? "ar" : "en"];

  const trustIcons: LucideIcon[] = [ShieldCheck, HeartHandshake, Scale, FileCheck2, BadgeCheck];
  const consentFeatures: Array<{ label: string; icon: LucideIcon }> = [
    { label: copy.modules.consent.features[0], icon: ScrollText },
    { label: copy.modules.consent.features[1], icon: Smartphone },
    { label: copy.modules.consent.features[2], icon: Signature },
    { label: copy.modules.consent.features[3], icon: FileCheck2 },
    { label: copy.modules.consent.features[4], icon: QrCode },
    { label: copy.modules.consent.features[5], icon: Archive },
  ];
  const noteFeatures: Array<{ label: string; icon: LucideIcon }> = [
    { label: copy.modules.notes.features[0], icon: ReceiptText },
    { label: copy.modules.notes.features[1], icon: Fingerprint },
    { label: copy.modules.notes.features[2], icon: Hospital },
    { label: copy.modules.notes.features[3], icon: Signature },
    { label: copy.modules.notes.features[4], icon: FileCheck2 },
    { label: copy.modules.notes.features[5], icon: Archive },
  ];

  return (
    <main
      className="dir-shell min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#edf5fb_0%,_#f7fbff_34%,_#ffffff_68%)] text-[#07111f] transition-all duration-300"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <LandingSection id="home" className="pt-5 sm:pt-7">
        <div className="rounded-[28px] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_18px_50px_rgba(7,17,31,0.06)] backdrop-blur-sm sm:px-7 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                width={232}
                height={74}
                priority
                className="h-auto w-[170px] sm:w-[210px]"
              />
              <div className="hidden h-10 w-px bg-[#dfe7f1] lg:block" />
              <div className="hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8da0b5]">WathiqCare</p>
                <p className="mt-1 text-sm font-semibold text-[#133a68]">{copy.hero.operationalTag}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#26486e]">
                <a href="#home" className="transition hover:text-[#0b4f75]">{copy.nav.home}</a>
                <a href="#modules" className="transition hover:text-[#0b4f75]">{copy.nav.modules}</a>
                <a href="#about" className="transition hover:text-[#0b4f75]">{copy.nav.about}</a>
                <a href="#sponsors" className="transition hover:text-[#0b4f75]">{copy.nav.sponsors}</a>
                <a href="#contact" className="transition hover:text-[#0b4f75]">{copy.nav.contact}</a>
              </nav>

              <div className="flex flex-wrap items-center gap-3">
                <LanguageSwitcher className="shadow-sm transition-all duration-300" />
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-[#d3dfec] bg-white px-4 py-2.5 text-sm font-bold text-[#0f3765] shadow-[0_8px_22px_rgba(7,17,31,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(7,17,31,0.08)]"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{copy.nav.login}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="pb-8 pt-8 sm:pb-10 sm:pt-10 lg:pb-12">
        <div className="hero-shell relative overflow-hidden rounded-[34px] border border-[#d7e4f0] bg-[linear-gradient(135deg,#05264e_0%,#0b3768_34%,#0c5a78_100%)] px-6 py-8 text-white shadow-[0_28px_80px_rgba(5,25,48,0.20)] sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="hero-grid relative z-10 grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className={`transition-all duration-300 ${isArabic ? "text-right" : "text-left"}`}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7a93d55] bg-[#f4c8601a] px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#f2d88d]">
                <span className="h-2 w-2 rounded-full bg-[#d7a93d]" />
                <span>{copy.hero.operationalTag}</span>
              </div>

              <div className="mt-7 flex items-center gap-4">
                <Image
                  src="/images/wathiqcare-logo.png"
                  alt="WathiqCare"
                  width={280}
                  height={88}
                  className="h-auto w-[170px] brightness-0 invert sm:w-[210px] lg:w-[250px]"
                />
              </div>

              <h1 className="mt-6 font-[var(--font-inter)] text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                {copy.hero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
                {copy.hero.body}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#d8e7f7] sm:text-base">
                {copy.hero.operationalSubtag}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#modules"
                  className="hero-glow inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d8ae47_0%,#f3d787_100%)] px-5 py-3 text-sm font-extrabold text-[#0b2c56] shadow-[0_14px_30px_rgba(215,169,61,0.26)] transition hover:-translate-y-0.5"
                >
                  <span>{copy.hero.primary}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 hover:bg-white/14"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{copy.hero.secondary}</span>
                </Link>
              </div>
            </div>

            <div className="landing-slide relative">
              <div className="absolute -inset-6 rounded-[36px] bg-[radial-gradient(circle_at_center,_rgba(107,185,230,0.18)_0%,_transparent_66%)] blur-2xl" />
              <div className="relative overflow-hidden rounded-[30px] border border-white/15 bg-white/10 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-6">
                <div className="grid gap-4">
                  <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f2d88d]">WathiqCare Platform</p>
                        <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
                          {isArabic ? "توثيق، تحقق، وتوقيع" : "Verify, Sign, Preserve"}
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-white/75">
                          {isArabic
                            ? "تجسيد بصري خفيف لمسار الموافقة والتحقق والإثبات داخل تجربة تشغيلية رسمية."
                            : "A restrained operational illustration of consent, verification, and legal evidence inside an official platform experience."}
                        </p>
                      </div>
                      <div className="illustration-node mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d7a93d1f] text-[#f4daa0]">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                        <FileCheck2 className="h-4 w-4 text-[#9bd5ff]" />
                        <span>{isArabic ? "مستند تشغيلي موثق" : "Operational document flow"}</span>
                      </div>
                      <div className="space-y-3">
                        {[
                          isArabic ? "هوية المريض" : "Patient identity",
                          isArabic ? "تحقق OTP" : "OTP verification",
                          isArabic ? "توقيع إلكتروني" : "Electronic signature",
                          isArabic ? "أرشفة وإثبات" : "Evidence archive",
                        ].map((item, index) => (
                          <div key={item} className="line-flow flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff14] text-xs font-black text-white">0{index + 1}</span>
                            <span className="text-sm font-semibold text-white/86">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">{isArabic ? "التحقق والأدلة" : "Verification & evidence"}</p>
                        <QrCode className="h-5 w-5 text-[#f2d88d]" />
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-[#ffffff12] p-3">
                          <p className="text-xs font-semibold text-white/55">{isArabic ? "الهوية" : "Identity"}</p>
                          <p className="mt-1 text-sm font-bold text-white">{isArabic ? "مطابقة مريض + وثيقة" : "Patient + document match"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#ffffff12] p-3">
                          <p className="text-xs font-semibold text-white/55">{isArabic ? "الإثبات" : "Evidence"}</p>
                          <p className="mt-1 text-sm font-bold text-white">QR + Signature ID + PDF</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#ffffff12] p-3">
                          <p className="text-xs font-semibold text-white/55">{isArabic ? "الحوكمة" : "Governance"}</p>
                          <p className="mt-1 text-sm font-bold text-white">PDPL-aware workflow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="pb-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {copy.trustItems.map((item, index) => {
            const Icon = trustIcons[index];
            return <TrustChip key={item} icon={Icon} label={item} />;
          })}
        </div>
      </LandingSection>

      <LandingSection id="modules" className="pb-16 pt-4 sm:pb-20">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d5b80]">{copy.modules.kicker}</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#0b2e57] sm:text-4xl">{copy.modules.title}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[#4d627d] sm:text-lg">{copy.modules.subtitle}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="module-card landing-slide flex h-full flex-col overflow-hidden rounded-[30px] border border-[#d9e6f2] bg-white shadow-[0_18px_50px_rgba(9,31,58,0.07)] transition-all duration-300">
            <div className="border-b border-[#dbe7f2] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5fb_64%,#f7f1e3_100%)] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b3768,#0d5b80)] text-white shadow-[0_14px_30px_rgba(11,55,104,0.18)]">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div className="rounded-full border border-[#d7a93d44] bg-[#f4c8601a] px-3 py-1 text-xs font-bold text-[#8d6a13]">
                  OTP · PDF · QR
                </div>
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#0b2e57]">{copy.modules.consent.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#465d77]">{copy.modules.consent.description}</p>
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {consentFeatures.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#e5edf5] bg-[#fbfdff] px-4 py-3 text-sm font-semibold text-[#173d68]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eaf4fb] text-[#0d5b80]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#d9e6f2] bg-[linear-gradient(135deg,#0b2e57_0%,#0e4c72_100%)] p-5 text-white">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#f2d88d]" />
                  <p className="text-sm font-bold">{isArabic ? "إثبات رقمي مرتبط بالمريض والمستند" : "Patient-linked verified digital evidence"}</p>
                </div>
              </div>

              <Link
                href={informedConsentsHref}
                className="mt-6 inline-flex items-center justify-between rounded-full bg-[linear-gradient(135deg,#0b3768_0%,#0d5b80_100%)] px-5 py-4 text-sm font-black text-white shadow-[0_18px_36px_rgba(11,55,104,0.18)] transition hover:-translate-y-0.5"
              >
                <span>{copy.modules.consent.action}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="module-card landing-slide flex h-full flex-col overflow-hidden rounded-[30px] border border-[#d9e6f2] bg-white shadow-[0_18px_50px_rgba(9,31,58,0.07)] transition-all duration-300">
            <div className="border-b border-[#dbe7f2] bg-[linear-gradient(135deg,#fffdfa_0%,#fbf6ea_36%,#eef5fb_100%)] p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c89d33,#e5c56f)] text-[#0b2e57] shadow-[0_14px_30px_rgba(200,157,51,0.18)]">
                  <ReceiptText className="h-6 w-6" />
                </div>
                <div className="rounded-full border border-[#0f376522] bg-[#0f37650d] px-3 py-1 text-xs font-bold text-[#0b3768]">
                  Secure note workflow
                </div>
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[#0b2e57]">{copy.modules.notes.title}</h3>
              <p className="mt-4 text-base leading-8 text-[#465d77]">{copy.modules.notes.description}</p>
            </div>
            <div className="flex flex-1 flex-col p-6 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {noteFeatures.map(({ label, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-[#ece6d9] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#173d68]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff2d2] text-[#9a7522]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-[#eadbae] bg-[linear-gradient(135deg,#fff5d8_0%,#f8ecbf_100%)] p-5 text-[#0b2e57]">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#a1781d]" />
                  <p className="text-sm font-bold">{isArabic ? "توثيق مالي مرتبط بخدمة صحية ومسار تحقق آمن" : "Healthcare-linked financial documentation with secure verification"}</p>
                </div>
              </div>

              <Link
                href={promissoryNotesHref}
                className="mt-6 inline-flex items-center justify-between rounded-full bg-[linear-gradient(135deg,#c89d33_0%,#e5c56f_100%)] px-5 py-4 text-sm font-black text-[#0b2e57] shadow-[0_18px_36px_rgba(200,157,51,0.18)] transition hover:-translate-y-0.5"
              >
                <span>{copy.modules.notes.action}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </LandingSection>

      <LandingSection id="about" className="pb-16 sm:pb-20">
        <div className="rounded-[34px] border border-[#dbe7f2] bg-white/90 p-6 shadow-[0_18px_50px_rgba(9,31,58,0.06)] backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d5b80]">{copy.why.title}</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#0b2e57] sm:text-4xl">{copy.why.title}</h2>
            <p className="mt-4 text-base leading-8 text-[#4d627d] sm:text-lg">{copy.why.subtitle}</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {copy.why.cards.map(({ title, body, icon: Icon }) => (
              <article key={title} className="landing-slide rounded-[24px] border border-[#e1ebf4] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfe_100%)] p-5 shadow-[0_10px_24px_rgba(9,31,58,0.04)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#edf5fb,#f9f1dc)] text-[#0d5b80]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-black text-[#0b2e57]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#4d627d]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </LandingSection>

      <LandingSection id="sponsors" className="pb-16 sm:pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="landing-slide rounded-[32px] border border-[#d9e6f2] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-6 shadow-[0_18px_50px_rgba(9,31,58,0.06)] sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0d5b80]">{copy.sponsors.title}</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#0b2e57] sm:text-4xl">{copy.sponsors.title}</h2>
            <p className="mt-4 text-base leading-8 text-[#4d627d] sm:text-lg">{copy.sponsors.subtitle}</p>
            <p className="mt-5 text-sm leading-7 text-[#586d86]">{copy.sponsors.description}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <article className="landing-slide rounded-[28px] border border-[#dbe7f2] bg-white p-5 shadow-[0_14px_38px_rgba(9,31,58,0.06)]">
              <div className="flex h-24 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] p-4">
                <Image src="/images/wathiqcare-logo.png" alt="WathiqCare" width={180} height={60} className="h-auto w-[150px]" />
              </div>
              <h3 className="mt-5 text-lg font-black text-[#0b2e57]">{copy.sponsors.platformLabel}</h3>
              <p className="mt-2 text-sm font-semibold text-[#4d627d]">{copy.sponsors.platformRole}</p>
            </article>

            <article className="landing-slide rounded-[28px] border border-[#dbe7f2] bg-white p-5 shadow-[0_14px_38px_rgba(9,31,58,0.06)]">
              <div className="flex h-24 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfd_100%)] p-4">
                <Image src="/images/partners/dar-al-mithaq-logo.png" alt="Dar Al-Mithaq Law Firm" width={180} height={80} className="h-auto w-[150px] object-contain" />
              </div>
              <h3 className="mt-5 text-lg font-black text-[#0b2e57]">{copy.sponsors.lawLabel}</h3>
              <p className="mt-2 text-sm font-semibold text-[#4d627d]">{copy.sponsors.lawRole}</p>
            </article>

            <article className="landing-slide rounded-[28px] border border-[#dbe7f2] bg-white p-5 shadow-[0_14px_38px_rgba(9,31,58,0.06)]">
              <div className="flex h-24 items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4">
                <Image src="/images/imc-logo.png" alt="International Medical Center" width={160} height={80} className="h-auto w-[130px] object-contain" />
              </div>
              <h3 className="mt-5 text-lg font-black text-[#0b2e57]">{copy.sponsors.imcLabel}</h3>
              <p className="mt-2 text-sm font-semibold text-[#4d627d]">{copy.sponsors.imcRole}</p>
            </article>
          </div>
        </div>

        <div className="mt-5 lg:mt-6 lg:max-w-[52rem]">
          <article className="landing-slide rounded-[24px] border border-[#e2eaf2] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfe_100%)] p-5 shadow-[0_10px_24px_rgba(9,31,58,0.04)] sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8da0b5]">{copy.founder.eyebrow}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#4d627d]">{copy.founder.lead}</p>
                <h3 className="mt-1 text-xl font-black tracking-[-0.02em] text-[#0b2e57]">{copy.founder.name}</h3>
                <p className="mt-1 text-sm font-semibold text-[#51667f]">{copy.founder.role}</p>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0d5b80]">{copy.founder.reference}</p>
            </div>
          </article>
        </div>
      </LandingSection>

      <LandingSection id="contact" className="pb-16 sm:pb-20">
        <div className="landing-slide overflow-hidden rounded-[34px] border border-[#d9e6f2] bg-[linear-gradient(135deg,#0b2e57_0%,#0e4b71_70%,#0d6784_100%)] p-6 text-white shadow-[0_26px_70px_rgba(5,25,48,0.18)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">{copy.contact.title}</h2>
              <p className="mt-4 max-w-3xl text-base leading-8 text-white/80 sm:text-lg">{copy.contact.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.wathiqcare.sa"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#d8ae47_0%,#f3d787_100%)] px-5 py-3 text-sm font-black text-[#0b2e57] shadow-[0_14px_30px_rgba(215,169,61,0.24)] transition hover:-translate-y-0.5"
              >
                <span>{copy.contact.primary}</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/14"
              >
                <LogIn className="h-4 w-4" />
                <span>{copy.contact.secondary}</span>
              </Link>
            </div>
          </div>
        </div>
      </LandingSection>

      <LandingSection className="pb-8">
        <div className="grid gap-5 lg:grid-cols-2">
          <article id="privacy" className="landing-slide rounded-[24px] border border-[#dbe7f2] bg-white p-5 shadow-[0_10px_24px_rgba(9,31,58,0.05)]">
            <h3 className="text-lg font-black text-[#0b2e57]">{copy.legal.privacyTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-[#4d627d]">{copy.legal.privacyBody}</p>
          </article>
          <article id="terms" className="landing-slide rounded-[24px] border border-[#dbe7f2] bg-white p-5 shadow-[0_10px_24px_rgba(9,31,58,0.05)]">
            <h3 className="text-lg font-black text-[#0b2e57]">{copy.legal.termsTitle}</h3>
            <p className="mt-3 text-sm leading-7 text-[#4d627d]">{copy.legal.termsBody}</p>
          </article>
        </div>
      </LandingSection>

      <footer className="border-t border-[#dbe7f2] bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] py-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 sm:px-8 lg:grid-cols-[1.1fr_0.8fr_0.7fr_0.7fr] lg:px-10">
          <div>
            <Image src="/images/wathiqcare-logo.png" alt="WathiqCare" width={210} height={70} className="h-auto w-[180px]" />
            <h3 className="mt-4 text-xl font-black text-[#0b2e57]">{isArabic ? "واثق كير" : "WathiqCare"}</h3>
            <p className="mt-2 text-sm font-semibold text-[#4d627d]">{copy.footer.tagline}</p>
            <p className="mt-4 text-sm leading-7 text-[#61758d]">
              {isArabic
                ? "مدخل تشغيلي رسمي لوحدات الموافقات المستنيرة والسندات لأمر الإلكترونية داخل بيئة صحية قانونية قابلة للإثبات."
                : "An official operational entry point for informed consent and electronic promissory note workflows inside a legally defensible healthcare environment."}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0d5b80]">{copy.footer.modulesTitle}</h4>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-[#183d68]">
              <li>
                <Link href={informedConsentsHref} className="transition hover:text-[#0d5b80]">{copy.footer.moduleLinks[0]}</Link>
              </li>
              <li>
                <Link href={promissoryNotesHref} className="transition hover:text-[#0d5b80]">{copy.footer.moduleLinks[1]}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0d5b80]">{copy.footer.linksTitle}</h4>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-[#183d68]">
              <li><Link href="/login" className="transition hover:text-[#0d5b80]">{copy.footer.linkLabels.login}</Link></li>
              <li><a href="#privacy" className="transition hover:text-[#0d5b80]">{copy.footer.linkLabels.privacy}</a></li>
              <li><a href="#terms" className="transition hover:text-[#0d5b80]">{copy.footer.linkLabels.terms}</a></li>
              <li><a href="#contact" className="transition hover:text-[#0d5b80]">{copy.footer.linkLabels.contact}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#0d5b80]">{copy.footer.sponsorsTitle}</h4>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-[#183d68]">
              <li>Dar Al-Mithaq Law Firm</li>
              <li>International Medical Center</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-7xl border-t border-[#dbe7f2] px-6 pt-6 text-sm text-[#6a7f95] sm:px-8 lg:px-10">
          {copy.footer.rights}
        </div>
      </footer>

      <style jsx>{`
        .hero-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 12% 14%, rgba(115, 194, 237, 0.18), transparent 32%),
            radial-gradient(circle at 85% 12%, rgba(215, 169, 61, 0.18), transparent 24%),
            radial-gradient(circle at 70% 92%, rgba(92, 218, 200, 0.14), transparent 28%);
          pointer-events: none;
        }

        .landing-fade {
          animation: fadeRise 0.72s ease both;
        }

        .landing-slide {
          animation: slideLift 0.82s ease both;
        }

        .hero-glow {
          animation: glowPulse 4s ease-in-out infinite;
        }

        .illustration-node {
          animation: floatCard 5.8s ease-in-out infinite;
        }

        .line-flow {
          position: relative;
          overflow: hidden;
        }

        .line-flow::after {
          content: "";
          position: absolute;
          inset: auto -24% 0 auto;
          width: 40%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          animation: traceFlow 6s linear infinite;
        }

        .module-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 28px 60px rgba(9, 31, 58, 0.1);
        }

        @keyframes fadeRise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideLift {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glowPulse {
          0%,
          100% {
            box-shadow: 0 14px 30px rgba(215, 169, 61, 0.22);
          }
          50% {
            box-shadow: 0 18px 36px rgba(215, 169, 61, 0.34);
          }
        }

        @keyframes floatCard {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes traceFlow {
          0% {
            transform: translateX(0%);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translateX(-320%);
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-fade,
          .landing-slide,
          .hero-glow,
          .illustration-node,
          .line-flow::after,
          .module-card:hover {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
