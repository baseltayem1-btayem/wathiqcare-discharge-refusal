"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  Lock,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCircle,
  Wind,
} from "lucide-react";

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

const tx = {
  en: {
    brand: "WathiqCare",
    sub: "Doctor Workspace",
    search: "Search patients...",
    services: "Services",
    lang: "العربية",
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
    title: "Doctor Workspace",
    subtitle: "Create, review, and send informed consents. The patient signs only through a secure public link sent by SMS.",
    hero: "Doctor creates the consent inside WathiqCare. Patient reviews and signs outside the doctor account.",
    start: "Start Consent Journey",
    sendLink: "Send Secure Public Link",
    note: "Patient public-link screens are not displayed inside the doctor account.",
    patient: "Patient Context",
    template: "Approved Template",
    procedure: "Procedure Details",
    anesthesiaStep: "Anesthesia Decision",
    educationStep: "Patient Education",
    review: "Smart Review",
    send: "Send Public Link",
    status: "Status",
    action: "Action",
    open: "Open",
    complete: "Complete",
    ready: "Ready",
    draft: "Draft",
    signed: "Signed",
    viewed: "Viewed",
    otp: "OTP Verified",
    expired: "Expired",
    publicLink: "Public SMS Link",
    clinical: "Clinical Workflow",
    legal: "Legal Evidence",
    support: "Support",
  },
  ar: {
    brand: "واثق كير",
    sub: "مساحة الطبيب",
    search: "البحث عن المرضى...",
    services: "الخدمات",
    lang: "English",
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
    title: "مساحة الطبيب",
    subtitle: "إنشاء ومراجعة وإرسال الموافقات الطبية. توقيع المريض يتم فقط عبر رابط عام آمن يرسل برسالة جوال.",
    hero: "الطبيب ينشئ الموافقة داخل واثق كير. المريض يراجع ويوقع خارج حساب الطبيب.",
    start: "بدء رحلة الموافقة",
    sendLink: "إرسال الرابط العام الآمن",
    note: "شاشات الرابط العام للمريض لا تظهر داخل حساب الطبيب.",
    patient: "بيانات المريض",
    template: "النموذج المعتمد",
    procedure: "تفاصيل الإجراء",
    anesthesiaStep: "قرار التخدير",
    educationStep: "تثقيف المريض",
    review: "المراجعة الذكية",
    send: "إرسال الرابط العام",
    status: "الحالة",
    action: "الإجراء",
    open: "فتح",
    complete: "مكتمل",
    ready: "جاهز",
    draft: "مسودة",
    signed: "موقع",
    viewed: "تمت المشاهدة",
    otp: "تم التحقق",
    expired: "منتهي",
    publicLink: "رابط SMS عام",
    clinical: "المسار السريري",
    legal: "الأدلة القانونية",
    support: "الدعم",
  },
};

export default function DoctorWorkspaceSafe() {
  const [lang, setLang] = useState<Lang>("en");
  const [active, setActive] = useState<Screen>("home");

  const isRTL = lang === "ar";
  const t = tx[lang];

  const nav = useMemo(
    () => [
      { key: "home" as const, label: t.home, icon: LayoutDashboard },
      { key: "create" as const, label: t.create, icon: FileCheck2 },
      { key: "pending" as const, label: t.pending, icon: Activity },
      { key: "records" as const, label: t.records, icon: ClipboardCheck },
      { key: "forms" as const, label: t.forms, icon: FileText },
      { key: "anesthesia" as const, label: t.anesthesia, icon: Wind },
      { key: "education" as const, label: t.education, icon: BookOpen },
      { key: "compliance" as const, label: t.compliance, icon: ShieldCheck },
      { key: "audit" as const, label: t.audit, icon: Lock },
      { key: "settings" as const, label: t.settings, icon: HelpCircle },
    ],
    [t]
  );

  const workflow = [
    t.patient,
    t.template,
    t.procedure,
    t.anesthesiaStep,
    t.educationStep,
    t.review,
    t.send,
  ];

  const records = [
    { id: "WC-2026-0412", patient: isRTL ? "ليلى حسن" : "Layla Hassan", procedure: isRTL ? "استئصال الزائدة" : "Appendectomy", status: t.signed },
    { id: "WC-2026-0411", patient: isRTL ? "عمر الراشد" : "Omar Al-Rashid", procedure: isRTL ? "قسطرة قلبية" : "Cardiac Catheterization", status: t.viewed },
    { id: "WC-2026-0410", patient: isRTL ? "خالد ناصر" : "Khalid Nasser", procedure: isRTL ? "تبديل مفصل الركبة" : "Knee Replacement", status: t.otp },
    { id: "WC-2026-0409", patient: isRTL ? "ريم الزهراني" : "Reem Al-Zahrani", procedure: isRTL ? "تنظير القولون" : "Colonoscopy", status: t.expired },
  ];

  function ScreenContent() {
    if (active === "create") {
      return (
        <section className="wc-safe-card">
          <div className="wc-safe-section-head">
            <div>
              <h2>{t.create}</h2>
              <p>{t.subtitle}</p>
            </div>
            <button className="wc-safe-primary">
              <Send size={18} />
              {t.sendLink}
            </button>
          </div>

          <div className="wc-safe-workflow">
            {workflow.map((item, index) => (
              <article key={item}>
                <span>{index + 1}</span>
                <strong>{item}</strong>
                <small>{index < 5 ? t.complete : t.ready}</small>
              </article>
            ))}
          </div>

          <div className="wc-safe-alert">
            <Lock size={20} />
            <span>{t.note}</span>
          </div>
        </section>
      );
    }

    if (active === "records" || active === "pending") {
      return (
        <section className="wc-safe-card">
          <div className="wc-safe-section-head">
            <div>
              <h2>{active === "pending" ? t.pending : t.records}</h2>
              <p>{t.publicLink}</p>
            </div>
          </div>

          <div className="wc-safe-table">
            {records.map((record) => (
              <article key={record.id}>
                <div>
                  <strong>{record.patient}</strong>
                  <span>{record.procedure}</span>
                </div>
                <small>{record.id}</small>
                <b>{record.status}</b>
                <button>{t.open}</button>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (active === "forms" || active === "education" || active === "anesthesia" || active === "compliance" || active === "audit" || active === "settings") {
      return (
        <section className="wc-safe-card">
          <div className="wc-safe-section-head">
            <div>
              <h2>{nav.find((item) => item.key === active)?.label}</h2>
              <p>{active === "audit" ? t.legal : active === "settings" ? t.support : t.clinical}</p>
            </div>
          </div>

          <div className="wc-safe-grid">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <article key={item}>
                <CheckCircle2 size={24} />
                <strong>{nav.find((n) => n.key === active)?.label} {item}</strong>
                <span>{t.ready}</span>
              </article>
            ))}
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="wc-safe-hero">
          <div>
            <span>{t.brand}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
            <button className="wc-safe-primary" onClick={() => setActive("create")}>
              <FileCheck2 size={18} />
              {t.start}
            </button>
          </div>

          <aside>
            <ShieldCheck size={42} />
            <strong>{t.hero}</strong>
            <small>{t.note}</small>
          </aside>
        </section>

        <section className="wc-safe-grid">
          {nav.slice(1, 9).map((item) => {
            const Icon = item.icon;

            return (
              <button key={item.key} type="button" onClick={() => setActive(item.key)}>
                <Icon size={26} />
                <strong>{item.label}</strong>
                <span>{t.open}</span>
              </button>
            );
          })}
        </section>
      </>
    );
  }

  return (
    <div className="wc-safe-shell" dir={isRTL ? "rtl" : "ltr"} lang={lang} data-testid="doctor-workspace-safe">
      <aside className="wc-safe-sidebar">
        <div className="wc-safe-brand">
          <div><UserCircle size={25} /></div>
          <section>
            <strong>{t.brand}</strong>
            <span>{t.sub}</span>
          </section>
        </div>

        <p>{t.services}</p>

        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = active === item.key;

            return (
              <button key={item.key} type="button" className={selected ? "active" : ""} onClick={() => setActive(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="wc-safe-main">
        <header className="wc-safe-header">
          <div className="wc-safe-search">
            <Search size={17} />
            <span>{t.search}</span>
          </div>

          <div className="wc-safe-actions">
            <button type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Globe2 size={16} />
              {t.lang}
            </button>
            <Bell size={20} />
            <div>AK</div>
          </div>
        </header>

        <div className="wc-safe-content">
          <ScreenContent />
        </div>
      </main>
    </div>
  );
}
