"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckSquare,
  ClipboardList,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCircle,
  Wind,
} from "lucide-react";

import {
  DoctorHome,
  CreateConsent,
  ConsentRecords,
  ApprovedForms,
  AnesthesiaQueue,
  PatientEducation,
  ComplianceReview,
  AuditTrail,
  Settings,
} from "./components/screens";

type Lang = "en" | "ar";

type Screen =
  | "home"
  | "create"
  | "pending"
  | "records"
  | "forms"
  | "anesthesia"
  | "education"
  | "compliance"
  | "audit"
  | "settings";

const labels = {
  en: {
    brand: "WathiqCare",
    sub: "Doctor Workspace",
    search: "Search patients...",
    lang: "Arabic",
    services: "Services",
    home: "Workspace Home",
    create: "Create Consent",
    pending: "Pending Consents",
    records: "Consent Records",
    forms: "Approved Forms",
    anesthesia: "Anesthesia Queue",
    education: "Patient Education",
    compliance: "Compliance Review",
    audit: "Audit Trail",
    settings: "Settings & Support",
  },
  ar: {
    brand: "واثق كير",
    sub: "مساحة الطبيب",
    search: "البحث عن المرضى...",
    lang: "English",
    services: "الخدمات",
    home: "الرئيسية",
    create: "إنشاء موافقة",
    pending: "الموافقات المعلقة",
    records: "سجلات الموافقات",
    forms: "النماذج المعتمدة",
    anesthesia: "قائمة التخدير",
    education: "تثقيف المريض",
    compliance: "مراجعة الامتثال",
    audit: "مسار التدقيق",
    settings: "الإعدادات والدعم",
  },
};

export default function DoctorWorkspaceOnlyApp() {
  const [lang, setLang] = useState<Lang>("en");
  const [active, setActive] = useState<Screen>("home");

  const isRTL = lang === "ar";
  const t = labels[lang];

  const nav = useMemo(
    () => [
      { key: "home" as const, label: t.home, icon: LayoutDashboard },
      { key: "create" as const, label: t.create, icon: FileCheck },
      { key: "pending" as const, label: t.pending, icon: ClipboardList },
      { key: "records" as const, label: t.records, icon: ClipboardList },
      { key: "forms" as const, label: t.forms, icon: CheckSquare },
      { key: "anesthesia" as const, label: t.anesthesia, icon: Wind },
      { key: "education" as const, label: t.education, icon: BookOpen },
      { key: "compliance" as const, label: t.compliance, icon: ShieldCheck },
      { key: "audit" as const, label: t.audit, icon: Stethoscope },
      { key: "settings" as const, label: t.settings, icon: Menu },
    ],
    [t]
  );

  function renderScreen() {
    if (active === "home") return <DoctorHome lang={lang} onNavigate={(s) => setActive(s as Screen)} />;
    if (active === "create") return <CreateConsent lang={lang} />;
    if (active === "pending") return <ConsentRecords lang={lang} initialFilter="pending" />;
    if (active === "records") return <ConsentRecords lang={lang} />;
    if (active === "forms") return <ApprovedForms lang={lang} />;
    if (active === "anesthesia") return <AnesthesiaQueue lang={lang} />;
    if (active === "education") return <PatientEducation lang={lang} />;
    if (active === "compliance") return <ComplianceReview lang={lang} />;
    if (active === "audit") return <AuditTrail lang={lang} />;
    return <Settings lang={lang} />;
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      lang={lang}
      className="min-h-screen flex bg-[#F7FBFC]"
      data-testid="doctor-workspace-only"
      data-patient-public-link-hidden="true"
    >
      <aside className="w-[260px] bg-white border-r border-[#D8E8EF] flex-shrink-0">
        <div className="h-[84px] px-5 flex items-center gap-3 border-b border-[#D8E8EF]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#123B5C] to-[#12B7B5] flex items-center justify-center text-white">
            <UserCircle size={25} />
          </div>
          <div>
            <div className="font-bold text-[#102A43] text-lg">{t.brand}</div>
            <div className="text-sm text-[#64798B]">{t.sub}</div>
          </div>
        </div>

        <div className="px-4 py-5">
          <div className="text-xs font-bold uppercase tracking-wider text-[#64798B] mb-3">{t.services}</div>

          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActive(item.key)}
                  className={[
                    "w-full min-h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all",
                    selected ? "bg-[#EAFFFB] text-[#123B5C]" : "text-[#64798B] hover:bg-[#F7FBFC]",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-[68px] bg-white border-b border-[#D8E8EF] px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-[#D8E8EF] bg-[#F7FBFC] min-w-[260px]">
            <Search size={17} className="text-[#64798B]" />
            <span className="text-sm text-[#64798B]">{t.search}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="px-4 py-2 rounded-2xl border border-[#D8E8EF] bg-[#EAF6FF] text-[#2F90C7] text-sm font-bold"
              data-testid="doctor-language-toggle"
            >
              {t.lang}
            </button>

            <div className="w-11 h-11 rounded-2xl bg-[#123B5C] text-white flex items-center justify-center font-bold">
              AK
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden">
          {renderScreen()}
        </main>
      </section>
    </div>
  );
}
