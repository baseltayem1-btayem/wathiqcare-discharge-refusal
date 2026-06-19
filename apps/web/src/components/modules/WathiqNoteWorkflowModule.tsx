"use client";

import { wathiqNoteProductionTemplates } from "@/data/wathiqnote/templates";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  Headphones,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Search,
  Send,
  Settings,
  Shield,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { WathiqNoteIssueLoader } from "./WathiqNoteIssueLoader";

type Lang = "ar" | "en";
const WATHIQNOTE_LOADER_MINIMUM_MS = 1800;

type Screen =
  | "dashboard"
  | "patient-search"
  | "note-builder"
  | "status-tracking"
  | "notes-archive"
  | "support-settings"
  | "users"
  | "delegations"
  | "permission-matrix"
  | "templates"
  | "audit"
  | "finance-monitoring"
  | "claims-monitoring"
  | "legal-escalation";

type BuilderStep =
  | "patient_visit"
  | "billing_coverage"
  | "coverage_liability"
  | "note_details"
  | "debtor_capacity"
  | "acknowledgments"
  | "review"
  | "send_signature";

type Toast = {
  type: "success" | "info" | "warning" | "error";
  message: string;
};

const patient = {
  id: "patient-demo-001",
  nameAr: "محمد إبراهيم الراشدي",
  nameEn: "Mohammed Ibrahim Al-Rashidi",
  mrn: "MRN-2024-0847",
  visit: "VISIT-2026-11452",
  departmentAr: "الجراحة العامة",
  departmentEn: "General Surgery",
  mobile: "+966 50 234 5678",
  idNumber: "1012345678",
  coverageAr: "تغطية غير كافية",
  coverageEn: "Insufficient Coverage",
  paymentTypeAr: "مسؤولية المريض",
  paymentTypeEn: "Patient Responsibility",
};

const invoicesSeed = [
  {
    id: "inv-55671",
    no: "INV-2026-55671",
    serviceAr: "غرفة وعناية ما بعد العملية",
    serviceEn: "Post-operative room and care",
    amount: 3850,
    statusAr: "يتطلب تغطية نقدية",
    statusEn: "Cash coverage required",
  },
  {
    id: "inv-55672",
    no: "INV-2026-55672",
    serviceAr: "مستلزمات طبية",
    serviceEn: "Medical supplies",
    amount: 1275,
    statusAr: "يتطلب تغطية نقدية",
    statusEn: "Cash coverage required",
  },
  {
    id: "inv-55673",
    no: "INV-2026-55673",
    serviceAr: "أدوية ومستهلكات",
    serviceEn: "Medication and consumables",
    amount: 645,
    statusAr: "غير مغطى",
    statusEn: "Not covered",
  },
];


const saudiCities = [
  { value: "Riyadh", ar: "الرياض", en: "Riyadh" },
  { value: "Jeddah", ar: "جدة", en: "Jeddah" },
  { value: "Makkah", ar: "مكة المكرمة", en: "Makkah" },
  { value: "Madinah", ar: "المدينة المنورة", en: "Madinah" },
  { value: "Dammam", ar: "الدمام", en: "Dammam" },
  { value: "Khobar", ar: "الخبر", en: "Khobar" },
  { value: "Dhahran", ar: "الظهران", en: "Dhahran" },
  { value: "Taif", ar: "الطائف", en: "Taif" },
  { value: "Tabuk", ar: "تبوك", en: "Tabuk" },
  { value: "Abha", ar: "أبها", en: "Abha" },
  { value: "Khamis Mushait", ar: "خميس مشيط", en: "Khamis Mushait" },
  { value: "Buraidah", ar: "بريدة", en: "Buraidah" },
  { value: "Hail", ar: "حائل", en: "Hail" },
  { value: "Jazan", ar: "جازان", en: "Jazan" },
  { value: "Najran", ar: "نجران", en: "Najran" },
  { value: "Al Ahsa", ar: "الأحساء", en: "Al Ahsa" },
  { value: "Yanbu", ar: "ينبع", en: "Yanbu" },
  { value: "Jubail", ar: "الجبيل", en: "Jubail" },
  { value: "Al Kharj", ar: "الخرج", en: "Al Kharj" },
  { value: "Al Qassim", ar: "القصيم", en: "Al Qassim" },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIsoDate(days: number): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

const builderSteps: Array<{ id: BuilderStep; ar: string; en: string }> = [
  { id: "patient_visit", ar: "المريض والزيارة", en: "Patient & Visit" },
  { id: "billing_coverage", ar: "الفواتير والتغطية", en: "Billing & Coverage" },
  { id: "coverage_liability", ar: "التغطية ومسؤولية المريض", en: "Coverage & Liability" },
  { id: "note_details", ar: "بيانات السند", en: "Note Details" },
  { id: "debtor_capacity", ar: "صفة المدين", en: "Debtor Capacity" },
  { id: "acknowledgments", ar: "الإقرارات", en: "Acknowledgments" },
  { id: "review", ar: "المراجعة", en: "Review" },
  { id: "send_signature", ar: "الإرسال", en: "Send" },
];

const nav = {
  workspace: [
    { id: "dashboard", ar: "لوحة التحكم", en: "Dashboard", icon: LayoutDashboard },
    { id: "patient-search", ar: "البحث عن المريض", en: "Patient Search", icon: Search },
    { id: "note-builder", ar: "بناء السند", en: "Note Builder", icon: FileText },
    { id: "status-tracking", ar: "تتبع الحالة", en: "Status Tracking", icon: Activity },
    { id: "notes-archive", ar: "أرشيف السندات", en: "Notes Archive", icon: FileText },
    { id: "support-settings", ar: "المساعدة والإعدادات", en: "Support & Settings", icon: Settings },
  ],
  admin: [
    { id: "users", ar: "إدارة المستخدمين", en: "Users & Roles", icon: Users },
    { id: "delegations", ar: "التفويضات والاعتمادات", en: "Delegations & Approvals", icon: Shield },
    { id: "permission-matrix", ar: "مصفوفة الصلاحيات", en: "Permission Matrix", icon: Lock },
    { id: "templates", ar: "القوالب والبنود", en: "Templates & Clauses", icon: ClipboardList },
    { id: "audit", ar: "سجل التدقيق", en: "Audit Trail", icon: Activity },
  ],
  monitoring: [
    { id: "finance-monitoring", ar: "متابعة المالية", en: "Finance Monitoring", icon: WalletCards },
    { id: "claims-monitoring", ar: "متابعة المطالبات", en: "Claims Monitoring", icon: Shield },
    { id: "legal-escalation", ar: "التصعيد القانوني", en: "Legal Escalation", icon: Gavel },
  ],
} as const;

function txt(lang: Lang, ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

function money(value: number) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}

function ShellCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "blue" | "amber" | "red" | "slate";
  children: ReactNode;
}) {
  const map = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold ${map[tone]}`}>{children}</span>;
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1F2937]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToastView({ toast }: { toast: Toast | null }) {
  if (!toast) return null;

  const tone =
    toast.type === "success"
      ? "bg-emerald-600"
      : toast.type === "error"
        ? "bg-red-600"
        : toast.type === "warning"
          ? "bg-amber-600"
          : "bg-[#073763]";

  return (
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-2xl ${tone}`}>
      {toast.message}
    </div>
  );
}

function LeftSidebar({
  lang,
  screen,
  setScreen,
}: {
  lang: Lang;
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
      active ? "bg-[#284f7d] text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
    }`;

  const groupTitle = (ar: string, en: string) => (
    <p className="px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-widest text-white/40">
      {txt(lang, ar, en)}
    </p>
  );

  return (
    <aside className="flex h-screen w-[270px] shrink-0 flex-col bg-[#073763] text-white">
      <div className="border-b border-white/20 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <Landmark className="h-6 w-6 text-[#C9A13B]" />
          </div>
          <div>
            <div className="text-base font-bold">WathiqCare</div>
            <div className="text-xs text-[#C9A13B]">WathiqNote</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groupTitle("بيئة العمل", "Workspace")}
        {nav.workspace.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setScreen(item.id as Screen)} className={itemClass(screen === item.id)}>
              <Icon className="h-4 w-4" />
              <span>{txt(lang, item.ar, item.en)}</span>
            </button>
          );
        })}

        <div className="my-3 border-t border-white/20" />

        {groupTitle("الإدارة", "Admin")}
        {nav.admin.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setScreen(item.id as Screen)} className={itemClass(screen === item.id)}>
              <Icon className="h-4 w-4" />
              <span>{txt(lang, item.ar, item.en)}</span>
            </button>
          );
        })}

        <div className="my-3 border-t border-white/20" />

        {groupTitle("المتابعة والتصعيد", "Monitoring")}
        {nav.monitoring.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setScreen(item.id as Screen)} className={itemClass(screen === item.id)}>
              <Icon className="h-4 w-4" />
              <span>{txt(lang, item.ar, item.en)}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/20 px-5 py-4">
        <div className="mb-3 text-xs text-white/60">PDPL · Audit · Evidence</div>
        <button className="flex items-center gap-2 text-sm text-blue-100">
          <LogOut className="h-4 w-4" />
          {txt(lang, "تسجيل الخروج", "Sign Out")}
        </button>
      </div>
    </aside>
  );
}

function TopBar({ lang, setLang }: { lang: Lang; setLang: (lang: Lang) => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>{txt(lang, "WathiqNote Enterprise Workspace", "WathiqNote Enterprise Workspace")}</span>
        <span>·</span>
        <span>{txt(lang, "فواتير / مطالبات / توثيق", "Billing / Claims / Evidence")}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="rounded-md bg-[#073763] px-3 py-1.5 text-sm font-bold text-white"
        >
          {lang === "ar" ? "EN" : "ع"}
        </button>
        <Bell className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-500">IMC / <b className="text-[#073763]">WathiqNote</b></span>
      </div>
    </header>
  );
}

function Dashboard({
  lang,
  setScreen,
  showToast,
}: {
  lang: Lang;
  setScreen: (screen: Screen) => void;
  showToast: (toast: Toast) => void;
}) {
  const metrics = [
    { labelAr: "سندات قيد البناء", labelEn: "Draft Notes", value: "7", tone: "amber" as const },
    { labelAr: "بانتظار التوقيع", labelEn: "Awaiting Signature", value: "12", tone: "blue" as const },
    { labelAr: "موقعة اليوم", labelEn: "Signed Today", value: "5", tone: "green" as const },
    { labelAr: "تحتاج متابعة", labelEn: "Need Follow-up", value: "3", tone: "red" as const },
  ];

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "لوحة واثق نوت", "WathiqNote Dashboard")}
        subtitle={txt(lang, "ابدأ من البحث عن المريض والزيارة النشطة، ثم اختر الفواتير المطلوب تغطيتها بسند.", "Start with patient and active visit search, then select invoices requiring note coverage.")}
      />

      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <ShellCard key={m.labelEn} className="p-5">
            <StatusPill tone={m.tone}>{txt(lang, m.labelAr, m.labelEn)}</StatusPill>
            <div className="mt-5 text-3xl font-bold text-slate-900">{m.value}</div>
          </ShellCard>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-5">
        <ShellCard>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">{txt(lang, "الإجراءات المعلقة", "Pending Actions")}</h2>
            <button
              onClick={() => {
                showToast({ type: "info", message: txt(lang, "ابدأ بالبحث عن المريض والزيارة النشطة.", "Start by searching patient and active visit.") });
                setScreen("patient-search");
              }}
              className="rounded-md bg-[#073763] px-3 py-2 text-sm font-bold text-white"
            >
              {txt(lang, "بدء سند جديد", "Start New Note")}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {invoicesSeed.map((inv) => (
              <button
                key={inv.no}
                type="button"
                onClick={() => {
                  showToast({ type: "info", message: txt(lang, "تم فتح البحث عن المريض المرتبط بالفاتورة.", "Opening patient search for selected invoice.") });
                  setScreen("patient-search");
                }}
                className="grid w-full grid-cols-[1fr_180px_140px_24px] items-center gap-4 px-5 py-4 text-start hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{txt(lang, patient.nameAr, patient.nameEn)}</div>
                  <div className="text-xs text-slate-500">{patient.mrn} · {inv.no}</div>
                </div>
                <div className="text-sm text-slate-600">{txt(lang, inv.serviceAr, inv.serviceEn)}</div>
                <StatusPill tone="amber">{txt(lang, "يتطلب سند", "Note Required")}</StatusPill>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </ShellCard>

        <ShellCard>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">{txt(lang, "النشاط الحي", "Live Activity")}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {[
              [txt(lang, "تم إنشاء مسودة سند", "Draft note created"), "09:42"],
              [txt(lang, "تم تحديد فواتير غير مغطاة", "Uncovered invoices identified"), "09:15"],
              [txt(lang, "تم إرسال رابط توقيع", "Signing link sent"), "08:50"],
            ].map(([a, t]) => (
              <div key={a} className="px-5 py-4">
                <div className="text-xs font-mono text-slate-500">{t}</div>
                <div className="mt-1 text-sm text-slate-700">{a}</div>
              </div>
            ))}
          </div>
        </ShellCard>
      </div>
    </div>
  );
}

function PatientSearchScreen({
  lang,
  setScreen,
  showToast,
}: {
  lang: Lang;
  setScreen: (screen: Screen) => void;
  showToast: (toast: Toast) => void;
}) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "البحث عن المريض والزيارة", "Patient & Visit Search")}
        subtitle={txt(lang, "المدخل الصحيح لبناء السند هو المريض + الزيارة النشطة + الفواتير المطلوب تغطيتها.", "The correct entry point is patient + active visit + invoices requiring coverage.")}
      />

      <ShellCard className="p-5">
        <div className="grid grid-cols-[1fr_160px] gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={txt(lang, "ابحث بالاسم، MRN، رقم الزيارة، رقم الهوية أو رقم الفاتورة", "Search by name, MRN, visit, ID, or invoice number")}
          />
          <button
            onClick={() => {
              setSearched(true);
              showToast({ type: "success", message: txt(lang, "تم جلب المريض والزيارة والفواتير.", "Patient, visit, and invoices loaded.") });
            }}
            className="rounded-lg bg-[#073763] text-sm font-bold text-white"
          >
            {txt(lang, "بحث", "Search")}
          </button>
        </div>
      </ShellCard>

      {searched ? (
        <div className="grid grid-cols-[1fr_420px] gap-5">
          <ShellCard className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                  <UserRound className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{txt(lang, patient.nameAr, patient.nameEn)}</h2>
                  <p className="mt-1 text-sm text-slate-500">{patient.mrn} · {patient.visit}</p>
                  <div className="mt-3 flex gap-2">
                    <StatusPill tone="green">{txt(lang, "زيارة نشطة", "Active Visit")}</StatusPill>
                    <StatusPill tone="amber">{txt(lang, patient.coverageAr, patient.coverageEn)}</StatusPill>
                    <StatusPill tone="blue">{txt(lang, patient.paymentTypeAr, patient.paymentTypeEn)}</StatusPill>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  showToast({ type: "success", message: txt(lang, "تم نقل بيانات المريض إلى شاشة بناء السند.", "Patient data moved to Note Builder.") });
                  setScreen("note-builder");
                }}
                className="rounded-lg bg-[#073763] px-4 py-2 text-sm font-bold text-white"
              >
                {txt(lang, "بناء السند", "Build Note")}
              </button>
            </div>
          </ShellCard>

          <ShellCard className="p-5">
            <h3 className="font-bold text-slate-900">{txt(lang, "ملخص مالي", "Financial Summary")}</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <SummaryLine label={txt(lang, "إجمالي المطلوب تغطيته", "Total Required Coverage")} value={money(5770)} />
              <SummaryLine label={txt(lang, "عدد الفواتير", "Invoices")} value="3" />
              <SummaryLine label={txt(lang, "قرار المطالبات", "Claims Decision")} value={txt(lang, "يتطلب تغطية نقدية", "Cash coverage required")} />
            </div>
          </ShellCard>
        </div>
      ) : (
        <ShellCard className="p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 font-bold text-slate-900">{txt(lang, "ابدأ البحث", "Start Search")}</h3>
          <p className="mt-2 text-sm text-slate-500">{txt(lang, "اكتب MRN أو رقم الزيارة أو الفاتورة لجلب البيانات.", "Enter MRN, visit, or invoice number to load records.")}</p>
        </ShellCard>
      )}
    </div>
  );
}

function Stepper({
  lang,
  activeStep,
  setActiveStep,
}: {
  lang: Lang;
  activeStep: BuilderStep;
  setActiveStep: (step: BuilderStep) => void;
}) {
  const activeIndex = builderSteps.findIndex((s) => s.id === activeStep);

  return (
    <ShellCard className="p-4">
      <div className="flex items-center gap-3 overflow-x-auto">
        {builderSteps.map((step, index) => {
          const active = step.id === activeStep;
          const completed = index < activeIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className="flex min-w-fit items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-slate-50"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  active
                    ? "bg-[#073763] text-white"
                    : completed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {completed ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`text-sm font-bold ${active ? "text-[#073763]" : "text-slate-500"}`}>
                {txt(lang, step.ar, step.en)}
              </span>
              {index < builderSteps.length - 1 ? <div className="h-px w-8 bg-slate-200" /> : null}
            </button>
          );
        })}
      </div>
    </ShellCard>
  );
}


async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : data && typeof data === "object" && "message" in data
          ? String((data as { message?: unknown }).message)
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function extractCreatedNoteId(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const candidate =
    record.id ||
    record.promissoryNoteId ||
    (record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).id : null) ||
    (record.note && typeof record.note === "object" ? (record.note as Record<string, unknown>).id : null);

  return typeof candidate === "string" ? candidate : null;
}

function extractNoteNumber(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const candidate =
    record.noteNumber ||
    (record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).noteNumber : null) ||
    (record.note && typeof record.note === "object" ? (record.note as Record<string, unknown>).noteNumber : null);

  return typeof candidate === "string" ? candidate : null;
}

function extractSigningUrl(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const candidate =
    record.signingUrl ||
    (record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>).signingUrl : null);

  return typeof candidate === "string" ? candidate : null;
}

function extractStatus(response: unknown, key: string): string | null {
  if (!response || typeof response !== "object") return null;

  const record = response as Record<string, unknown>;
  const direct = record[key];
  const nested = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>)[key] : null;
  const candidate = direct || nested;

  return typeof candidate === "string" ? candidate : null;
}

function NoteBuilder({
  lang,
  showToast,
  setScreen,
}: {
  lang: Lang;
  showToast: (toast: Toast) => void;
  setScreen: (screen: Screen) => void;
}) {
  const [activeStep, setActiveStep] = useState<BuilderStep>("patient_visit");
  const [debtorName, setDebtorName] = useState(txt(lang, patient.nameAr, patient.nameEn));
  const [debtorId, setDebtorId] = useState(patient.idNumber);
  const [makerDateOfBirth, setMakerDateOfBirth] = useState("");
  const [mobile, setMobile] = useState(patient.mobile);
  const [makerEmail, setMakerEmail] = useState("");
  const [makerAddress, setMakerAddress] = useState("");
  const [makerCity, setMakerCity] = useState("Jeddah");
  const [amount, setAmount] = useState("5770.00");
  const [capacity, setCapacity] = useState("original_debtor");
  const [dueType, setDueType] = useState("on_demand");
  const [ack1, setAck1] = useState(true);
  const [ack2, setAck2] = useState(true);
  const [ack3, setAck3] = useState(true);

  const [coverageDecision, setCoverageDecision] = useState("PENDING");
  const [liabilityReason, setLiabilityReason] = useState("prior_authorization_pending");
  const [liabilityEvidenceRef, setLiabilityEvidenceRef] = useState("");
  const [liabilityApprovedBy, setLiabilityApprovedBy] = useState("");
  const [created, setCreated] = useState(false);
  const [apiBusy, setApiBusy] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [issueDate] = useState(() => todayIsoDate());
  const [dueDate, setDueDate] = useState(() => addDaysIsoDate(30));
  const [issueCity, setIssueCity] = useState("Jeddah");
  const [paymentCity, setPaymentCity] = useState("Jeddah");
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [createdNoteNumber, setCreatedNoteNumber] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [linkSmsStatus, setLinkSmsStatus] = useState<string | null>(null);
  const [otpSmsStatus, setOtpSmsStatus] = useState<string | null>(null);
  const [enterpriseLifecycleStatus, setEnterpriseLifecycleStatus] = useState<string | null>(null);
  const [enterpriseLifecycleBusy, setEnterpriseLifecycleBusy] = useState<string | null>(null);

  const activeIndex = builderSteps.findIndex((s) => s.id === activeStep);
  const total = useMemo(() => invoicesSeed.reduce((sum, item) => sum + item.amount, 0), []);

  const coverageLiabilityReady = Boolean(
    coverageDecision === "PATIENT_LIABILITY_CONFIRMED" &&
    liabilityReason &&
    liabilityEvidenceRef.trim() &&
    liabilityApprovedBy.trim()
  );

  const canIssue = Boolean(
    debtorName &&
    debtorId &&
    mobile &&
    makerEmail &&
    makerAddress &&
    amount &&
    ack1 &&
    ack2 &&
    ack3 &&
    coverageLiabilityReady
  );

  function nextStep() {
    const next = builderSteps[Math.min(activeIndex + 1, builderSteps.length - 1)];
    setActiveStep(next.id);
  }

  function previousStep() {
    const prev = builderSteps[Math.max(activeIndex - 1, 0)];
    setActiveStep(prev.id);
  }

  async function issueNotePrototype() {
    if (!caseId.trim()) {
      showToast({ type: "warning", message: txt(lang, "Case ID مطلوب لأن API الحالي يربط السند بملف حالة قائم.", "Case ID is required because the current API links the note to an existing case.") });
      return;
    }

    if (dueType === "specific_date" && !dueDate.trim()) {
      showToast({ type: "warning", message: txt(lang, "تاريخ الاستحقاق مطلوب عند اختيار تاريخ محدد.", "Due date is required when a specific date is selected.") });
      return;
    }

    if (!canIssue) {
      showToast({ type: "warning", message: txt(lang, "أكمل بيانات محرر السند والإقرارات المطلوبة قبل الإصدار.", "Complete maker details and required acknowledgments before issuance.") });
      return;
    }

    const loadingStartedAt = Date.now();

    setApiBusy(true);

    try {
      const createPayload = {
        caseId: caseId.trim(),
        debtorName: debtorName.trim(),
        debtorIdNumber: debtorId.trim(),
        issuerName: "International Medical Center",
        amount: Number(amount),
        currency: "SAR",
        dueDate: dueType === "on_demand" ? issueDate : dueDate,
        documentVersion: "1.0",
        metadata: {
          source: "wathiqnote-enterprise-workflow",
          patient: {
            patientId: patient.id,
            nameAr: patient.nameAr,
            nameEn: patient.nameEn,
            mrn: patient.mrn,
            visit: patient.visit,
            departmentAr: patient.departmentAr,
            departmentEn: patient.departmentEn,
            mobile,
            idNumber: debtorId,
          },
          maker: {
            name: debtorName,
            idNumber: debtorId,
            dateOfBirth: makerDateOfBirth || null,
            mobile,
            email: makerEmail,
            address: makerAddress,
            city: makerCity,
            capacity,
          },
          debtor: {
            name: debtorName,
            idNumber: debtorId,
            dateOfBirth: makerDateOfBirth || null,
            mobile,
            email: makerEmail,
            address: makerAddress,
            city: makerCity,
            capacity,
          },
          billing: {
            invoices: invoicesSeed,
            totalCashCoverageAmount: total,
            erpReference: "ERP-AR-2026-000771",
            financialStatus: "Outstanding - Secured by Promissory Note",
          },
          coverage: {
            coverageStatus: "patient_responsibility",
            claimsDecision: "cash_coverage_required",
            coverageAr: patient.coverageAr,
            coverageEn: patient.coverageEn,
          },
          coverageLiabilityDecision: {
            decision: coverageDecision,
            reason: liabilityReason,
            evidenceReference: liabilityEvidenceRef.trim(),
            approvedBy: liabilityApprovedBy.trim(),
            patientLiabilityAmount: Number(amount),
            decisionLabelAr: "مسؤولية المريض المالية",
            decisionLabelEn: "Patient Financial Liability",
          },
          note: {
            dueType,
            issueDate,
            dueDate: dueType === "on_demand" ? issueDate : dueDate,
            issueCity,
            paymentCity,
            signerCapacity: capacity,
            legalEscalationVisibleDuringIssuance: false,
          },
          acknowledgments: {
            dataAccuracy: ack1,
            electronicTransactions: ack2,
            pdplProcessing: ack3,
          },
        },
      };

      const createdResponse = await apiJson<unknown>("/api/modules/promissory-notes", {
        method: "POST",
        body: JSON.stringify(createPayload),
      });

      const noteId = extractCreatedNoteId(createdResponse);
      const noteNumber = extractNoteNumber(createdResponse);

      if (!noteId) {
        throw new Error("Promissory note was created but note id was not returned by the API.");
      }

      setCreatedNoteId(noteId);
      setCreatedNoteNumber(noteNumber);

      const signingResponse = await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(noteId)}/debtor-signing/start`, {
        method: "POST",
        body: JSON.stringify({
          debtorMobile: mobile,
          locale: lang,
        }),
      });

      const nextSigningUrl = extractSigningUrl(signingResponse);
      const nextLinkSmsStatus = extractStatus(signingResponse, "linkSmsStatus");
      const nextOtpSmsStatus = extractStatus(signingResponse, "otpSmsStatus");
      const nextSigningStatus = extractStatus(signingResponse, "status");

      setSigningUrl(nextSigningUrl);
      setLinkSmsStatus(nextLinkSmsStatus);
      setOtpSmsStatus(nextOtpSmsStatus);
      setEnterpriseLifecycleStatus(nextSigningStatus || "PENDING_OTP");
      setCreated(true);

      const smsOk = nextLinkSmsStatus === "sent" && nextOtpSmsStatus === "sent";
      const smsFailed = nextLinkSmsStatus === "failed" || nextOtpSmsStatus === "failed";

      if (smsOk) {
        showToast({
          type: "success",
          message: txt(
            lang,
            `تم إنشاء السند وإرسال رابط التوقيع ورمز التحقق إلى ${mobile}.`,
            `Note created and signing link/OTP were sent to ${mobile}.`,
          ),
        });
      } else if (smsFailed) {
        showToast({
          type: "warning",
          message: txt(
            lang,
            `تم إنشاء السند، لكن فشل إرسال رسالة SMS إلى ${mobile}. تحقق من إعدادات تقنيات/SMS Gateway أو أعد الإرسال من بطاقة النتيجة.`,
            `Note created, but SMS delivery to ${mobile} failed. Check Taqnyat/SMS Gateway settings or resend from the result card.`,
          ),
        });
      } else {
        showToast({
          type: "warning",
          message: txt(
            lang,
            `تم إنشاء السند، لكن حالة إرسال SMS إلى ${mobile} غير مؤكدة. يرجى مراجعة سجل تقنيات أو إعادة الإرسال.`,
            `Note created, but SMS delivery status to ${mobile} is not confirmed. Please check provider logs or resend.`,
          ),
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : txt(lang, "فشل إنشاء السند.", "Failed to create note."),
      });
    } finally {
      const elapsed = Date.now() - loadingStartedAt;
      const remaining = WATHIQNOTE_LOADER_MINIMUM_MS - elapsed;

      if (remaining > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }

      setApiBusy(false);
    }
  }


  async function handleEnterpriseResendSigningLink() {
    if (!createdNoteId) {
      showToast({ type: "warning", message: txt(lang, "لا يوجد سند منشأ لإعادة إرسال الرابط.", "No created note is available to resend.") });
      return;
    }

    setEnterpriseLifecycleBusy("resend");

    try {
      const signingResponse = await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(createdNoteId)}/debtor-signing/start`, {
        method: "POST",
        body: JSON.stringify({
          debtorMobile: mobile,
          locale: lang,
        }),
      });

      const nextSigningUrl = extractSigningUrl(signingResponse);
      const nextLinkSmsStatus = extractStatus(signingResponse, "linkSmsStatus");
      const nextOtpSmsStatus = extractStatus(signingResponse, "otpSmsStatus");
      const nextSigningStatus = extractStatus(signingResponse, "status");

      setSigningUrl(nextSigningUrl);
      setLinkSmsStatus(nextLinkSmsStatus);
      setOtpSmsStatus(nextOtpSmsStatus);
      setEnterpriseLifecycleStatus(nextSigningStatus || "PENDING_OTP");

      showToast({
        type: "success",
        message: txt(lang, "تمت إعادة إرسال رابط التوقيع ورمز التحقق.", "Signing link and OTP were resent."),
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : txt(lang, "فشلت إعادة إرسال رابط التوقيع.", "Failed to resend signing link."),
      });
    } finally {
      setEnterpriseLifecycleBusy(null);
    }
  }

  async function handleEnterpriseSettleNote() {
    if (!createdNoteId) {
      showToast({ type: "warning", message: txt(lang, "لا يوجد سند منشأ لإقفاله.", "No created note is available to settle.") });
      return;
    }

    const reason = window.prompt(txt(lang, "أدخل مرجع أو سبب إقفال السند بالوفاء:", "Enter payment reference or settlement reason:"));
    if (reason === null) return;

    setEnterpriseLifecycleBusy("settle");

    try {
      await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(createdNoteId)}/settle`, {
        method: "PATCH",
        body: JSON.stringify({
          reason: reason || "Settled by authorized user",
          amount,
          method: "manual",
        }),
      });

      setEnterpriseLifecycleStatus("SETTLED");

      showToast({
        type: "success",
        message: txt(lang, "تم إقفال السند بالوفاء.", "Promissory note was marked as settled."),
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : txt(lang, "فشل إقفال السند بالوفاء.", "Failed to settle promissory note."),
      });
    } finally {
      setEnterpriseLifecycleBusy(null);
    }
  }

  async function handleEnterpriseVoidNote() {
    if (!createdNoteId) {
      showToast({ type: "warning", message: txt(lang, "لا يوجد سند منشأ لإلغائه.", "No created note is available to void.") });
      return;
    }

    const reason = window.prompt(txt(lang, "أدخل سبب إلغاء السند:", "Enter reason for voiding the note:"));
    if (!reason) return;

    setEnterpriseLifecycleBusy("void");

    try {
      await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(createdNoteId)}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({
          reason,
          method: "manual",
        }),
      });

      setEnterpriseLifecycleStatus("VOID");

      showToast({
        type: "success",
        message: txt(lang, "تم إلغاء السند وحفظ السبب في سجل التدقيق.", "Promissory note was voided and the reason was audited."),
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : txt(lang, "فشل إلغاء السند.", "Failed to void promissory note."),
      });
    } finally {
      setEnterpriseLifecycleBusy(null);
    }
  }
  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "بناء السند", "Note Builder")}
        subtitle={txt(lang, "الرحلة الإنتاجية: المريض ← الفواتير ← السند ← الإقرارات ← المراجعة ← الإرسال.", "Production flow: patient → billing → note → acknowledgments → review → send.")}
      />

      <Stepper lang={lang} activeStep={activeStep} setActiveStep={setActiveStep} />

      {apiBusy ? <WathiqNoteIssueLoader lang={lang} progress={68} /> : null}

      <div className="grid grid-cols-[1fr_360px] gap-5">
        <div className="space-y-5">
          {activeStep === "patient_visit" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "المريض والزيارة النشطة", "Patient & Active Visit")}</h2>
              <div className="grid grid-cols-4 gap-4">
                <SummaryLine label={txt(lang, "المريض", "Patient")} value={txt(lang, patient.nameAr, patient.nameEn)} />
                <SummaryLine label="MRN" value={patient.mrn} />
                <SummaryLine label={txt(lang, "الزيارة", "Visit")} value={patient.visit} />
                <SummaryLine label={txt(lang, "القسم", "Department")} value={txt(lang, patient.departmentAr, patient.departmentEn)} />
              </div>
            </ShellCard>
          ) : null}

          {activeStep === "billing_coverage" ? (
            <ShellCard>
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "الفواتير المطلوب تغطيتها", "Invoices Requiring Coverage")}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-start">{txt(lang, "رقم الفاتورة", "Invoice")}</th>
                    <th className="px-5 py-3 text-start">{txt(lang, "الخدمة", "Service")}</th>
                    <th className="px-5 py-3 text-start">{txt(lang, "قرار المطالبات", "Claims Decision")}</th>
                    <th className="px-5 py-3 text-end">{txt(lang, "المبلغ", "Amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesSeed.map((inv) => (
                    <tr key={inv.no}>
                      <td className="px-5 py-3 font-bold text-[#073763]">{inv.no}</td>
                      <td className="px-5 py-3 text-slate-700">{txt(lang, inv.serviceAr, inv.serviceEn)}</td>
                      <td className="px-5 py-3"><StatusPill tone="amber">{txt(lang, inv.statusAr, inv.statusEn)}</StatusPill></td>
                      <td className="px-5 py-3 text-end font-bold">{money(inv.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ShellCard>
          ) : null}

          {activeStep === "coverage_liability" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">
                {txt(lang, "قرار التغطية ومسؤولية المريض", "Coverage & Patient Liability Decision")}
              </h2>

              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900">
                {txt(
                  lang,
                  "لا يسمح النظام بإصدار سند لأمر إلا إذا كانت مسؤولية المريض المالية مؤكدة وموثقة بمستند واعتماد داخلي.",
                  "The system will not allow a promissory note unless patient financial liability is confirmed, evidenced, and internally approved.",
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">{txt(lang, "قرار التغطية", "Coverage Decision")}</span>
                  <select
                    value={coverageDecision}
                    onChange={(event) => setCoverageDecision(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PENDING">{txt(lang, "قيد التحقق / لا يسمح بالإصدار", "Pending / Issuance Blocked")}</option>
                    <option value="INSURANCE_COVERED">{txt(lang, "مغطى من التأمين / لا يسمح بالإصدار", "Insurance Covered / Issuance Blocked")}</option>
                    <option value="DENIED_UNDER_APPEAL">{txt(lang, "رفض قيد الاعتراض / لا يسمح بالإصدار", "Denied Under Appeal / Issuance Blocked")}</option>
                    <option value="PATIENT_LIABILITY_CONFIRMED">{txt(lang, "مسؤولية المريض مؤكدة / يسمح بالإصدار", "Patient Liability Confirmed / Issuance Allowed")}</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">{txt(lang, "سبب مسؤولية المريض", "Patient Liability Reason")}</span>
                  <select
                    value={liabilityReason}
                    onChange={(event) => setLiabilityReason(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="prior_authorization_denied">{txt(lang, "رفض الموافقة المسبقة", "Prior Authorization Denied")}</option>
                    <option value="non_covered_service">{txt(lang, "خدمة غير مشمولة", "Non-Covered Service")}</option>
                    <option value="claim_denied_patient_liable">{txt(lang, "رفض مطالبة والمريض مسؤول", "Claim Denied - Patient Liable")}</option>
                    <option value="benefit_limit_exhausted">{txt(lang, "استنفاد حد التغطية", "Benefit Limit Exhausted")}</option>
                    <option value="partial_coverage">{txt(lang, "تغطية جزئية", "Partial Coverage")}</option>
                    <option value="self_pay_by_choice">{txt(lang, "اختيار المريض الدفع كاش", "Self-Pay by Choice")}</option>
                    <option value="out_of_network">{txt(lang, "خارج الشبكة", "Out of Network")}</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">{txt(lang, "مرجع المستند المؤيد", "Evidence Reference")}</span>
                  <input
                    value={liabilityEvidenceRef}
                    onChange={(event) => setLiabilityEvidenceRef(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder={txt(lang, "مثال: PA-DENIAL-2026-001 / EOB-12345", "Example: PA-DENIAL-2026-001 / EOB-12345")}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-700">{txt(lang, "اعتماد مالي / مطالبات", "Finance / Claims Approval")}</span>
                  <input
                    value={liabilityApprovedBy}
                    onChange={(event) => setLiabilityApprovedBy(event.target.value)}
                    className="h-11 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder={txt(lang, "اسم المعتمد أو مرجع الاعتماد", "Approver name or approval reference")}
                  />
                </label>
              </div>

              <div className={`mt-5 rounded-xl border p-4 text-sm font-bold ${
                coverageLiabilityReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {coverageLiabilityReady
                  ? txt(lang, "قرار النظام: يسمح بإصدار السند لأن مسؤولية المريض مؤكدة وموثقة.", "System Decision: Issuance allowed because patient liability is confirmed and evidenced.")
                  : txt(lang, "قرار النظام: لا يسمح بإصدار السند حتى تكتمل مسؤولية المريض والمستند والاعتماد.", "System Decision: Issuance blocked until patient liability, evidence, and approval are complete.")}
              </div>
            </ShellCard>
          ) : null}
          {activeStep === "note_details" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "بيانات السند", "Note Details")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Case ID" value={caseId} onChange={setCaseId} placeholder={txt(lang, "أدخل Case ID من النظام", "Enter existing system Case ID")} />

                <Field label={txt(lang, "تاريخ الإنشاء", "Issue Date")} value={issueDate} onChange={() => {}} type="date" />

                <Field label={txt(lang, "مبلغ السند", "Note Amount")} value={amount} onChange={setAmount} />

                <SelectField
                  label={txt(lang, "نوع الاستحقاق", "Due Type")}
                  value={dueType}
                  onChange={(value) => {
                    setDueType(value);
                    if (value === "on_demand") {
                      setDueDate(issueDate);
                    } else if (!dueDate || dueDate === issueDate) {
                      setDueDate(addDaysIsoDate(30));
                    }
                  }}
                  options={[
                    { value: "on_demand", label: txt(lang, "لدى الاطلاع", "On Demand") },
                    { value: "specific_date", label: txt(lang, "بتاريخ محدد", "Specific Date") },
                  ]}
                />

                {dueType === "specific_date" ? (
                  <Field label={txt(lang, "تاريخ الاستحقاق", "Due Date")} value={dueDate} onChange={setDueDate} type="date" />
                ) : (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                    <div className="text-xs font-bold text-blue-700">{txt(lang, "تاريخ الاستحقاق", "Due Date")}</div>
                    <div className="mt-1 font-bold">{txt(lang, "لدى الاطلاع من تاريخ الإنشاء", "On demand from issue date")}</div>
                    <div className="mt-1 text-xs text-blue-700">{issueDate}</div>
                  </div>
                )}

                <SelectField
                  label={txt(lang, "مكان الإنشاء", "Issue City")}
                  value={issueCity}
                  onChange={setIssueCity}
                  options={saudiCities.map((city) => ({
                    value: city.value,
                    label: txt(lang, city.ar, city.en),
                  }))}
                />

                <SelectField
                  label={txt(lang, "مكان الوفاء", "Payment City")}
                  value={paymentCity}
                  onChange={setPaymentCity}
                  options={saudiCities.map((city) => ({
                    value: city.value,
                    label: txt(lang, city.ar, city.en),
                  }))}
                />

                <Field label={txt(lang, "سبب إصدار السند", "Reason")} value={txt(lang, "تغطية نقدية لفواتير غير مغطاة", "Cash coverage for uncovered invoices")} onChange={() => {}} />
                <Field label="ERP Reference" value="ERP-AR-2026-000771" onChange={() => {}} />
              </div>
            </ShellCard>
          ) : null}

          {activeStep === "debtor_capacity" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "صفة المدين / الموقع", "Debtor / Signer Capacity")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label={txt(lang, "اسم محرر السند / الموقع", "Maker / Signer Name")} value={debtorName} onChange={setDebtorName} />

                <Field label={txt(lang, "رقم الهوية / الإقامة", "ID / Iqama")} value={debtorId} onChange={setDebtorId} />

                <Field label={txt(lang, "تاريخ الميلاد", "Date of Birth")} value={makerDateOfBirth} onChange={setMakerDateOfBirth} type="date" />

                <Field label={txt(lang, "رقم الجوال", "Mobile")} value={mobile} onChange={setMobile} />

                <Field label={txt(lang, "البريد الإلكتروني", "Email")} value={makerEmail} onChange={setMakerEmail} placeholder="name@example.com" />

                <SelectField
                  label={txt(lang, "مدينة محرر السند", "Maker City")}
                  value={makerCity}
                  onChange={setMakerCity}
                  options={saudiCities.map((city) => ({
                    value: city.value,
                    label: txt(lang, city.ar, city.en),
                  }))}
                />

                <div className="col-span-2">
                  <Field label={txt(lang, "العنوان الوطني / العنوان", "National Address / Address")} value={makerAddress} onChange={setMakerAddress} />
                </div>

                <SelectField
                  label={txt(lang, "صفة الموقع", "Signer Capacity")}
                  value={capacity}
                  onChange={setCapacity}
                  options={[
                    { value: "original_debtor", label: txt(lang, "مدين أصلي", "Original Debtor") },
                    { value: "guarantor", label: txt(lang, "كفيل غارم", "Guarantor") },
                    { value: "aval_guarantor", label: txt(lang, "ضامن احتياطي", "Aval Guarantor") },
                    { value: "legal_representative", label: txt(lang, "ولي / وصي / ممثل نظامي", "Legal Representative") },
                  ]}
                />
              </div>
            </ShellCard>
          ) : null}

          {activeStep === "acknowledgments" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "الإقرارات القانونية", "Legal Acknowledgments")}</h2>
              <div className="grid gap-4 text-sm text-slate-700">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={ack1} onChange={() => setAck1(!ack1)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>{txt(lang, "أقر بصحة البيانات والفواتير المختارة.", "I confirm the accuracy of the selected data and invoices.")}</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={ack2} onChange={() => setAck2(!ack2)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>{txt(lang, "أوافق على التوقيع الإلكتروني وفق نظام التعاملات الإلكترونية.", "I agree to electronic signing under the Electronic Transactions Law.")}</span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={ack3} onChange={() => setAck3(!ack3)} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span>{txt(lang, "أوافق على معالجة البيانات لغرض التوثيق والمتابعة وفق PDPL.", "I agree to data processing for evidence and follow-up under PDPL.")}</span>
                </label>
              </div>
            </ShellCard>
          ) : null}

          {activeStep === "review" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "المراجعة النهائية", "Final Review")}</h2>
              <div className="grid grid-cols-3 gap-4">
                <SummaryLine label={txt(lang, "محرر السند", "Maker")} value={debtorName} />
                <SummaryLine label={txt(lang, "رقم الهوية", "ID Number")} value={debtorId} />
                <SummaryLine label={txt(lang, "تاريخ الميلاد", "Date of Birth")} value={makerDateOfBirth || "—"} />
                <SummaryLine label={txt(lang, "البريد الإلكتروني", "Email")} value={makerEmail || "—"} />
                <SummaryLine label={txt(lang, "العنوان", "Address")} value={makerAddress || "—"} />
                <SummaryLine label={txt(lang, "المدينة", "City")} value={makerCity || "—"} />
                <SummaryLine label={txt(lang, "المبلغ", "Amount")} value={`${amount} SAR`} />
                <SummaryLine label={txt(lang, "الفواتير", "Invoices")} value="3" />
                <SummaryLine label={txt(lang, "نوع الاستحقاق", "Due Type")} value={dueType === "on_demand" ? txt(lang, "لدى الاطلاع من تاريخ الإنشاء", "On Demand from Issue Date") : txt(lang, "بتاريخ محدد", "Specific Date")} />
                <SummaryLine label={txt(lang, "مكان الإنشاء", "Issue City")} value={issueCity} />
                <SummaryLine label={txt(lang, "مكان الوفاء", "Payment City")} value={paymentCity} />
                <SummaryLine label={txt(lang, "التغطية", "Coverage")} value={txt(lang, "مسؤولية المريض", "Patient Responsibility")} />
                <SummaryLine label={txt(lang, "جاهزية التوقيع", "Signature Readiness")} value={canIssue ? txt(lang, "جاهز", "Ready") : txt(lang, "غير مكتمل", "Incomplete")} />
              </div>
            </ShellCard>
          ) : null}

          {activeStep === "send_signature" ? (
            <ShellCard className="p-5">
              <h2 className="mb-4 text-lg font-bold text-[#073763]">{txt(lang, "الإصدار والإرسال", "Issue & Send")}</h2>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <Send className="mt-1 h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-bold text-blue-900">{txt(lang, "جاهز لإصدار السند", "Ready to issue note")}</div>
                    <p className="mt-2 text-sm leading-6 text-blue-800">
                      {txt(lang, "سيتم إنشاء السند ثم إرسال رابط التوقيع وOTP للمدين/الموقع.", "The note will be created, then the signing link and OTP will be sent to the debtor/signer.")}
                    </p>
                  </div>
                </div>
              </div>
            </ShellCard>
          ) : null}

          {createdNoteId ? (
            <div data-testid="enterprise-note-lifecycle-actions" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#073763]">
                    {txt(lang, "إدارة السند", "Note Lifecycle Management")}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {createdNoteNumber ? `${createdNoteNumber} · ` : ""}
                    {enterpriseLifecycleStatus || txt(lang, "تم الإنشاء", "Created")}
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  {enterpriseLifecycleStatus || "ACTIVE"}
                </span>
              </div>

              {signingUrl ? (
                <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                  <div className="mb-1 font-bold">{txt(lang, "رابط التوقيع", "Signing Link")}</div>
                  <div className="break-all">{signingUrl}</div>
                  <div className="mt-2 text-blue-800">
                    {txt(lang, "رقم الجوال:", "Mobile:")} {mobile} · {txt(lang, "حالة الرابط:", "Link SMS:")} {linkSmsStatus || "—"} · {txt(lang, "حالة OTP:", "OTP SMS:")} {otpSmsStatus || "—"}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {signingUrl ? (
                  <a href={signingUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                    {txt(lang, "فتح رابط التوقيع", "Open Signing Link")}
                  </a>
                ) : null}

                <a href={`/api/modules/promissory-notes/${encodeURIComponent(createdNoteId)}/pdf?lang=${lang}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                  {txt(lang, "تحميل PDF", "Download PDF")}
                </a>

                <button type="button" onClick={handleEnterpriseResendSigningLink} disabled={Boolean(enterpriseLifecycleBusy) || ["SETTLED", "VOID"].includes((enterpriseLifecycleStatus || "").toUpperCase())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {enterpriseLifecycleBusy === "resend" ? txt(lang, "جارٍ الإرسال...", "Resending...") : txt(lang, "إعادة إرسال الرابط", "Resend Link")}
                </button>

                <button type="button" onClick={handleEnterpriseSettleNote} disabled={Boolean(enterpriseLifecycleBusy) || ["SETTLED", "VOID"].includes((enterpriseLifecycleStatus || "").toUpperCase())} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {enterpriseLifecycleBusy === "settle" ? txt(lang, "جارٍ الإقفال...", "Settling...") : txt(lang, "إقفال بالوفاء", "Settle")}
                </button>

                <button type="button" onClick={handleEnterpriseVoidNote} disabled={Boolean(enterpriseLifecycleBusy) || ["SETTLED", "VOID"].includes((enterpriseLifecycleStatus || "").toUpperCase())} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {enterpriseLifecycleBusy === "void" ? txt(lang, "جارٍ الإلغاء...", "Voiding...") : txt(lang, "إلغاء السند", "Void Note")}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={previousStep}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="inline h-4 w-4" /> {txt(lang, "السابق", "Previous")}
            </button>

            {activeStep === "send_signature" ? (
              <button
                type="button"
                onClick={issueNotePrototype}
                disabled={apiBusy}
                className="rounded-lg bg-[#073763] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="inline h-4 w-4" /> {apiBusy ? txt(lang, "جارٍ الإنشاء والإرسال...", "Creating and sending...") : txt(lang, "إصدار السند وإرسال رابط التوقيع", "Issue Note & Send Signing Link")}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-lg bg-[#073763] px-5 py-2.5 text-sm font-bold text-white"
              >
                {txt(lang, "التالي", "Next")} <ChevronRight className="inline h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <ShellCard className="p-5">
            <h3 className="mb-4 font-bold text-[#073763]">{txt(lang, "ملخص السند", "Note Summary")}</h3>
            <div className="space-y-3">
              <SummaryLine label={txt(lang, "المريض", "Patient")} value={debtorName || "—"} />
              <SummaryLine label={txt(lang, "المبلغ", "Amount")} value={`${amount || "0"} SAR`} />
              <SummaryLine label={txt(lang, "الفواتير", "Invoices")} value={money(total)} />
              <SummaryLine label={txt(lang, "حالة الإنشاء", "Creation Status")} value={created ? txt(lang, "تم الإنشاء", "Created") : txt(lang, "قيد البناء", "Drafting")} />
              <SummaryLine label={txt(lang, "التصعيد القانوني", "Legal Escalation")} value={txt(lang, "غير ظاهر في الإصدار", "Hidden during issuance")} />
            </div>
          </ShellCard>

          <ShellCard className="p-5">
            <h3 className="mb-4 font-bold text-[#073763]">{txt(lang, "جاهزية الخطوات", "Step Readiness")}</h3>
            <div className="space-y-3">
              {builderSteps.map((s, index) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-700">{txt(lang, s.ar, s.en)}</span>
                  {index <= activeIndex ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />}
                </div>
              ))}
            </div>
          </ShellCard>
        </aside>
      </div>
    </div>
  );
}

function StatusTracking({ lang }: { lang: Lang }) {
  const { notes, loading, error, loadNotes } = usePromissoryNotes(lang);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function getNoteValue(note: PromissoryNoteListItem | null | undefined, keys: string[]) {
    if (!note) return "";
    const record = note as unknown as Record<string, unknown>;

    for (const key of keys) {
      const value = record[key];
      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value);
      }
    }

    return "";
  }

  function getNoteAmount(note: PromissoryNoteListItem | null | undefined) {
    return getNoteValue(note, ["amount", "principalAmount", "totalAmount", "noteAmount"]) || "0";
  }

  function getNoteStatus(note: PromissoryNoteListItem | null | undefined) {
    return getNoteValue(note, ["status", "noteStatus", "lifecycleStatus"]).toUpperCase() || "ACTIVE";
  }

  const operationalNotes = useMemo(() => {
    return notes.filter((note) => {
      const status = getNoteStatus(note);
      return !["SETTLED", "VOID", "CANCELLED", "CANCELED"].includes(status);
    });
  }, [notes]);

  const selectedNote = useMemo(() => {
    const pool = operationalNotes.length ? operationalNotes : notes;
    return pool.find((note) => getNoteValue(note, ["id", "noteId"]) === selectedNoteId) || pool[0] || null;
  }, [notes, operationalNotes, selectedNoteId]);

  useEffect(() => {
    if (!selectedNoteId && selectedNote) {
      setSelectedNoteId(getNoteValue(selectedNote, ["id", "noteId"]));
    }
  }, [selectedNote, selectedNoteId]);

  function buildTimeline(note: PromissoryNoteListItem | null) {
    const status = getNoteStatus(note);
    const hasNote = Boolean(note);
    const sent = ["PENDING_SIGNATURE", "PENDING_OTP", "SIGNED", "ACTIVE", "SETTLED", "OVERDUE", "VOID"].includes(status);
    const signed = ["SIGNED", "ACTIVE", "SETTLED", "OVERDUE"].includes(status);
    const settled = status === "SETTLED";
    const overdue = status === "OVERDUE";
    const voided = ["VOID", "CANCELLED", "CANCELED"].includes(status);

    return [
      { ar: "تم إنشاء السند في النظام", en: "Note created in the system", done: hasNote },
      { ar: "تم ربط السند ببيانات المريض/المدين", en: "Note linked to patient/debtor data", done: hasNote },
      { ar: "تم تجهيز ملف PDF للسند", en: "PDF file is available", done: hasNote },
      { ar: "تم إرسال رابط التوقيع / OTP", en: "Signing link / OTP sent", done: sent },
      { ar: "بانتظار توقيع المدين", en: "Awaiting debtor signature", done: signed, locked: !sent || voided },
      { ar: "المتابعة المالية", en: "Finance monitoring", done: signed || settled || overdue },
      { ar: "إقفال بالوفاء", en: "Settled by payment", done: settled, locked: voided },
      { ar: "التصعيد القانوني عند التعثر فقط", en: "Legal escalation only on default", done: overdue, locked: !overdue },
    ];
  }

  async function runNoteAction(action: "send" | "settle" | "void") {
    if (!selectedNote) {
      setActionMessage(txt(lang, "لا يوجد سند محدد.", "No note is selected."));
      return;
    }

    const noteId = getNoteValue(selectedNote, ["id", "noteId"]);
    if (!noteId) {
      setActionMessage(txt(lang, "لا يمكن تنفيذ الإجراء لأن معرف السند غير متوفر.", "Cannot run this action because the note ID is missing."));
      return;
    }

    const status = getNoteStatus(selectedNote);
    if (["SETTLED", "VOID", "CANCELLED", "CANCELED"].includes(status)) {
      setActionMessage(txt(lang, "لا يمكن تنفيذ الإجراء على سند مقفل أو ملغى.", "Cannot run this action on a settled or voided note."));
      return;
    }

    try {
      setBusyAction(action);
      setActionMessage(null);

      if (action === "send") {
        const debtorMobile =
          getNoteValue(selectedNote, ["debtorMobile", "mobile", "makerMobile", "phone"]) ||
          window.prompt(txt(lang, "أدخل رقم جوال المدين لإرسال رابط التوقيع:", "Enter debtor mobile number to send the signing link:")) ||
          "";

        if (!debtorMobile.trim()) {
          setActionMessage(txt(lang, "رقم الجوال مطلوب لإرسال رابط التوقيع.", "Mobile number is required to send the signing link."));
          return;
        }

        await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(noteId)}/debtor-signing/start`, {
          method: "POST",
          body: JSON.stringify({ debtorMobile, locale: lang }),
        });

        setActionMessage(txt(lang, "تم إرسال رابط التوقيع ورمز التحقق بنجاح.", "Signing link and OTP were sent successfully."));
      }

      if (action === "settle") {
        const reason = window.prompt(txt(lang, "أدخل مرجع أو سبب الإقفال بالوفاء:", "Enter settlement reference or reason:"));
        if (reason === null) return;

        await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(noteId)}/settle`, {
          method: "PATCH",
          body: JSON.stringify({
            reason: reason || "Settled by authorized user",
            amount: getNoteAmount(selectedNote),
            method: "manual",
          }),
        });

        setActionMessage(txt(lang, "تم إقفال السند بالوفاء وتحديث السجل.", "The note was settled and the register was updated."));
      }

      if (action === "void") {
        const reason = window.prompt(txt(lang, "أدخل سبب إلغاء السند:", "Enter reason for voiding the note:"));
        if (!reason) return;

        await apiJson<unknown>(`/api/modules/promissory-notes/${encodeURIComponent(noteId)}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason, method: "manual" }),
        });

        setActionMessage(txt(lang, "تم إلغاء السند وحفظ السبب في سجل التدقيق.", "The note was voided and the reason was saved to the audit trail."));
      }

      await loadNotes();
    } catch (actionError) {
      setActionMessage(actionError instanceof Error ? actionError.message : txt(lang, "تعذر تنفيذ الإجراء.", "Unable to complete the action."));
    } finally {
      setBusyAction(null);
    }
  }

  const selectedNoteIdForLinks = getNoteValue(selectedNote, ["id", "noteId"]);
  const selectedStatus = getNoteStatus(selectedNote);
  const timeline = buildTimeline(selectedNote);

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "تتبع حالة السند", "Note Status Tracking")}
        subtitle={txt(lang, "متابعة تشغيلية فعلية لدورة حياة السندات من قاعدة البيانات حتى السداد أو التصعيد.", "Operational tracking of database-backed notes from issuance to settlement or escalation.")}
      />

      <ShellCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[#073763]">{txt(lang, "مصدر البيانات", "Data Source")}</div>
            <div className="mt-1 text-xs text-slate-500">
              {txt(lang, "هذه الصفحة تقرأ السندات من API الفعلي ولا تستخدم بيانات وهمية.", "This page reads notes from the real API and does not use mock data.")}
            </div>
          </div>
          <button type="button" onClick={() => void loadNotes()} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {txt(lang, "تحديث", "Refresh")}
          </button>
        </div>

        {actionMessage ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{actionMessage}</div>
        ) : null}
      </ShellCard>

      <div className="grid grid-cols-[460px_1fr] gap-5">
        <ShellCard>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">{txt(lang, "السندات الفعلية النشطة", "Actual Active Notes")}</h2>
            <p className="mt-1 text-xs text-slate-500">{txt(lang, "القائمة أدناه تأتي من قاعدة البيانات عبر API.", "The list below is loaded from the database through the API.")}</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل السندات...", "Loading notes...")}</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-600">{error}</div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "لا توجد سندات فعلية في قاعدة البيانات.", "No database-backed notes found.")}</div>
          ) : (
            <div className="max-h-[560px] divide-y divide-slate-100 overflow-auto">
              {(operationalNotes.length ? operationalNotes : notes).map((note) => {
                const noteId = getNoteValue(note, ["id", "noteId"]);
                const noteNo = getNoteValue(note, ["noteNumber", "number", "promissoryNoteNumber"]) || noteId || "—";
                const debtor = getNoteValue(note, ["debtorName", "makerName", "patientName", "patientNameAr", "patientNameEn"]) || txt(lang, "مدين غير محدد", "Unknown debtor");
                const mrn = getNoteValue(note, ["mrn", "patientMrn", "medicalRecordNumber"]);
                const status = getNoteStatus(note);
                const isSelected = noteId === selectedNoteIdForLinks;

                return (
                  <button key={noteId || noteNo} type="button" onClick={() => setSelectedNoteId(noteId)} className={`block w-full px-5 py-4 text-start hover:bg-slate-50 ${isSelected ? "bg-blue-50" : ""}`}>
                    <div className="font-semibold text-slate-900">{debtor}</div>
                    <div className="mt-1 text-xs text-slate-500">{mrn ? mrn + " · " : ""}{noteNo}</div>
                    <div className="mt-2">
                      <StatusPill tone={status === "OVERDUE" ? "red" : status === "SETTLED" ? "green" : status === "VOID" ? "slate" : "blue"}>{status}</StatusPill>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ShellCard>

        <ShellCard className="p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#073763]">{txt(lang, "سجل الحالة التشغيلي", "Operational Lifecycle Timeline")}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedNote ? txt(lang, "السجل يتغير حسب السند المحدد وحالته الفعلية.", "Timeline changes based on the selected note and its actual status.") : txt(lang, "اختر سندًا من القائمة لعرض السجل.", "Select a note to display its lifecycle.")}
              </p>
            </div>

            {selectedNote ? (
              <StatusPill tone={selectedStatus === "OVERDUE" ? "red" : selectedStatus === "SETTLED" ? "green" : selectedStatus === "VOID" ? "slate" : "blue"}>{selectedStatus}</StatusPill>
            ) : null}
          </div>

          {selectedNote ? (
            <>
              <div className="mb-5 grid grid-cols-3 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <SummaryLine label={txt(lang, "رقم السند", "Note No.")} value={getNoteValue(selectedNote, ["noteNumber", "number", "promissoryNoteNumber"]) || selectedNoteIdForLinks || "—"} />
                <SummaryLine label={txt(lang, "المدين", "Debtor")} value={getNoteValue(selectedNote, ["debtorName", "makerName", "patientName", "patientNameAr", "patientNameEn"]) || "—"} />
                <SummaryLine label={txt(lang, "المبلغ", "Amount")} value={`${getNoteAmount(selectedNote)} SAR`} />
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {selectedNoteIdForLinks ? (
                  <>
                    <a href={`/api/modules/promissory-notes/${encodeURIComponent(selectedNoteIdForLinks)}/pdf?lang=${lang}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
                      {txt(lang, "عرض PDF", "View PDF")}
                    </a>
                    <a href={`/api/modules/promissory-notes/${encodeURIComponent(selectedNoteIdForLinks)}/pdf?lang=${lang}&download=1`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                      {txt(lang, "تحميل PDF", "Download PDF")}
                    </a>
                    <a href={`/modules/promissory-notes/${encodeURIComponent(selectedNoteIdForLinks)}/preview`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                      {txt(lang, "فتح السند", "Open Note")}
                    </a>
                  </>
                ) : null}

                <button type="button" onClick={() => void runNoteAction("send")} disabled={Boolean(busyAction) || ["SETTLED", "VOID", "CANCELLED", "CANCELED"].includes(selectedStatus)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {busyAction === "send" ? txt(lang, "جارٍ الإرسال...", "Sending...") : txt(lang, "إرسال / إعادة إرسال رابط التوقيع", "Send / Resend Signing Link")}
                </button>

                <button type="button" onClick={() => void runNoteAction("settle")} disabled={Boolean(busyAction) || ["SETTLED", "VOID", "CANCELLED", "CANCELED"].includes(selectedStatus)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {busyAction === "settle" ? txt(lang, "جارٍ الإقفال...", "Settling...") : txt(lang, "إقفال بالوفاء", "Settle")}
                </button>

                <button type="button" onClick={() => void runNoteAction("void")} disabled={Boolean(busyAction) || ["SETTLED", "VOID", "CANCELLED", "CANCELED"].includes(selectedStatus)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {busyAction === "void" ? txt(lang, "جارٍ الإلغاء...", "Voiding...") : txt(lang, "إلغاء السند", "Void Note")}
                </button>
              </div>

              <div className="space-y-5">
                {timeline.map((event) => (
                  <div key={event.en} className="grid grid-cols-[44px_1fr_120px] items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${event.done ? "border-emerald-200 bg-emerald-50" : event.locked ? "border-slate-200 bg-slate-50" : "border-blue-100 bg-blue-50"}`}>
                      {event.locked ? <Lock className="h-4 w-4 text-slate-400" /> : event.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Activity className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{txt(lang, event.ar, event.en)}</div>
                      <div className="text-xs text-slate-500">
                        {event.done ? txt(lang, "مكتمل بناءً على حالة السند", "Completed based on note status") : txt(lang, "بانتظار الإجراء", "Pending action")}
                      </div>
                    </div>
                    <StatusPill tone={event.done ? "green" : event.locked ? "slate" : "blue"}>
                      {event.done ? txt(lang, "مكتمل", "Completed") : event.locked ? txt(lang, "مقفل", "Locked") : txt(lang, "قادم", "Next")}
                    </StatusPill>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "لا يوجد سند محدد للمتابعة.", "No note is selected for tracking.")}</div>
          )}
        </ShellCard>
      </div>
    </div>
  );
}
function SupportSettings({ lang }: { lang: Lang }) {
  const cards = [
    { titleAr: "الإعدادات", titleEn: "Settings", bodyAr: "إدارة التنبيهات والقوالب وسجل التدقيق.", bodyEn: "Manage alerts, templates, and audit logs.", icon: Settings },
    { titleAr: "الدعم الفني", titleEn: "Technical Support", bodyAr: "فتح تذكرة دعم للنظام أو الرسائل.", bodyEn: "Open a ticket for system or messaging issues.", icon: Headphones },
    { titleAr: "طلب استشارة قانونية", titleEn: "Legal Consultation", bodyAr: "طلب رأي قانوني في الصياغة أو الحالة.", bodyEn: "Request legal advice for wording or case handling.", icon: Gavel },
    { titleAr: "الدليل التشغيلي", titleEn: "Operating Guide", bodyAr: "شرح خطوات بناء السند والتوثيق والمتابعة.", bodyEn: "Guidance for note building, evidence, and tracking.", icon: BookOpen },
  ];

  return (
    <div className="space-y-5">
      <PageTitle title={txt(lang, "المساعدة والإعدادات", "Support & Settings")} subtitle={txt(lang, "كل الدعم والإعدادات في مساحة واضحة وآمنة.", "All support and settings in a simple secure workspace.")} />
      <div className="grid grid-cols-4 gap-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <ShellCard key={c.titleEn} className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Icon className="h-8 w-8 text-[#073763]" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-[#073763]">{txt(lang, c.titleAr, c.titleEn)}</h3>
              <p className="mt-3 min-h-[60px] text-sm leading-6 text-slate-500">{txt(lang, c.bodyAr, c.bodyEn)}</p>
              <button className="mt-5 w-full rounded-lg bg-[#073763] px-4 py-3 text-sm font-bold text-white">
                {txt(lang, "فتح", "Open")}
              </button>
            </ShellCard>
          );
        })}
      </div>
    </div>
  );
}


const wathiqNoteRoles = [
  {
    code: "creator",
    ar: "منشئ السند",
    en: "Creator",
    departmentAr: "شؤون المرضى / المالية",
    departmentEn: "Patient Affairs / Finance",
    permissions: ["create", "edit_draft", "download_pdf"],
  },
  {
    code: "reviewer",
    ar: "مراجع السند",
    en: "Reviewer",
    departmentAr: "المطالبات / المالية",
    departmentEn: "Claims / Finance",
    permissions: ["review", "edit_draft", "download_pdf", "view_audit"],
  },
  {
    code: "issuer",
    ar: "مُصدر السند",
    en: "Issuer",
    departmentAr: "المالية / شؤون المرضى",
    departmentEn: "Finance / Patient Affairs",
    permissions: ["issue", "send_link", "resend_link", "download_pdf", "view_audit"],
  },
  {
    code: "finance",
    ar: "المالية",
    en: "Finance",
    departmentAr: "الإدارة المالية",
    departmentEn: "Finance Department",
    permissions: ["settle", "download_pdf", "view_audit"],
  },
  {
    code: "legal",
    ar: "الشؤون القانونية",
    en: "Legal",
    departmentAr: "الشؤون القانونية",
    departmentEn: "Legal Affairs",
    permissions: ["void", "review", "resend_link", "download_pdf", "view_audit"],
  },
  {
    code: "admin",
    ar: "مشرف النظام",
    en: "Admin",
    departmentAr: "إدارة النظام",
    departmentEn: "System Administration",
    permissions: ["create", "edit_draft", "review", "issue", "send_link", "resend_link", "settle", "void", "download_pdf", "view_audit", "manage_users"],
  },
  {
    code: "auditor",
    ar: "مدقق",
    en: "Auditor",
    departmentAr: "التدقيق والامتثال",
    departmentEn: "Audit & Compliance",
    permissions: ["download_pdf", "view_audit"],
  },
] as const;

const wathiqNotePermissionRows = [
  { key: "create", ar: "إنشاء مسودة", en: "Create Draft" },
  { key: "edit_draft", ar: "تعديل مسودة", en: "Edit Draft" },
  { key: "review", ar: "مراجعة السند", en: "Review Note" },
  { key: "issue", ar: "إصدار السند", en: "Issue Note" },
  { key: "send_link", ar: "إرسال رابط التوقيع", en: "Send Signing Link" },
  { key: "resend_link", ar: "إعادة إرسال الرابط / OTP", en: "Resend Link / OTP" },
  { key: "settle", ar: "إقفال بالوفاء", en: "Settle Note" },
  { key: "void", ar: "إلغاء السند", en: "Void Note" },
  { key: "download_pdf", ar: "تحميل PDF", en: "Download PDF" },
  { key: "view_audit", ar: "عرض سجل التدقيق", en: "View Audit Trail" },
  { key: "manage_users", ar: "إدارة المستخدمين", en: "Manage Users" },
] as const;

const wathiqNoteUsers = [
  {
    nameAr: "أحمد المالكي",
    nameEn: "Ahmed Al-Malki",
    email: "finance.user@imc.local",
    mobile: "9665XXXXXXXX",
    role: "finance",
    status: "active",
    lastActionAr: "أقفل سندًا بالوفاء",
    lastActionEn: "Settled a note",
  },
  {
    nameAr: "سارة الغامدي",
    nameEn: "Sarah Al-Ghamdi",
    email: "patient.affairs@imc.local",
    mobile: "9665XXXXXXXX",
    role: "creator",
    status: "active",
    lastActionAr: "أنشأت مسودة سند",
    lastActionEn: "Created a draft note",
  },
  {
    nameAr: "باسل تيم",
    nameEn: "Basel Tayem",
    email: "legal.affairs@imc.local",
    mobile: "9665XXXXXXXX",
    role: "legal",
    status: "active",
    lastActionAr: "راجع سبب إلغاء سند",
    lastActionEn: "Reviewed void reason",
  },
  {
    nameAr: "مدقق الامتثال",
    nameEn: "Compliance Auditor",
    email: "audit@imc.local",
    mobile: "9665XXXXXXXX",
    role: "auditor",
    status: "read_only",
    lastActionAr: "اطلع على سجل التدقيق",
    lastActionEn: "Viewed audit trail",
  },
];

function roleLabel(lang: Lang, roleCode: string) {
  const role = wathiqNoteRoles.find((item) => item.code === roleCode);
  return role ? txt(lang, role.ar, role.en) : roleCode;
}

function roleDepartment(lang: Lang, roleCode: string) {
  const role = wathiqNoteRoles.find((item) => item.code === roleCode);
  return role ? txt(lang, role.departmentAr, role.departmentEn) : "—";
}


const WATHIQNOTE_ROLE_CODE_MAP: Record<string, string> = {
  issuer: "NOTE_ISSUER",
  reviewer: "NOTE_REVIEWER",
  finance: "FINANCE",
  legal: "LEGAL",
  admin: "ADMIN",
  auditor: "AUDITOR",
};

const WATHIQNOTE_PERMISSION_KEY_MAP: Record<string, string> = {
  create: "promissory_notes.create",
  edit_draft: "promissory_notes.update",
  update: "promissory_notes.update",
  review: "promissory_notes.review",
  issue: "promissory_notes.issue",
  send_link: "promissory_notes.signature.send",
  resend_link: "promissory_notes.otp.resend",
  resend_otp: "promissory_notes.otp.resend",
  settle: "promissory_notes.settle",
  void: "promissory_notes.void",
  cancel: "promissory_notes.void",
  download_pdf: "promissory_notes.pdf.download",
  audit: "promissory_notes.audit.read",
  audit_read: "promissory_notes.audit.read",
  manage_users: "users.manage",
};
function roleHasPermission(roleCode: string, permission: string) {
  return Boolean(wathiqNoteRoles.find((role) => role.code === roleCode)?.permissions.includes(permission));
}

type TenantUserListItem = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  userType?: string | null;
  isActive?: boolean | null;
  status?: string | null;
  inviteStatus?: string | null;
  membershipRole?: string | null;
  invitedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  department?: string | null;
};

type TenantUsersApiResponse = {
  success?: boolean;
  users?: TenantUserListItem[];
  license?: {
    seatLimit?: number | null;
    activeUsers?: number | null;
    pendingUsers?: number | null;
    availableSeats?: number | null;
  };
};

function getApiArray<T>(payload: unknown, key: string): T[] {
  if (!payload || typeof payload !== "object") return [];
  const direct = (payload as Record<string, unknown>)[key];
  if (Array.isArray(direct)) return direct as T[];

  const data = (payload as Record<string, unknown>).data;
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>)[key])) {
    return (data as Record<string, unknown>)[key] as T[];
  }

  return [];
}

function getApiObject<T extends Record<string, unknown>>(payload: unknown, key: string): T | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as Record<string, unknown>)[key];
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as T;

  const data = (payload as Record<string, unknown>).data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>)[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as T;
  }

  return null;
}

function normalizeTenantRoleLabel(lang: Lang, role: string | null | undefined) {
  const normalized = (role || "").toLowerCase();
  if (normalized === "tenant_admin") return txt(lang, "مشرف الجهة", "Tenant Admin");
  if (normalized === "tenant_owner") return txt(lang, "مالك الجهة", "Tenant Owner");
  if (normalized === "viewer") return txt(lang, "مستخدم قراءة", "Viewer");
  if (normalized === "doctor") return txt(lang, "مدير / مراجع", "Manager / Reviewer");
  if (normalized === "admin") return txt(lang, "مشرف", "Admin");
  if (normalized === "manager") return txt(lang, "مدير", "Manager");
  if (normalized === "user") return txt(lang, "مستخدم", "User");
  return role || "—";
}

function UsersRolesScreen({ lang, showToast }: { lang: Lang; showToast: (toast: Toast) => void }) {
  const [users, setUsers] = useState<TenantUserListItem[]>([]);
  const [license, setLicense] = useState<TenantUsersApiResponse["license"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiJson<TenantUsersApiResponse>("/api/tenant/users");
      setUsers(Array.isArray(response.users) ? response.users : []);
      setLicense(response.license ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : txt(lang, "تعذر تحميل المستخدمين.", "Unable to load users."));
      setUsers([]);
      setLicense(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser() {
    const email = window.prompt(txt(lang, "أدخل بريد المستخدم:", "Enter user email:"));
    if (!email) return;

    const fullName = window.prompt(txt(lang, "أدخل اسم المستخدم:", "Enter full name:"));
    if (!fullName) return;

    const department = window.prompt(txt(lang, "أدخل القسم:", "Enter department:")) || "";

    const roleInput = window.prompt(
      txt(
        lang,
        "اختر الدور: user أو manager أو admin",
        "Choose role: user, manager, or admin",
      ),
      "user",
    ) || "user";

    setBusyAction("create-user");

    try {
      await apiJson<unknown>("/api/tenant/users/create", {
        method: "POST",
        body: JSON.stringify({
          email,
          fullName,
          department,
          role: roleInput,
        }),
      });

      showToast({
        type: "success",
        message: txt(lang, "تم إنشاء المستخدم وإرسال دعوة الدخول.", "User created and invitation sent."),
      });

      await loadUsers();
    } catch (createError) {
      showToast({
        type: "error",
        message: createError instanceof Error ? createError.message : txt(lang, "فشل إنشاء المستخدم.", "Failed to create user."),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function postUserAction(userId: string, action: "resend-invite" | "reset-password" | "reset-mfa" | "force-logout") {
    const labels = {
      "resend-invite": txt(lang, "إعادة الدعوة", "Resend invite"),
      "reset-password": txt(lang, "إعادة تعيين كلمة المرور", "Reset password"),
      "reset-mfa": txt(lang, "إعادة ضبط MFA", "Reset MFA"),
      "force-logout": txt(lang, "فرض تسجيل الخروج", "Force logout"),
    };

    setBusyAction(`${action}:${userId}`);

    try {
      await apiJson<unknown>(`/api/tenant/users/${encodeURIComponent(userId)}/${action}`, {
        method: "POST",
      });

      showToast({
        type: "success",
        message: `${labels[action]} — ${txt(lang, "تم تنفيذ الإجراء.", "Action completed.")}`,
      });

      await loadUsers();
    } catch (actionError) {
      showToast({
        type: "error",
        message: actionError instanceof Error ? actionError.message : txt(lang, "فشل تنفيذ الإجراء.", "Action failed."),
      });
    } finally {
      setBusyAction(null);
    }
  }

  const activeCount = license?.activeUsers ?? users.filter((user) => user.isActive).length;
  const pendingCount = license?.pendingUsers ?? users.filter((user) => !user.isActive).length;
  const availableSeats = license?.availableSeats;

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "إدارة المستخدمين", "Users & Roles")}
        subtitle={txt(
          lang,
          "إدارة حسابات مستخدمي WathiqNote وربط كل مستخدم بدور تشغيلي واضح داخل دورة حياة السند.",
          "Manage WathiqNote users and assign each user a clear operational role across the note lifecycle.",
        )}
      />

      <div className="grid grid-cols-4 gap-4">
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "المستخدمون النشطون", "Active Users")}</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{activeCount}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "بانتظار التفعيل", "Pending Users")}</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{pendingCount}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "المقاعد المتاحة", "Available Seats")}</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{availableSeats ?? "—"}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "وضع الربط", "Integration")}</div>
          <StatusPill tone={error ? "red" : "green"}>{error ? txt(lang, "مقيّد بالصلاحيات", "Permission gated") : txt(lang, "مرتبط بالـ API", "API connected")}</StatusPill>
        </ShellCard>
      </div>

      <ShellCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "مستخدمي الموديول", "Module Users")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {txt(lang, "تتم قراءة المستخدمين من قاعدة بيانات الجهة عبر Tenant Users API.", "Users are loaded from the tenant database through the Tenant Users API.")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadUsers()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
            >
              {txt(lang, "تحديث", "Refresh")}
            </button>
            <button
              type="button"
              disabled={busyAction === "create-user"}
              onClick={() => void createUser()}
              className="rounded-lg bg-[#073763] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busyAction === "create-user" ? txt(lang, "جارٍ الإضافة...", "Adding...") : txt(lang, "+ إضافة مستخدم", "+ Add User")}
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {txt(lang, "لا يمكن تحميل المستخدمين لهذا الحساب. يتطلب ذلك دور tenant_admin أو tenant_owner وصلاحية users.read.", "Unable to load users for this account. This requires tenant_admin or tenant_owner role and users.read permission.")}
            <div className="mt-2 font-mono text-xs">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل المستخدمين...", "Loading users...")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 text-start">{txt(lang, "المستخدم", "User")}</th>
                <th className="px-5 py-3 text-start">{txt(lang, "القسم", "Department")}</th>
                <th className="px-5 py-3 text-start">{txt(lang, "الدور", "Role")}</th>
                <th className="px-5 py-3 text-start">{txt(lang, "الحالة", "Status")}</th>
                <th className="px-5 py-3 text-start">{txt(lang, "آخر دخول", "Last Login")}</th>
                <th className="px-5 py-3 text-end">{txt(lang, "الإجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    {txt(lang, "لا توجد بيانات مستخدمين متاحة.", "No user records available.")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{user.fullName || "—"}</div>
                      <div className="text-xs text-slate-500">{user.email || "—"}</div>
                      <div className="text-xs text-slate-400">{user.id}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{user.department || "—"}</td>
                    <td className="px-5 py-4">
                      <StatusPill tone={(user.role || "").includes("admin") ? "blue" : "slate"}>
                        {normalizeTenantRoleLabel(lang, user.role)}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill tone={user.isActive ? "green" : "amber"}>
                        {user.isActive ? txt(lang, "نشط", "Active") : user.status || user.inviteStatus || txt(lang, "بانتظار", "Pending")}
                      </StatusPill>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString(lang === "ar" ? "ar-SA" : "en-US") : "—"}
                    </td>
                    <td className="px-5 py-4 text-end">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={() => void postUserAction(user.id, "resend-invite")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                          {txt(lang, "إعادة دعوة", "Invite")}
                        </button>
                        <button type="button" onClick={() => void postUserAction(user.id, "reset-password")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                          {txt(lang, "كلمة المرور", "Password")}
                        </button>
                        <button type="button" onClick={() => void postUserAction(user.id, "reset-mfa")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">
                          MFA
                        </button>
                        <button type="button" onClick={() => void postUserAction(user.id, "force-logout")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">
                          {txt(lang, "خروج", "Logout")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </ShellCard>
    </div>
  );
}

type TenantPermission = {
  id?: string;
  key?: string | null;
  code?: string | null;
  name?: string | null;
  module?: string | null;
  description?: string | null;
};

type TenantRoleApiItem = {
  id?: string;
  code?: string | null;
  name?: string | null;
  permissions?: Array<{
    id?: string;
    allowed?: boolean | null;
    permission?: TenantPermission | null;
  }> | null;
};

function getPermissionCode(permission: TenantPermission | null | undefined) {
  return permission?.key || permission?.code || permission?.name || permission?.id || "";
}

function PermissionMatrixScreen({ lang }: { lang: Lang }) {
  const [roles, setRoles] = useState<TenantRoleApiItem[]>([]);
  const [permissions, setPermissions] = useState<TenantPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRoles() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiJson<unknown>("/api/tenant/roles");
      const apiRoles = getApiArray<TenantRoleApiItem>(response, "roles");
      const apiPermissions = getApiArray<TenantPermission>(response, "permissions");

      setRoles(apiRoles);
      setPermissions(apiPermissions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : txt(lang, "تعذر تحميل الصلاحيات.", "Unable to load permissions."));
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  async function toggleRolePermissionByCode(roleCode: string | undefined, permissionKey: string | undefined, allowed: boolean) {
    if (!roleCode || !permissionKey) {
      setError(txt(lang, "تعذر تحديد الدور أو الصلاحية.", "Unable to identify role or permission."));
      return;
    }

    setError(null);

    try {
      await apiJson<unknown>("/api/tenant/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleCode,
          permissionKey,
          allowed,
        }),
      });

      await loadRoles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : txt(lang, "تعذر تحديث الصلاحية.", "Unable to update permission."));
    }
  }
  async function toggleRolePermission(roleId: string | undefined, permissionId: string | undefined, allowed: boolean) {
    if (!roleId || !permissionId) {
      setError(txt(lang, "تعذر تحديد الدور أو الصلاحية.", "Unable to identify role or permission."));
      return;
    }

    setError(null);

    try {
      await apiJson<unknown>("/api/tenant/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId,
          permissionId,
          allowed,
        }),
      });

      await loadRoles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : txt(lang, "تعذر تحديث الصلاحية.", "Unable to update permission."));
    }
  }

    const promissoryPermissions = permissions.filter((permission) => {
    const text = `${permission.module ?? ""} ${permission.key ?? ""} ${permission.code ?? ""} ${permission.name ?? ""}`.toLowerCase();
    return (
      text.includes("promissory") ||
      text.includes("note") ||
      text.includes("roles.") ||
      text.includes("users.") ||
      text.includes("tenant_admin")
    );
  });

  const visiblePermissions = promissoryPermissions.length > 0 ? promissoryPermissions : permissions;
  const hasLiveMatrix = roles.length > 0 && visiblePermissions.length > 0;

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "مصفوفة الصلاحيات", "Permission Matrix")}
        subtitle={txt(
          lang,
          "تحديد من يستطيع إنشاء السند، إصداره، إقفاله بالوفاء، إلغاؤه، أو الاطلاع على سجل التدقيق.",
          "Define who can create, issue, settle, void, and audit promissory notes.",
        )}
      />

      <ShellCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "صلاحيات قاعدة البيانات", "Database Permissions")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {txt(lang, "تتم قراءة الأدوار والصلاحيات من Tenant Roles API عند توفر صلاحية roles.read.", "Roles and permissions are loaded from the Tenant Roles API when roles.read is available.")}
            </p>
          </div>
          <button type="button" onClick={() => void loadRoles()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            {txt(lang, "تحديث", "Refresh")}
          </button>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {txt(lang, "تعذر تحميل مصفوفة قاعدة البيانات. سيتم عرض مصفوفة WathiqNote التشغيلية المقترحة أدناه.", "Unable to load the database matrix. The proposed WathiqNote operating matrix is shown below.")}
            <div className="mt-2 font-mono text-xs">{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل الأدوار والصلاحيات...", "Loading roles and permissions...")}</div>
        ) : hasLiveMatrix ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="sticky start-0 bg-slate-50 px-5 py-3 text-start">{txt(lang, "الصلاحية", "Permission")}</th>
                  {roles.map((role) => (
                    <th key={role.id || role.code || role.name || "role"} className="px-4 py-3 text-center">
                      {role.name || role.code || role.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePermissions.map((permission) => (
                  <tr key={permission.id || permission.code || permission.name || "permission"}>
                    <td className="sticky start-0 bg-white px-5 py-3">
                      <div className="font-bold text-slate-800">{permission.name || permission.code || permission.id}</div>
                      <div className="mt-1 text-xs text-slate-500">{permission.module || "—"}</div>
                    </td>
                    {roles.map((role) => {
                      const permissionCode = getPermissionCode(permission);
                      const allowed = Boolean(role.permissions?.some((item) => getPermissionCode(item.permission) === permissionCode));
                      return (
                        <td key={`${role.id}-${permissionCode}`} className="px-4 py-3 text-center">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${allowed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-300"}`}>
                            {allowed ? "✓" : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ShellCard>

      <ShellCard>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "مصفوفة WathiqNote التشغيلية", "WathiqNote Operating Matrix")}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {txt(lang, "هذه المصفوفة تحدد أفضل ممارسة تشغيلية للسندات داخل المستشفى حتى يتم عكسها بالكامل في قاعدة البيانات.", "This matrix defines the hospital operating best practice until fully reflected in the database permissions.")}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="sticky start-0 bg-slate-50 px-5 py-3 text-start">{txt(lang, "الإجراء", "Action")}</th>
                {wathiqNoteRoles.map((role) => (
                  <th key={role.code} className="px-4 py-3 text-center">{txt(lang, role.ar, role.en)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wathiqNotePermissionRows.map((permission) => (
                <tr key={permission.key}>
                  <td className="sticky start-0 bg-white px-5 py-3 font-bold text-slate-800">{txt(lang, permission.ar, permission.en)}</td>
                  {wathiqNoteRoles.map((role) => {
                    const roleCode = WATHIQNOTE_ROLE_CODE_MAP[role.code] ?? role.code;
                    const permissionKey = WATHIQNOTE_PERMISSION_KEY_MAP[permission.key] ?? permission.key;
                    const dbRole = roles.find((item) => item.code === roleCode);
                    const dbPermission = permissions.find((item) => getPermissionCode(item) === permissionKey);
                    const dbPermissionAllowed = Boolean(
                      dbRole?.permissions?.some(
                        (item) => getPermissionCode(item.permission) === permissionKey && item.allowed !== false,
                      ),
                    );
                    const allowed = dbRole && dbPermission ? dbPermissionAllowed : roleHasPermission(role.code, permission.key);

                    return (
                      <td key={`${role.code}-${permission.key}`} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => void toggleRolePermissionByCode(roleCode, permissionKey, !allowed)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition ${
                            allowed
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-slate-200 bg-slate-50 text-slate-300 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                          title={allowed ? txt(lang, "إلغاء الصلاحية", "Disable permission") : txt(lang, "تفعيل الصلاحية", "Enable permission")}
                        >
                          {allowed ? "✓" : "—"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ShellCard>

      <ShellCard className="p-5">
        <h3 className="text-lg font-bold text-[#073763]">{txt(lang, "قواعد إلزامية", "Mandatory Controls")}</h3>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="font-bold text-blue-900">{txt(lang, "الإصدار", "Issuance")}</div>
            <p className="mt-2 text-sm leading-6 text-blue-800">{txt(lang, "يقتصر على Issuer أو Admin بعد اكتمال البيانات والمراجعة.", "Restricted to Issuer or Admin after data completion and review.")}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="font-bold text-emerald-900">{txt(lang, "الوفاء", "Settlement")}</div>
            <p className="mt-2 text-sm leading-6 text-emerald-800">{txt(lang, "يقتصر على Finance أو Admin مع مرجع مالي وتاريخ سداد.", "Restricted to Finance or Admin with payment reference and settlement date.")}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
            <div className="font-bold text-rose-900">{txt(lang, "الإلغاء", "Void")}</div>
            <p className="mt-2 text-sm leading-6 text-rose-800">{txt(lang, "يقتصر على Legal أو Admin مع سبب إلزامي وسجل تدقيق.", "Restricted to Legal or Admin with mandatory reason and audit trail.")}</p>
          </div>
        </div>
      </ShellCard>
    </div>
  );
}

function DelegationsScreen({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "التفويضات والاعتمادات", "Delegations & Approvals")}
        subtitle={txt(lang, "إدارة حدود التفويض لاعتماد إصدار السندات أو إلغائها في الحالات الحساسة.", "Manage delegated authority for note issuance and sensitive void approvals.")}
      />

      <ShellCard className="p-5">
        <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "قواعد التفويض المقترحة", "Delegation Rules")}</h2>
        <div className="mt-4 grid gap-3">
          {[
            ["إصدار السند حتى 10,000 ريال", "Issuer فقط بعد المراجعة", "Issue notes up to SAR 10,000", "Issuer after review"],
            ["إصدار السند فوق 10,000 ريال", "Issuer + Finance Reviewer", "Issue notes above SAR 10,000", "Issuer + Finance Reviewer"],
            ["إلغاء سند غير موقع", "Legal أو Admin مع سبب", "Void unsigned note", "Legal or Admin with reason"],
            ["إلغاء سند موقع", "Legal + Finance approval", "Void signed note", "Legal + Finance approval"],
            ["إلغاء سند تم الوفاء به", "ممنوع", "Void settled note", "Not allowed"],
          ].map(([arRule, arApproval, enRule, enApproval]) => (
            <div key={enRule} className="grid grid-cols-[1fr_260px] rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <div className="font-bold text-slate-900">{txt(lang, arRule, enRule)}</div>
                <div className="mt-1 text-xs text-slate-500">{txt(lang, "قاعدة تشغيلية قابلة للربط لاحقًا بالـ API.", "Operational rule ready for API enforcement.")}</div>
              </div>
              <StatusPill tone={arApproval === "ممنوع" ? "red" : "blue"}>{txt(lang, arApproval, enApproval)}</StatusPill>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}

function AuditTrailScreen({ lang }: { lang: Lang }) {
  const rows = [
    ["09:42", "تم إصدار سند وإرسال رابط التوقيع", "Issued note and sent signing link", "issuer"],
    ["09:50", "تمت إعادة إرسال OTP", "Resent OTP", "issuer"],
    ["10:15", "تم إقفال سند بالوفاء", "Settled note", "finance"],
    ["10:22", "تم إلغاء سند مع سبب موثق", "Voided note with audited reason", "legal"],
  ];

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "سجل التدقيق", "Audit Trail")}
        subtitle={txt(lang, "عرض الأحداث الحساسة المتعلقة بإصدار السندات والوفاء والإلغاء.", "Review sensitive events related to issuance, settlement, and voiding.")}
      />

      <ShellCard>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "أحداث WathiqNote", "WathiqNote Events")}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map(([time, ar, en, role]) => (
            <div key={`${time}-${en}`} className="grid grid-cols-[90px_1fr_180px] items-center gap-4 px-5 py-4">
              <div className="text-sm font-bold text-slate-500">{time}</div>
              <div>
                <div className="font-bold text-slate-900">{txt(lang, ar, en)}</div>
                <div className="mt-1 text-xs text-slate-500">IP / Device / Tenant / Case reference retained</div>
              </div>
              <StatusPill tone={role === "legal" ? "red" : role === "finance" ? "green" : "blue"}>{roleLabel(lang, role)}</StatusPill>
            </div>
          ))}
        </div>
      </ShellCard>
    </div>
  );
}


type PromissoryNoteListItem = {
  id?: string;
  noteNumber?: string | null;
  note_number?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  debtorName?: string | null;
  debtor_name?: string | null;
  debtorNationalId?: string | null;
  debtor_national_id?: string | null;
  caseId?: string | null;
  case_id?: string | null;
  dueDate?: string | null;
  due_date?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

function getNoteNumber(note: PromissoryNoteListItem) {
  return note.noteNumber || note.note_number || note.id || "—";
}

function getNoteDebtor(note: PromissoryNoteListItem) {
  return note.debtorName || note.debtor_name || "—";
}

function getNoteAmount(note: PromissoryNoteListItem) {
  const value = Number(note.amount ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${note.currency || "SAR"}`;
}

function getNoteDate(value?: string | null, lang?: Lang) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US");
  } catch {
    return value;
  }
}

function statusTone(status?: string | null): "green" | "blue" | "amber" | "red" | "slate" {
  const normalized = (status || "").toUpperCase();
  if (normalized === "SETTLED" || normalized === "SIGNED") return "green";
  if (normalized === "ACTIVE") return "blue";
  if (normalized === "VOID" || normalized === "CANCELLED" || normalized === "CANCELED") return "red";
  if (normalized === "DRAFT" || normalized === "PENDING_SIGNATURE") return "amber";
  return "slate";
}

function statusLabel(lang: Lang, status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "SETTLED") return txt(lang, "تم الوفاء", "Settled");
  if (normalized === "VOID") return txt(lang, "ملغى", "Void");
  if (normalized === "ACTIVE") return txt(lang, "نشط", "Active");
  if (normalized === "DRAFT") return txt(lang, "مسودة", "Draft");
  if (normalized === "PENDING_SIGNATURE") return txt(lang, "بانتظار التوقيع", "Pending Signature");
  return status || "—";
}

function extractPromissoryNotes(payload: unknown): PromissoryNoteListItem[] {
  if (Array.isArray(payload)) return payload as PromissoryNoteListItem[];

  const keys = ["notes", "items", "promissoryNotes", "data"];
  for (const key of keys) {
    const array = getApiArray<PromissoryNoteListItem>(payload, key);
    if (array.length > 0) return array;
  }

  if (payload && typeof payload === "object") {
    const data = (payload as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as PromissoryNoteListItem[];
  }

  return [];
}

function usePromissoryNotes(lang: Lang) {
  const [notes, setNotes] = useState<PromissoryNoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadNotes() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiJson<unknown>("/api/modules/promissory-notes");
      setNotes(extractPromissoryNotes(response));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : txt(lang, "تعذر تحميل السندات.", "Unable to load notes."));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, []);

  return { notes, loading, error, loadNotes };
}

function NotesTable({
  lang,
  notes,
  emptyMessage,
}: {
  lang: Lang;
  notes: PromissoryNoteListItem[];
  emptyMessage: string;
}) {
  if (notes.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="px-5 py-3 text-start">{txt(lang, "رقم السند", "Note No.")}</th>
          <th className="px-5 py-3 text-start">{txt(lang, "المدين", "Debtor")}</th>
          <th className="px-5 py-3 text-start">{txt(lang, "الحالة", "Status")}</th>
          <th className="px-5 py-3 text-start">{txt(lang, "تاريخ الاستحقاق", "Due Date")}</th>
          <th className="px-5 py-3 text-end">{txt(lang, "المبلغ", "Amount")}</th>
          <th className="px-5 py-3 text-end">{txt(lang, "ملف السند", "PDF")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {notes.map((note, index) => (
          <tr key={note.id || getNoteNumber(note) || index}>
            <td className="px-5 py-4 font-bold text-[#073763]">{getNoteNumber(note)}</td>
            <td className="px-5 py-4 text-slate-700">{getNoteDebtor(note)}</td>
            <td className="px-5 py-4">
              <StatusPill tone={statusTone(note.status)}>{statusLabel(lang, note.status)}</StatusPill>
            </td>
            <td className="px-5 py-4 text-slate-600">{getNoteDate(note.dueDate || note.due_date, lang)}</td>
            <td className="px-5 py-4 text-end font-bold text-slate-900">{getNoteAmount(note)}</td>
            <td className="px-5 py-4">
              {note.id ? (
                <div className="flex justify-end gap-2">
                  <a
                    href={`/api/modules/promissory-notes/${encodeURIComponent(note.id)}/pdf?lang=${lang}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    {txt(lang, "عرض PDF", "View PDF")}
                  </a>
                  <a
                    href={`/api/modules/promissory-notes/${encodeURIComponent(note.id)}/pdf?lang=${lang}&download=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  >
                    {txt(lang, "تحميل", "Download")}
                  </a>
                </div>
              ) : (
                <span className="text-xs text-slate-400">{txt(lang, "غير متاح", "Unavailable")}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NotesArchiveScreen({ lang }: { lang: Lang }) {
  const { notes, loading, error, loadNotes } = usePromissoryNotes(lang);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredNotes = useMemo(() => {
    if (statusFilter === "ALL") return notes;
    return notes.filter((note) => (note.status || "").toUpperCase() === statusFilter);
  }, [notes, statusFilter]);

  const activeCount = notes.filter((note) => (note.status || "").toUpperCase() === "ACTIVE").length;
  const settledCount = notes.filter((note) => (note.status || "").toUpperCase() === "SETTLED").length;
  const voidCount = notes.filter((note) => (note.status || "").toUpperCase() === "VOID").length;
  const overdueCount = notes.filter((note) => (note.status || "").toUpperCase() === "OVERDUE").length;

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "أرشيف السندات", "Notes Archive")}
        subtitle={txt(
          lang,
          "سجل منظم لجميع السندات المنشأة والصادرة والمقفلة والملغاة مع روابط المتابعة وملفات PDF.",
          "Structured archive for all created, issued, settled, and voided notes with follow-up and PDF access.",
        )}
      />

      <div className="grid grid-cols-4 gap-4">
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "إجمالي السندات", "Total Notes")}</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{notes.length}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "نشطة", "Active")}</div>
          <div className="mt-3 text-3xl font-bold text-blue-700">{activeCount}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "مقفلة بالوفاء", "Settled")}</div>
          <div className="mt-3 text-3xl font-bold text-emerald-700">{settledCount}</div>
        </ShellCard>
        <ShellCard className="p-5">
          <div className="text-xs font-bold text-slate-500">{txt(lang, "ملغاة / متعثرة", "Void / Overdue")}</div>
          <div className="mt-3 text-3xl font-bold text-rose-700">{voidCount + overdueCount}</div>
        </ShellCard>
      </div>

      <ShellCard>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "سجل السندات", "Notes Register")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {txt(lang, "يعرض هذا السجل السندات المحفوظة في قاعدة البيانات حسب حالة دورة الحياة.", "This register displays database-backed notes by lifecycle status.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <option value="ALL">{txt(lang, "كل الحالات", "All Statuses")}</option>
              <option value="ACTIVE">{txt(lang, "نشط", "Active")}</option>
              <option value="PENDING_SIGNATURE">{txt(lang, "بانتظار التوقيع", "Pending Signature")}</option>
              <option value="SETTLED">{txt(lang, "مقفل بالوفاء", "Settled")}</option>
              <option value="VOID">{txt(lang, "ملغى", "Void")}</option>
              <option value="OVERDUE">{txt(lang, "متعثر", "Overdue")}</option>
            </select>

            <button
              type="button"
              onClick={() => void loadNotes()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {txt(lang, "تحديث", "Refresh")}
            </button>
          </div>
        </div>

        {error ? <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل الأرشيف...", "Loading archive...")}</div>
        ) : (
          <NotesTable
            lang={lang}
            notes={filteredNotes}
            emptyMessage={txt(lang, "لا توجد سندات مطابقة للفلتر الحالي.", "No notes match the current filter.")}
          />
        )}
      </ShellCard>
    </div>
  );
}
function TemplatesClausesScreen({ lang, showToast }: { lang: Lang; showToast: (toast: Toast) => void }) {
  void showToast;

  const templates = wathiqNoteProductionTemplates;

  const statusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      Draft: { ar: "\u0645\u0633\u0648\u062f\u0629", en: "Draft" },
      "Legal Review": { ar: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0642\u0627\u0646\u0648\u0646\u064a\u0629", en: "Legal Review" },
      "Finance Review": { ar: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0627\u0644\u064a\u0629", en: "Finance Review" },
      "Insurance Review": { ar: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u0623\u0645\u064a\u0646", en: "Insurance Review" },
      "DPO/IT Review": { ar: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0627\u0644\u062a\u0642\u0646\u064a\u0629", en: "DPO/IT Review" },
      Approved: { ar: "\u0645\u0639\u062a\u0645\u062f", en: "Approved" },
      Published: { ar: "\u0645\u0646\u0634\u0648\u0631", en: "Published" },
      Suspended: { ar: "\u0645\u0648\u0642\u0648\u0641", en: "Suspended" },
      Archived: { ar: "\u0645\u0624\u0631\u0634\u0641", en: "Archived" },
    };

    return labels[status]?.[lang] ?? status;
  };

  const statusClass = (status: string) => {
    if (status === "Published" || status === "Approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (status.includes("Review")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    if (status === "Suspended" || status === "Archived") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const approvedCount = templates.filter(
    (template) => template.status === "Approved" || template.status === "Published"
  ).length;

  const reviewCount = templates.filter((template) =>
    template.status.includes("Review")
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">
          {txt(lang, "\u0627\u0644\u0642\u0648\u0627\u0644\u0628 \u0648\u0627\u0644\u0628\u0646\u0648\u062f", "Templates and Clauses")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {txt(
            lang,
            "\u0625\u062f\u0627\u0631\u0629 \u0642\u0648\u0627\u0644\u0628 \u0627\u0644\u0633\u0646\u062f\u0627\u062a \u0648\u0627\u0644\u0625\u0642\u0631\u0627\u0631\u0627\u062a \u0648\u0627\u0644\u0628\u0646\u0648\u062f \u0627\u0644\u0642\u0627\u0646\u0648\u0646\u064a\u0629 \u0648\u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0627\u0644\u0645\u0639\u062a\u0645\u062f\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0635\u062f\u0627\u0631.",
            "Manage approved promissory note, acknowledgment, legal, and financial templates before issuance."
          )}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {txt(lang, "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0642\u0648\u0627\u0644\u0628", "Total templates")}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{templates.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {txt(lang, "\u0645\u0639\u062a\u0645\u062f / \u0645\u0646\u0634\u0648\u0631", "Approved / Published")}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{approvedCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {txt(lang, "\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629", "Under review")}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{reviewCount}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {txt(lang, "\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0642\u0648\u0627\u0644\u0628 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629", "Production Template Library")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {txt(
                lang,
                "\u0627\u0644\u0642\u0648\u0627\u0644\u0628 \u0623\u062f\u0646\u0627\u0647 \u0645\u062d\u0645\u0644\u0629 \u0645\u0646 WathiqNote Production Template Pack\u060c \u0648\u0644\u0627 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0638\u0647\u0631 \u0644\u0644\u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u0625\u0644\u0627 \u0639\u0646\u062f \u062d\u0627\u0644\u0629 Published.",
                "The templates below are loaded from the WathiqNote Production Template Pack and should only be selectable for issuance when Published."
              )}
            </p>
          </div>

          <button
            type="button"
            className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            {txt(lang, "+ \u0642\u0627\u0644\u0628 \u062c\u062f\u064a\u062f", "+ New template")}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-3 py-3">{txt(lang, "\u0627\u0644\u0643\u0648\u062f", "Code")}</th>
                <th className="px-3 py-3">{txt(lang, "\u0627\u0633\u0645 \u0627\u0644\u0642\u0627\u0644\u0628", "Template")}</th>
                <th className="px-3 py-3">{txt(lang, "\u0627\u0644\u062a\u0635\u0646\u064a\u0641", "Category")}</th>
                <th className="px-3 py-3">{txt(lang, "\u0627\u0644\u0645\u0627\u0644\u0643", "Owner")}</th>
                <th className="px-3 py-3">{txt(lang, "\u0627\u0644\u062d\u0627\u0644\u0629", "Status")}</th>
                <th className="px-3 py-3">{txt(lang, "\u062a\u0641\u0627\u0635\u064a\u0644", "Details")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {templates.map((template) => (
                <tr key={template.code} className="align-top">
                  <td className="whitespace-nowrap px-3 py-4 font-mono text-xs font-semibold text-slate-700">
                    {template.code}
                  </td>

                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-950">
                      {lang === "ar" ? template.nameAr : template.nameEn}
                    </p>
                    <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-slate-500">
                      {template.purposeAr}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-4 text-xs font-semibold text-slate-600">
                    {template.category}
                  </td>

                  <td className="px-3 py-4 text-xs text-slate-600">
                    {template.ownerDepartment}
                  </td>

                  <td className="px-3 py-4">
                    <span
                      className={
                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold " +
                        statusClass(template.status)
                      }
                    >
                      {statusLabel(template.status)}
                    </span>
                  </td>

                  <td className="px-3 py-4">
                    <details className="group max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                        {txt(lang, "\u0641\u062a\u062d", "Open")}
                      </summary>

                      <div className="mt-3 space-y-3 text-xs leading-6 text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {txt(lang, "\u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629", "Required approvals")}
                          </p>
                          <p>{template.requiredApprovals.join(" / ")}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {txt(lang, "\u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0625\u0644\u0632\u0627\u0645\u064a\u0629", "Required fields")}
                          </p>
                          <p>{template.requiredFields.join(", ")}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {txt(lang, "\u0627\u0644\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u062a\u0634\u063a\u064a\u0644\u064a\u0629", "Operational rule")}
                          </p>
                          <p>{template.operationalRuleAr}</p>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {txt(lang, "\u0627\u0644\u0646\u0635 \u0627\u0644\u0639\u0631\u0628\u064a", "Arabic clause")}
                          </p>
                          <p className="rounded-xl bg-white p-3 text-slate-700">
                            {template.clauseAr}
                          </p>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

}

function FinanceMonitoringScreen({ lang }: { lang: Lang }) {
  const { notes, loading, error, loadNotes } = usePromissoryNotes(lang);
  const financeNotes = notes.filter((note) => {
    const status = (note.status || "").toUpperCase();
    return status === "ACTIVE" || status === "PENDING_SIGNATURE" || status === "SETTLED";
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "متابعة المالية", "Finance Monitoring")}
        subtitle={txt(lang, "متابعة السندات النشطة والسندات التي تم الوفاء بها وربطها بالمراجع المالية.", "Track active and settled notes and connect them with finance references.")}
      />

      <ShellCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "سندات تحتاج متابعة مالية", "Notes Requiring Finance Follow-up")}</h2>
          <button type="button" onClick={() => void loadNotes()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            {txt(lang, "تحديث", "Refresh")}
          </button>
        </div>
        {error ? <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}
        {loading ? <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل السندات...", "Loading notes...")}</div> : (
          <NotesTable lang={lang} notes={financeNotes} emptyMessage={txt(lang, "لا توجد سندات مالية متاحة للعرض.", "No finance notes available.")} />
        )}
      </ShellCard>
    </div>
  );
}

function ClaimsMonitoringScreen({ lang }: { lang: Lang }) {
  const { notes, loading, error, loadNotes } = usePromissoryNotes(lang);
  const claimsNotes = notes.filter((note) => (note.status || "").toUpperCase() !== "VOID");

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "متابعة المطالبات", "Claims Monitoring")}
        subtitle={txt(lang, "متابعة السندات المرتبطة بالفواتير والمطالبات ومواقف التغطية.", "Track notes linked to invoices, claims, and coverage decisions.")}
      />

      <ShellCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "سندات مرتبطة بالمطالبات", "Claim-linked Notes")}</h2>
          <button type="button" onClick={() => void loadNotes()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            {txt(lang, "تحديث", "Refresh")}
          </button>
        </div>
        {error ? <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}
        {loading ? <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل السندات...", "Loading notes...")}</div> : (
          <NotesTable lang={lang} notes={claimsNotes} emptyMessage={txt(lang, "لا توجد سندات مرتبطة بالمطالبات.", "No claim-linked notes available.")} />
        )}
      </ShellCard>
    </div>
  );
}

function LegalEscalationScreen({ lang }: { lang: Lang }) {
  const { notes, loading, error, loadNotes } = usePromissoryNotes(lang);
  const escalationNotes = notes.filter((note) => {
    const status = (note.status || "").toUpperCase();
    return status === "ACTIVE" || status === "OVERDUE" || status === "VOID";
  });

  return (
    <div className="space-y-5">
      <PageTitle
        title={txt(lang, "التصعيد القانوني", "Legal Escalation")}
        subtitle={txt(lang, "متابعة الحالات المتعثرة أو الملغاة أو التي تحتاج مراجعة قانونية.", "Track overdue, voided, or legally sensitive notes.")}
      />

      <ShellCard>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#073763]">{txt(lang, "حالات تحتاج مراجعة قانونية", "Legal Review Queue")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {txt(lang, "التصعيد القانوني لا يظهر في رحلة إصدار السند إلا بعد وجود سبب تشغيلي أو مالي.", "Legal escalation is separated from issuance and appears only when operational or financial triggers exist.")}
            </p>
          </div>
          <button type="button" onClick={() => void loadNotes()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            {txt(lang, "تحديث", "Refresh")}
          </button>
        </div>
        {error ? <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}
        {loading ? <div className="p-8 text-center text-sm text-slate-500">{txt(lang, "جارٍ تحميل السندات...", "Loading notes...")}</div> : (
          <NotesTable lang={lang} notes={escalationNotes} emptyMessage={txt(lang, "لا توجد حالات تصعيد قانوني حاليًا.", "No legal escalation items currently.")} />
        )}
      </ShellCard>
    </div>
  );
}

function PlaceholderScreen({ lang, screen }: { lang: Lang; screen: Screen }) {
  const titles: Record<Screen, [string, string]> = {
    dashboard: ["لوحة التحكم", "Dashboard"],
    "patient-search": ["البحث عن المريض", "Patient Search"],
    "note-builder": ["بناء السند", "Note Builder"],
    "status-tracking": ["تتبع الحالة", "Status Tracking"],
    "notes-archive": ["أرشيف السندات", "Notes Archive"],
    "support-settings": ["المساعدة والإعدادات", "Support & Settings"],
    users: ["إدارة المستخدمين", "Users & Roles"],
    delegations: ["التفويضات والاعتمادات", "Delegations & Approvals"],
    "permission-matrix": ["مصفوفة الصلاحيات", "Permission Matrix"],
    templates: ["القوالب والبنود", "Templates & Clauses"],
    audit: ["سجل التدقيق", "Audit Trail"],
    "finance-monitoring": ["متابعة المالية", "Finance Monitoring"],
    "claims-monitoring": ["متابعة المطالبات", "Claims Monitoring"],
    "legal-escalation": ["التصعيد القانوني", "Legal Escalation"],
  };

  const title = txt(lang, titles[screen][0], titles[screen][1]);

  return (
    <div className="space-y-5">
      <PageTitle title={title} subtitle={txt(lang, "صفحة مخصصة ضمن نفس هوية واثق نوت.", "Dedicated page within the WathiqNote identity.")} />
      <ShellCard className="p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-50 p-3">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              {screen === "legal-escalation"
                ? txt(lang, "هذه الصفحة مخصصة للتصعيد بعد التعثر فقط، ولا تظهر داخل رحلة إصدار السند من البداية.", "This page is dedicated to post-default escalation only and does not appear inside the initial note issuance flow.")
                : txt(lang, "سيتم ربط هذه الصفحة لاحقًا بالبيانات الحقيقية والصلاحيات والـ API حسب الدور.", "This page will later be connected to live data, permissions, and APIs according to role.")}
            </p>
          </div>
        </div>
      </ShellCard>
    </div>
  );
}

export default function WathiqNoteWorkflowModule() {
  const [lang, setLang] = useState<Lang>("ar");
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [toast, setToast] = useState<Toast | null>(null);
  const dir = lang === "ar" ? "rtl" : "ltr";

  function showToast(nextToast: Toast) {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <main dir={dir} lang={lang} className="flex h-screen overflow-hidden bg-[#F3F6FA] text-slate-900">
      <ToastView toast={toast} />
      <LeftSidebar lang={lang} screen={screen} setScreen={setScreen} />
      <section className="flex min-w-0 flex-1 flex-col">
        <TopBar lang={lang} setLang={setLang} />
        <div className="flex-1 overflow-y-auto p-8">
          {screen === "dashboard" ? <Dashboard lang={lang} setScreen={setScreen} showToast={showToast} /> : null}
          {screen === "patient-search" ? <PatientSearchScreen lang={lang} setScreen={setScreen} showToast={showToast} /> : null}
          {screen === "note-builder" ? <NoteBuilder lang={lang} showToast={showToast} setScreen={setScreen} /> : null}
          {screen === "status-tracking" ? <StatusTracking lang={lang} /> : null}
          {screen === "notes-archive" ? <NotesArchiveScreen lang={lang} /> : null}
          {screen === "support-settings" ? <SupportSettings lang={lang} /> : null}
          {screen === "users" ? <UsersRolesScreen lang={lang} showToast={showToast} /> : null}
          {screen === "permission-matrix" ? <PermissionMatrixScreen lang={lang} /> : null}
          {screen === "delegations" ? <DelegationsScreen lang={lang} /> : null}
          {screen === "audit" ? <AuditTrailScreen lang={lang} /> : null}
          {screen === "templates" ? <TemplatesClausesScreen lang={lang} showToast={showToast} /> : null}
          {screen === "finance-monitoring" ? <FinanceMonitoringScreen lang={lang} /> : null}
          {screen === "claims-monitoring" ? <ClaimsMonitoringScreen lang={lang} /> : null}
          {screen === "legal-escalation" ? <LegalEscalationScreen lang={lang} /> : null}
          {!["dashboard", "patient-search", "note-builder", "status-tracking", "notes-archive", "support-settings", "users", "permission-matrix", "delegations", "audit", "templates", "finance-monitoring", "claims-monitoring", "legal-escalation"].includes(screen) ? (
            <PlaceholderScreen lang={lang} screen={screen} />
          ) : null}
        </div>
      </section>
    </main>
  );
}




