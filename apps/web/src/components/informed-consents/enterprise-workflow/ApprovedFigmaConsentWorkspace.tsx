import Link from "next/link";
"use client";


const WATHIQCARE_API_BASE = "/api/modules/informed-consents";
import React from "react";
async function wathiqcareApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${WATHIQCARE_API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await response.text().catch(()=>"") || `API failed: ${response.status}`);
  return response.json();
}

function useWathiqCareEnterpriseBridge() {
  const [language,setLanguage]=React.useState<"en"|"ar">("en");
  const [dashboardStats,setDashboardStats]=React.useState<any>(null);
  const [apiBusy,setApiBusy]=React.useState(false);
  const [apiError,setApiError]=React.useState<string|null>(null);

  const refreshDashboard=React.useCallback(async()=>{
    setApiBusy(true); setApiError(null);
    try{setDashboardStats(await wathiqcareApi("/dashboard"))}
    catch(e:any){setApiError(e?.message||"Cannot connect to backend")}
    finally{setApiBusy(false)}
  },[]);

  React.useEffect(()=>{refreshDashboard()},[refreshDashboard]);

  const toggleLanguage=React.useCallback(()=>{
    setLanguage(current=>{const next=current==="en"?"ar":"en";
      if(typeof document!=="undefined"){document.documentElement.lang=next;document.documentElement.dir=next==="ar"?"rtl":"ltr"}
      return next
    });
  },[]);

  const openNewConsent=React.useCallback(async()=>{
    setApiBusy(true); setApiError(null);
    try{const created=await wathiqcareApi("/documents",{method:"POST",body:JSON.stringify({source:"physician-dashboard"})});
      if(created?.id) window.location.href=`/modules/informed-consents/documents/${created.id}`; else await refreshDashboard();
    }catch(e:any){setApiError(e?.message||"Cannot create consent");}finally{setApiBusy(false);}
  },[refreshDashboard]);

  const selectForPhysicianReview=React.useCallback(async(templateId?:string)=>{
    setApiBusy(true); setApiError(null);
    try{const created=await wathiqcareApi("/documents",{method:"POST",body:JSON.stringify({templateId,source:"imc-approved-library"})});
      if(created?.id) window.location.href=`/modules/informed-consents/documents/${created.id}/review`; else await refreshDashboard();
    }catch(e:any){setApiError(e?.message||"Cannot select consent");}finally{setApiBusy(false);}
  },[refreshDashboard]);

  return {language,dashboardStats,apiBusy,apiError,refreshDashboard,toggleLanguage,openNewConsent,selectForPhysicianReview};
}
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
  lang?: "en" | "ar";
};

export default function ApprovedFigmaConsentWorkspace({
  auth,
  lang = "en",
}: ApprovedFigmaConsentWorkspaceProps) {
  void auth;

  const isArabic = lang === "ar";

  const navItems = [
    { label: "Dashboard", labelAr: "لوحة التحكم", icon: Grid2X2, active: true, badge: "3" },
    { label: "Physician Workflow", labelAr: "رحلة الطبيب", icon: Stethoscope },
    { label: "Patient Search", labelAr: "البحث عن المريض", icon: Search },
    { label: "Consent Library", labelAr: "مكتبة الموافقات", icon: Library },
    { label: "Status Tracking", labelAr: "التتبع والسجل", icon: Activity },
    { label: "Settings", labelAr: "الإعدادات", icon: Settings },
  ];

  const stats = [
    {
      label: "Pending Consents",
      labelAr: "موافقات معلقة",
      value: "7",
      tone: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-300",
      icon: AlertCircle,
    },
    {
      label: "Draft Consents",
      labelAr: "مسودات",
      value: "3",
      tone: "text-slate-600",
      bg: "bg-slate-50",
      border: "border-[#D8DCE3]",
      icon: FileText,
    },
    {
      label: "Sent / Awaiting",
      labelAr: "مرسل / بانتظار",
      value: "12",
      tone: "text-[#4B9CD3]",
      bg: "bg-[#EBF3FB]",
      border: "border-[#D8DCE3]",
      icon: Bell,
    },
    {
      label: "Completed Today",
      labelAr: "مكتملة اليوم",
      value: "5",
      tone: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-[#D8DCE3]",
      icon: CheckCircle2,
    },
  ];

  const readinessItems = [
    { label: "Patient selected", labelAr: "تم اختيار المريض", done: true },
    { label: "Encounter selected", labelAr: "تم اختيار الزيارة", done: true },
    { label: "Template selected", labelAr: "تم اختيار النموذج", done: true },
    { label: "IMC approved template", labelAr: "نموذج معتمد من IMC", done: true },
    { label: "Procedure details completed", labelAr: "اكتمال بيانات الإجراء", done: true },
    { label: "Anesthesia decision", labelAr: "قرار التخدير", done: true },
    { label: "Education package", labelAr: "حزمة التثقيف", done: true },
    { label: "Draft PDF generated", labelAr: "مسودة PDF", done: false },
    { label: "Patient link sent", labelAr: "رابط المريض", done: false },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#F4F7FB] text-[#002B5C]"
    >
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 bg-[#002B5C] text-white xl:flex xl:flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A13B] text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">WathiqCare</div>
                <div className="text-xs text-[#C9A13B]">Clinical Consent Platform</div>
              </div>
            </div>
          </div>

          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <User className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Dr. Khalid Al-Qahtani</div>
                <div className="text-xs text-white/60">General Surgery · FACS</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Clinical Workspace
            </div>

            <div className="space-y-1">
              {navItems.slice(0, 5).map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm transition ${
                      item.active
                        ? "bg-[#174F8A] text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>
                        <span className="block font-semibold">
                          {isArabic ? item.labelAr : item.label}
                        </span>
                      </span>
                    </span>

                    {item.badge ? (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 mb-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              System
            </div>

            <div className="space-y-1">
              {navItems.slice(5).map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    {isArabic ? item.labelAr : item.label}
                  </button>
                );
              })}

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {isArabic ? "تسجيل الخروج" : "Sign Out"}
              </button>
            </div>
          </nav>

          <div className="border-t border-white/10 px-5 py-4 text-xs text-white/50">
            <div className="mb-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              PDPL · HIPAA · HL7 FHIR
            </div>
            <div>WathiqCare v2.4.1</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-[#D8DCE3] bg-white">
            <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-7 py-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
                <span>Department: General Surgery</span>
                <span>·</span>
                <span>28 May 2026</span>
                <span>·</span>
                <span>Session: 2h 14m</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-[#D8DCE3] bg-white p-1">
                  <button type="button" onClick={toggleLanguage} className="rounded bg-[#002B5C] px-3 py-1.5 text-xs font-bold text-white"><Languages className="h-4 w-4" aria-hidden="true" /> {language==="en"?"EN":"ع"}</button>
                </div>

                <button className="relative rounded-lg border border-[#D8DCE3] bg-white p-2 text-[#002B5C]">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                </button>

                <div className="text-sm text-[#002B5C]">
                  Physician Portal / <span className="font-semibold">Dashboard</span>
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

              <button className="rounded-lg bg-[#C9A13B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
                + {isArabic ? "موافقة جديدة" : "New Consent"}
              </button>
            </section>

            <section className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    3 consents have incomplete mandatory disclosures — surgery cannot proceed until resolved.
                  </span>
                </div>
                <button className="text-sm font-semibold underline">View All</button>
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
                      ? "تمت إضافة مكتبة الموافقات التي تم تطويرها دون إلغاء التصميم المعتمد."
                      : "The approved consent library has been added without removing the approved Figma design."}
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
                      <div className="text-4xl font-bold text-[#002B5C]">88%</div>
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
                            item.done
                              ? "text-emerald-600"
                              : "text-slate-400"
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
                      IMC approved PDF matched, but runtime template mapping requires verification.
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      Draft PDF and patient link remain gated until readiness is complete.
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






