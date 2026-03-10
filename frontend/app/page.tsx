"use client";

import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  FileCheck2, 
  Gavel, 
  ShieldCheck, 
  Stethoscope, 
  Workflow,
  Building2,
  Scale,
  FileText,
  Users,
  Lock,
  Activity,
  Database,
  GitBranch,
  AlertTriangle,
  FileSignature,
  ClipboardCheck
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import Navbar from "@/components/figma/Navbar";

export default function HomePage() {
  const { lang, isRtl } = useI18n();

  const content =
    lang === "ar"
      ? {
          badge: "منصة الحوكمة الطبية القانونية",
          heroTitle: "مركز رقمي موحد لحوكمة الخروج الطبي والإقرار القانوني",
          heroSubtitle:
            "منصة مؤسسية متكاملة تربط الفرق السريرية والقانونية وشؤون المرضى في إطار رقمي محكم لتوثيق قرارات الخروج، إدارة حالات الرفض، والتصعيد القانوني مع ضمان الامتثال الكامل.",
          enterSystem: "دخول النظام",
          requestDemo: "طلب عرض توضيحي",
          platformType: "منصة طبية قانونية مؤسسية",
          whatTitle: "WathiqCare: منصة الحوكمة الرقمية للمنشآت الصحية",
          whatBody:
            "نظام تشغيلي متكامل مصمم لإدارة دورة حياة قرارات الخروج الطبي من القرار السريري إلى التوثيق القانوني والتصعيد التنظيمي، مع توفير سجل تدقيق غير قابل للتلاعب يحمي الحقوق وي Supporting institutional compliance.",
          coreModules: [
            {
              icon: FileSignature,
              title: "الموافقة المستنيرة الرقمية",
              description: "جلسات إقرار رقمية مع توقيع إلكتروني موثق وأدلة قانونية قابلة للمراجعة",
              badge: "موثق",
            },
            {
              icon: AlertTriangle,
              title: "سير عمل رفض الخروج",
              description: "مسار منظم لتوثيق قرار الطبيب والتدخلات الإدارية والاجتماعية المطلوبة",
              badge: "منظم",
            },
            {
              icon: Scale,
              title: "التصعيد والحماية القانونية",
              description: "بناء ملف قانوني متكامل مع خطوات تصعيد واضحة وأرشفة أدلة محكمة",
              badge: "محمي",
            },
            {
              icon: ClipboardCheck,
              title: "التحقق من صحة رموز ICD-11",
              description: "مرجع فوري ومدقق للتشخيصات الطبية وفق المعايير العالمية",
              badge: "دقيق",
            },
            {
              icon: Activity,
              title: "الامتثال الشامل والتدقيق",
              description: "لوحات امتثال تشغيلية مع سجل تدقيق زمني كامل لكل حالة",
              badge: "مستمر",
            },
            {
              icon: Database,
              title: "التكامل مع أنظمة المستشفى",
              description: "موصلات جاهزة للربط مع أنظمة السجلات الطبية الإلكترونية",
              badge: "متصل",
            },
          ],
          institutional: {
            title: "منصة موحدة لكافة الأدوار المؤسسية",
            roles: [
              { icon: Stethoscope, label: "الفريق الطبي", count: "أطباء ومقدمي رعاية" },
              { icon: Scale, label: "الشؤون القانونية", count: "مستشارون ومحامون" },
              { icon: Users, label: "علاقات المرضى", count: "خدمة اجتماعية" },
              { icon: ShieldCheck, label: "الامتثال والجودة", count: "تدقيق داخلي" },
            ],
          },
          trustFactors: [
            { icon: Lock, label: "أمان البيانات", value: "ISO 27001" },
            { icon: ShieldCheck, label: "الامتثال", value: "CBAHI / JCI" },
            { icon: FileText, label: "التوثيق", value: "قانوني محكم" },
            { icon: CheckCircle2, label: "التتبع", value: "100%" },
          ],
        }
      : {
          badge: "Healthcare Governance Platform",
          heroTitle: "Unified Digital Command Center for Medical Discharge and Legal Acknowledgment",
          heroSubtitle:
            "An enterprise-grade platform that connects clinical, legal, and patient affairs teams in a governed digital framework to document discharge decisions, manage refusal cases, and execute legal escalation with full compliance assurance.",
          enterSystem: "Enter System",
          requestDemo: "Request Demo",
          platformType: "Enterprise Medico-Legal Platform",
          whatTitle: "WathiqCare: Digital Governance for Healthcare Institutions",
          whatBody:
            "An integrated operating system designed to manage the full lifecycle of medical discharge decisions—from clinical judgment to legal documentation and regulatory escalation—providing an immutable audit trail that protects rights and supports institutional compliance.",
          coreModules: [
            {
              icon: FileSignature,
              title: "Digital Informed Consent",
              description: "Digital acknowledgment sessions with documented e-signatures and auditable legal evidence",
              badge: "Verified",
            },
            {
              icon: AlertTriangle,
              title: "Discharge Refusal Workflow",
              description: "Structured pathway to document physician decision and required administrative interventions",
              badge: "Structured",
            },
            {
              icon: Scale,
              title: "Legal Escalation & Protection",
              description: "Build complete legal case files with clear escalation steps and defensible evidence archival",
              badge: "Protected",
            },
            {
              icon: ClipboardCheck,
              title: "ICD-11 Code Validation",
              description: "Instant reference and validator for medical diagnoses per global standards",
              badge: "Precise",
            },
            {
              icon: Activity,
              title: "Comprehensive Compliance & Audit",
              description: "Operational compliance dashboards with complete temporal audit log per case",
              badge: "Continuous",
            },
            {
              icon: Database,
              title: "Hospital System Integration",
              description: "Ready-built connectors for electronic medical record systems",
              badge: "Connected",
            },
          ],
          institutional: {
            title: "Unified Platform for All Institutional Roles",
            roles: [
              { icon: Stethoscope, label: "Clinical Teams", count: "Physicians & Caregivers" },
              { icon: Scale, label: "Legal Affairs", count: "Counsels & Attorneys" },
              { icon: Users, label: "Patient Relations", count: "Social Services" },
              { icon: ShieldCheck, label: "Compliance & Quality", count: "Internal Audit" },
            ],
          },
          trustFactors: [
            { icon: Lock, label: "Data Security", value: "ISO 27001" },
            { icon: ShieldCheck, label: "Compliance", value: "CBAHI / JCI" },
            { icon: FileText, label: "Documentation", value: "Legally Defensible" },
            { icon: CheckCircle2, label: "Traceability", value: "100%" },
          ],
        };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section - Command Center Aesthetic */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Subtle grid overlay for technical aesthetic */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          {/* Ambient light effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="text-center">
              {/* Platform Badge */}
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 backdrop-blur">
                <Building2 className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200">{content.platformType}</span>
              </div>

              {/* Hero Title */}
              <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {content.heroTitle}
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
                {content.heroSubtitle}
              </p>

              {/* CTA Buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:bg-slate-50"
                >
                  <Lock className="h-5 w-5" />
                  {content.enterSystem}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/request-demo"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-800/50 px-8 py-4 font-semibold text-white backdrop-blur transition hover:bg-slate-700/50"
                >
                  {content.requestDemo}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Trust Factors */}
              <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {content.trustFactors.map((factor) => {
                  const Icon = factor.icon;
                  return (
                    <div
                      key={factor.label}
                      className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur"
                    >
                      <Icon className="mx-auto h-6 w-6 text-cyan-400" />
                      <p className="mt-2 text-xs font-medium text-slate-400">{factor.label}</p>
                      <p className="mt-1 text-sm font-bold text-white">{factor.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="border-b border-slate-200 bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                <FileText className="h-4 w-4 text-blue-700" />
                <span className="text-sm font-semibold text-blue-900">{content.badge}</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                {content.whatTitle}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {content.whatBody}
              </p>
            </div>
          </div>
        </section>

        {/* Core Modules Grid */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                {lang === "ar" ? "الوحدات الأساسية" : "Core Modules"}
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                {lang === "ar" 
                  ? "منصة متكاملة تغطي كافة جوانب الحوكمة الطبية القانونية"
                  : "Integrated platform covering all aspects of medico-legal governance"}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {content.coreModules.map((module) => {
                const Icon = module.icon;
                return (
                  <article
                    key={module.title}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-lg"
                  >
                    {/* Module Badge */}
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
                        {module.badge}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700">
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-slate-900">{module.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {module.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Institutional Roles */}
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                {content.institutional.title}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {content.institutional.roles.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.label}
                    className="text-center rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-bold text-slate-900">{role.label}</h3>
                    <p className="mt-1 text-sm text-slate-600">{role.count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white">
              {lang === "ar" 
                ? "ابدأ في بناء إطار الحوكمة المؤسسية" 
                : "Start Building Your Institutional Governance Framework"}
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              {lang === "ar"
                ? "انضم إلى المنشآت الصحية الرائدة في تبني معايير الحوكمة الرقمية"
                : "Join leading healthcare institutions adopting digital governance standards"}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-slate-900 shadow-xl transition hover:bg-slate-50"
              >
                {content.enterSystem}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/request-demo"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-600 px-8 py-4 font-semibold text-white transition hover:bg-slate-800"
              >
                {content.requestDemo}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  WC
                </div>
                <span className="font-semibold text-slate-900">WathiqCare</span>
              </div>
              <p>
                © {new Date().getFullYear()} WathiqCare.{" "}
                {lang === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
