"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Grid2X2,
  Library,
  LogOut,
  Search,
  Settings,
  Shield,
  Stethoscope,
  User,
} from "lucide-react";
import ConsentSearchEngine from "./ConsentSearchEngine";

type ApprovedFigmaConsentWorkspaceProps = {
  auth?: unknown;
  lang?: "en" | "ar" | string;
};

type StatCard = {
  label: string;
  labelAr: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  tone: string;
  border: string;
};

type ReadinessItem = {
  label: string;
  labelAr: string;
  done: boolean;
};

export default function ApprovedFigmaConsentWorkspace({
  auth,
  lang = "en",
}: ApprovedFigmaConsentWorkspaceProps) {
  void auth;

  const [langState, setLangState] = React.useState<"en" | "ar">(
    lang === "ar" ? "ar" : "en",
  );

  const isArabic = langState === "ar";

  React.useEffect(() => {
    document.documentElement.lang = langState;
    document.documentElement.dir = isArabic ? "rtl" : "ltr";
  }, [langState, isArabic]);

  const toggleLanguage = React.useCallback(() => {
    setLangState((current) => (current === "ar" ? "en" : "ar"));
  }, []);

  const stats: StatCard[] = React.useMemo(
    () => [
      {
        label: "Pending Consents",
        labelAr: "الموافقات المعلقة",
        value: "7",
        icon: AlertCircle,
        bg: "bg-amber-50",
        tone: "text-amber-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Draft Consents",
        labelAr: "مسودات الموافقات",
        value: "3",
        icon: FileText,
        bg: "bg-slate-50",
        tone: "text-slate-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Sent / Awaiting",
        labelAr: "مرسلة / بانتظار التوقيع",
        value: "12",
        icon: Bell,
        bg: "bg-blue-50",
        tone: "text-blue-600",
        border: "border-[#D8DCE3]",
      },
      {
        label: "Completed Today",
        labelAr: "مكتملة اليوم",
        value: "5",
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        tone: "text-emerald-600",
        border: "border-[#D8DCE3]",
      },
    ],
    [],
  );

  const readinessItems: ReadinessItem[] = React.useMemo(
    () => [
      { label: "Patient selected", labelAr: "تم اختيار المريض", done: true },
      { label: "Encounter selected", labelAr: "تم اختيار الزيارة", done: true },
      { label: "Template selected", labelAr: "تم اختيار النموذج", done: true },
      {
        label: "IMC approved template",
        labelAr: "نموذج معتمد من IMC",
        done: true,
      },
      {
        label: "Procedure details completed",
        labelAr: "تم استكمال تفاصيل الإجراء",
        done: true,
      },
      {
        label: "Anesthesia decision",
        labelAr: "قرار التخدير",
        done: true,
      },
      {
        label: "Education package",
        labelAr: "الحزمة التثقيفية",
        done: true,
      },
      {
        label: "Draft PDF generated",
        labelAr: "تم إنشاء مسودة PDF",
        done: false,
      },
      {
        label: "Patient link sent",
        labelAr: "تم إرسال رابط المريض",
        done: false,
      },
    ],
    [],
  );

  const navItems = React.useMemo(
    () => [
      {
        label: "Dashboard",
        labelAr: "لوحة التحكم",
        href: "/modules/informed-consents",
        icon: Grid2X2,
        active: true,
        badge: "3",
      },
      {
        label: "Physician Workflow",
        labelAr: "رحلة الطبيب",
        href: "/modules/informed-consents/physician-workflow",
        icon: Stethoscope,
        active: false,
      },
      {
        label: "Patient Search",
        labelAr: "بحث المرضى",
        href: "/modules/informed-consents/consent-creation-workflow",
        icon: Search,
        active: false,
      },
      {
        label: "Consent Library",
        labelAr: "مكتبة الموافقات",
        href: "/modules/informed-consents/templates",
        icon: Library,
        active: false,
      },
      {
        label: "Status Tracking",
        labelAr: "تتبع الحالة",
        href: "/modules/informed-consents/list",
        icon: Activity,
        active: false,
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#101828]">
      <div className="flex min-h-screen">
        <aside className="w-[280px] shrink-0 bg-[#003B73] text-white shadow-xl">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A13B]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">WathiqCare</div>
              <div className="text-xs font-medium text-[#C9A13B]">
                Clinical Consent Platform
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold">Dr. Khalid Al-Qahtani</div>
                <div className="text-xs text-blue-100">
                  General Surgery · FACS
                </div>
              </div>
            </div>
          </div>

          <nav className="px-3 py-5">
            <div className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-200">
              Clinical Workspace
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      item.active
                        ? "bg-[#1976D2] text-white"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {isArabic ? item.labelAr : item.label}
                    </span>

                    {item.badge ? (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 mb-3 px-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-200">
              System
            </div>

            <div className="space-y-1">
              <Link
                href="/modules/informed-consents/settings-support"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                <Settings className="h-4 w-4" />
                {isArabic ? "الإعدادات والدعم" : "Settings & Support"}
              </Link>

              <Link
                href="/login"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {isArabic ? "تسجيل الخروج" : "Sign Out"}
              </Link>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#D8DCE3] bg-white/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-7">
              <div className="text-sm text-[#667085]">
                Department:{" "}
                <span className="font-semibold text-[#002B5C]">
                  General Surgery
                </span>
                <span className="mx-3">·</span>
                28 May 2026
                <span className="mx-3">·</span>
                Session: 2h 14m
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-white px-3 py-2 text-sm font-bold text-[#002B5C] shadow-sm hover:bg-[#F8FAFC]"
                >
                  <span aria-hidden="true" className="text-sm leading-none">
                    🌐
                  </span>
                  {langState === "en" ? "EN" : "ع"}
                </button>

                <button
                  type="button"
                  className="relative rounded-lg border border-[#D8DCE3] bg-white p-2 text-[#002B5C] shadow-sm hover:bg-[#F8FAFC]"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </button>

                <div className="text-sm text-[#002B5C]">
                  Physician Portal /{" "}
                  <span className="font-semibold">Dashboard</span>
                </div>
              </div>
            </div>
          </header>

          <main className="px-7 py-6">
            <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#101828]">
                  {isArabic ? "لوحة موافقات الطبيب" : "Physician Consent Dashboard"}
                </h1>
                <p className="mt-1 text-sm text-[#667085]">
                  Thursday, 28 May 2026 · Surgical Day List Active
                </p>
              </div>

              <Link
                href="/modules/informed-consents/consent-creation-workflow"
                className="inline-flex items-center gap-2 rounded-lg bg-[#C9A13B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#b58d2e]"
              >
                <ChevronRight className="h-4 w-4" />
                {isArabic ? "موافقة جديدة" : "New Consent"}
              </Link>
            </section>

            <section className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {isArabic
                      ? "توجد 3 موافقات بها إفصاحات إلزامية غير مكتملة — لا يمكن متابعة الإجراء حتى يتم حلها."
                      : "3 consents have incomplete mandatory disclosures — surgery cannot proceed until resolved."}
                  </span>
                </div>

                <Link
                  href="/modules/informed-consents/list"
                  className="text-sm font-semibold underline"
                >
                  {isArabic ? "عرض الكل" : "View All"}
                </Link>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {stats.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className={`rounded-lg border ${card.border} bg-white p-5 shadow-sm`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className={`rounded-md ${card.bg} p-2`}>
                        <Icon className={`h-4 w-4 ${card.tone}`} />
                      </div>
                      <span className={card.tone}>ⓘ</span>
                    </div>

                    <div className="text-2xl font-semibold text-[#101828]">
                      {card.value}
                    </div>

                    <div className="mt-1 text-sm text-[#667085]">
                      {isArabic ? card.labelAr : card.label}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-hidden rounded-lg border border-[#D8DCE3] bg-white shadow-sm">
                <div className="border-b border-[#D8DCE3] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-[#002B5C]" />
                    <h2 className="text-lg font-semibold text-[#101828]">
                      {isArabic
                        ? "مكتبة الموافقات المعتمدة"
                        : "IMC Approved Consent Library"}
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-[#667085]">
                    {isArabic
                      ? "تم ربط مكتبة الموافقات المعتمدة بمحرك البحث ومسار استعراض PDF."
                      : "The approved consent library is connected to search and PDF preview workflow."}
                  </p>
                </div>

                <div className="p-5">
                  <ConsentSearchEngine />
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-lg border border-[#D8DCE3] bg-white p-5 shadow-sm">
                  <div className="mb-4 rounded-xl border border-[#D8DCE3] bg-gradient-to-b from-white to-[#F8FAFC] p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#667085]">
                      Overall Completion
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-4xl font-bold text-[#002B5C]">
                        88%
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        Blocked
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {readinessItems.map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                            item.done ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {item.done ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Shield className="h-5 w-5" />
                          )}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-[#002B5C]">
                            {isArabic ? item.labelAr : item.label}
                          </div>
                          <div className="text-xs text-[#98A2B3]">
                            {item.done ? "Completed" : "Pending"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-[#D8DCE3] bg-white shadow-sm">
                  <div className="border-b border-[#D8DCE3] px-5 py-4">
                    <h3 className="font-semibold text-[#101828]">
                      Risk Flags / المخاطر
                    </h3>
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      IMC approved PDF matched, but runtime template mapping
                      requires verification.
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      Draft PDF and patient link remain gated until readiness is
                      complete.
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}


