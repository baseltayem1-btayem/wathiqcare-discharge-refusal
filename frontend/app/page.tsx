"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Stethoscope,
  Building2,
  Scale,
  FileText,
  Users,
  Lock,
  Activity,
  Database,
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
  const { t, isRtl } = useI18n();

  const coreModules = [
    {
      icon: FileSignature,
      titleKey: "homePage.module.consent.title",
      descriptionKey: "homePage.module.consent.description",
      badgeKey: "homePage.module.consent.badge",
      color: "from-blue-500/10 to-blue-500/5 border-blue-200",
      iconColor: "text-blue-700 bg-blue-100"
    },
    {
      icon: AlertTriangle,
      titleKey: "homePage.module.refusal.title",
      descriptionKey: "homePage.module.refusal.description",
      badgeKey: "homePage.module.refusal.badge",
      color: "from-orange-500/10 to-orange-500/5 border-orange-200",
      iconColor: "text-orange-700 bg-orange-100"
    },
    {
      icon: Scale,
      titleKey: "homePage.module.legal.title",
      descriptionKey: "homePage.module.legal.description",
      badgeKey: "homePage.module.legal.badge",
      color: "from-red-500/10 to-red-500/5 border-red-200",
      iconColor: "text-red-700 bg-red-100"
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
      iconColor: "text-emerald-700 bg-emerald-100"
    },
    {
      icon: Database,
      titleKey: "homePage.module.emr.title",
      descriptionKey: "homePage.module.emr.description",
      badgeKey: "homePage.module.emr.badge",
      color: "from-emerald-500/10 to-slate-200 border-emerald-200",
      iconColor: "text-emerald-700 bg-emerald-100"
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

      <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40">
          {/* Ambient effects */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div>
              <div className={`mb-10 flex ${isRtl ? "justify-end" : "justify-start"}`}>
                <img
                  src="https://www.wathiqcare.online/_next/image?url=https%3A%2F%2Fcdn.phototourl.com%2Fuploads%2F2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png&w=1080&q=75"
                  alt="WathiqCare"
                  width={204}
                  height={56}
                  className="h-auto w-[132px] sm:w-[160px] lg:w-[176px]"
                  loading="eager"
                />
              </div>

              <div className="mx-auto max-w-4xl text-center">
                {/* Hero Title */}
                <h1 className="mx-auto max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.18]">
                  Unified Digital Command Center for Medical Discharge and Legal Acknowledgment
                </h1>

                {/* Subtitle */}
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                  An enterprise-grade platform that connects clinical, legal, and patient affairs teams in a governed digital framework to document discharge decisions, manage refusal cases, and execute legal escalation with full compliance assurance.
                </p>

                {/* Platform Badge */}
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-200 bg-white px-4 py-2.5 shadow-sm">
                  <Building2 className="h-4 w-4 text-emerald-700" />
                  <span className="text-sm font-semibold text-emerald-900">{t("homePage.platformType")}</span>
                </div>

                {/* CTA Buttons */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700"
                  >
                    <Lock className="h-5 w-5" />
                    {t("homePage.enterSystem")}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/request-demo"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
                  >
                    {t("homePage.requestDemo")}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>

                {/* Quick Overview Cards */}
                <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {trustFactors.map((factor) => {
                    const Icon = factor.icon;
                    return (
                      <div
                        key={factor.labelKey}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-xs font-medium text-slate-600">{t(factor.labelKey)}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{t(factor.valueKey)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Overview */}
        <section className="border-b border-slate-200 bg-white py-16 lg:py-20">
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
        <section className="bg-gradient-to-b from-slate-100/70 to-white py-16 lg:py-20">
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
                    className={`group relative overflow-hidden rounded-2xl border ${module.color} bg-gradient-to-br p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}
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

        {/* Key Roles / Highlights */}
        <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
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
                    className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7 text-center shadow-sm transition hover:shadow-md"
                  >
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm">
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

        {/* Recent Highlights */}
        <section className="border-b border-slate-200 bg-slate-50 py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-slate-900 lg:text-4xl">
                {t("homePage.whatTitle")}
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">Institutional Grade</h3>
                <p className="text-slate-600">Built for healthcare systems with enterprise-grade reliability and governance.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">Operational Alerts</h3>
                <p className="text-slate-600">Track pending approvals and case escalations with clear visual status indicators.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">Legal Readiness</h3>
                <p className="text-slate-600">Evidence-ready records and complete timelines help reduce medico-legal risk.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-emerald-700 to-emerald-600 py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white lg:text-5xl">
              {t("homePage.ctaTitle")}
            </h2>
            <p className="mt-6 text-lg text-emerald-50">
              {t("homePage.ctaSubtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-emerald-800 shadow-lg transition hover:bg-emerald-50"
              >
                {t("homePage.enterSystem")}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/request-demo"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-8 py-4 font-semibold text-white transition hover:bg-emerald-500"
              >
                {t("homePage.requestDemo")}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">
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
