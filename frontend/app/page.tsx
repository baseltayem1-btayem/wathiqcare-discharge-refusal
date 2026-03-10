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
  ClipboardCheck,
  Shield,
  TrendingUp,
  Zap
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import Navbar from "@/components/figma/Navbar";

export default function HomePage() {
  const { isRtl, t } = useI18n();

  const coreModules = [
    {
      icon: FileSignature,
      titleKey: "homePage.module.consent.title",
      descriptionKey: "homePage.module.consent.description",
      badgeKey: "homePage.module.consent.badge",
      color: "from-blue-500/10 to-blue-500/5 border-blue-200",
      iconColor: "text-blue-600 bg-blue-50"
    },
    {
      icon: AlertTriangle,
      titleKey: "homePage.module.refusal.title",
      descriptionKey: "homePage.module.refusal.description",
      badgeKey: "homePage.module.refusal.badge",
      color: "from-purple-500/10 to-purple-500/5 border-purple-200",
      iconColor: "text-purple-600 bg-purple-50"
    },
    {
      icon: Scale,
      titleKey: "homePage.module.legal.title",
      descriptionKey: "homePage.module.legal.description",
      badgeKey: "homePage.module.legal.badge",
      color: "from-rose-500/10 to-rose-500/5 border-rose-200",
      iconColor: "text-rose-600 bg-rose-50"
    },
    {
      icon: ClipboardCheck,
      titleKey: "homePage.module.icd11.title",
      descriptionKey: "homePage.module.icd11.description",
      badgeKey: "homePage.module.icd11.badge",
      color: "from-cyan-500/10 to-cyan-500/5 border-cyan-200",
      iconColor: "text-cyan-600 bg-cyan-50"
    },
    {
      icon: Activity,
      titleKey: "homePage.module.audit.title",
      descriptionKey: "homePage.module.audit.description",
      badgeKey: "homePage.module.audit.badge",
      color: "from-emerald-500/10 to-emerald-500/5 border-emerald-200",
      iconColor: "text-emerald-600 bg-emerald-50"
    },
    {
      icon: Database,
      titleKey: "homePage.module.emr.title",
      descriptionKey: "homePage.module.emr.description",
      badgeKey: "homePage.module.emr.badge",
      color: "from-teal-500/10 to-teal-500/5 border-teal-200",
      iconColor: "text-teal-600 bg-teal-50"
    },
  ];

  const institutionalRoles = [
    { icon: Stethoscope, labelKey: "homePage.role.clinical", countKey: "homePage.role.clinicalCount" },
    { icon: Scale, labelKey: "homePage.role.legal", countKey: "homePage.role.legalCount" },
    { icon: Users, labelKey: "homePage.role.patient", countKey: "homePage.role.patientCount" },
    { icon: ShieldCheck, labelKey: "homePage.role.compliance", countKey: "homePage.role.complianceCount" },
  ];

  const trustFactors = [
    { icon: Lock, labelKey: "homePage.trustFactors.dataSecurity", valueKey: "homePage.trustFactors.dataSecurityValue" },
    { icon: ShieldCheck, labelKey: "homePage.trustFactors.compliance", valueKey: "homePage.trustFactors.complianceValue" },
    { icon: FileText, labelKey: "homePage.trustFactors.documentation", valueKey: "homePage.trustFactors.documentationValue" },
    { icon: CheckCircle2, labelKey: "homePage.trustFactors.traceability", valueKey: "homePage.trustFactors.traceabilityValue" },
  ];

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Grid overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          {/* Ambient effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="text-center">
              {/* Platform Badge */}
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2.5 backdrop-blur">
                <Building2 className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200">{t("homePage.platformType")}</span>
              </div>

              {/* Hero Title */}
              <h1 className="mx-auto max-w-4xl text-45 font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("homePage.heroTitle")}
              </h1>

              {/* Subtitle */}
              <p className="mx-auto mt-8 max-w-3xl text-xl leading-relaxed text-slate-300">
                {t("homePage.heroSubtitle")}
              </p>

              {/* CTA Buttons */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-slate-900 shadow-2xl transition hover:bg-slate-50 hover:shadow-lg"
                >
                  <Lock className="h-5 w-5" />
                  {t("homePage.enterSystem")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/request-demo"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-800/50 px-8 py-4 font-semibold text-white backdrop-blur transition hover:bg-slate-700/50 hover:border-slate-500"
                >
                  {t("homePage.requestDemo")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Trust Factors Row */}
              <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {trustFactors.map((factor) => {
                  const Icon = factor.icon;
                  return (
                    <div
                      key={factor.labelKey}
                      className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur transition hover:border-slate-600 hover:bg-slate-800/70"
                    >
                      <Icon className="mx-auto h-6 w-6 text-cyan-400" />
                      <p className="mt-3 text-xs font-medium text-slate-400">{t(factor.labelKey)}</p>
                      <p className="mt-1 text-sm font-bold text-white">{t(factor.valueKey)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="border-b border-slate-200 bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
                <FileText className="h-4 w-4 text-blue-700" />
                <span className="text-sm font-semibold text-blue-900">{t("homePage.badge")}</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                {t("homePage.whatTitle")}
              </h2>
              <p className="mt-6 text-xl leading-relaxed text-slate-600">
                {t("homePage.whatBody")}
              </p>
            </div>
          </div>
        </section>

        {/* Core Modules Grid */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">
                {t("homePage.coreModulesTitle")}
              </h2>
              <p className="mt-4 text-xl text-slate-600">
                {t("homePage.coreModulesSubtitle")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {coreModules.map((module) => {
                const Icon = module.icon;
                return (
                  <article
                    key={module.titleKey}
                    className={`group relative overflow-hidden rounded-2xl border ${module.color} bg-gradient-to-br p-7 shadow-md transition-all hover:shadow-xl`}
                  >
                    {/* Module Badge */}
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                        {t(module.badgeKey)}
                      </span>
                    </div>

                    {/* Icon */}
                    <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${module.iconColor}`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-slate-900">{t(module.titleKey)}</h3>
                    <p className="mt-2 text-base leading-relaxed text-slate-600">
                      {t(module.descriptionKey)}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Institutional Roles */}
        <section className="border-y border-slate-200 bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">
                {t("homePage.institutionalRolesTitle")}
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {institutionalRoles.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.labelKey}
                    className="text-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7 shadow-sm transition hover:shadow-md hover:border-slate-300"
                  >
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-100">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{t(role.labelKey)}</h3>
                    <p className="mt-2 text-sm text-slate-600">{t(role.countKey)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Highlight */}
        <section className="bg-slate-50 py-20 lg:py-28 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">
                {t("homePage.whatTitle")}
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <Zap className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Institutional Grade</h3>
                <p className="text-slate-600">Built for healthcare systems, not startups. Enterprise-ready architecture with compliance at its core.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <Shield className="h-8 w-8 text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Legally Defensible</h3>
                <p className="text-slate-600">Immutable audit trails, cryptographic integrity, and compliance frameworks recognized by legal experts.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <TrendingUp className="h-8 w-8 text-blue-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Compliance Driven</h3>
                <p className="text-slate-600">CBAHI, JCI, and PDPL compliance indicators dashboards designed for institutional oversight.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 lg:py-28">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white lg:text-5xl">
              {t("homePage.ctaTitle")}
            </h2>
            <p className="mt-6 text-lg text-slate-300">
              {t("homePage.ctaSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-slate-900 shadow-2xl transition hover:bg-slate-50"
              >
                {t("homePage.enterSystem")}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/request-demo"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-600 px-8 py-4 font-semibold text-white transition hover:bg-slate-800/50"
              >
                {t("homePage.requestDemo")}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  WC
                </div>
                <span className="font-semibold text-slate-900">{t("app.name")}</span>
              </div>
              <p>
                © {new Date().getFullYear()} {t("app.name")}.{" "}
                {t("homePage.footer.allRightsReserved")}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
