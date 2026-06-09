import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { StatusBadge } from "./components/StatusBadge";
import { DoctorSidebar, type DoctorScreen } from "./components/DoctorSidebar";
import { DoctorHeader } from "./components/DoctorHeader";
import { DoctorHome } from "./components/screens/DoctorHome";
import { CreateConsent } from "./components/screens/CreateConsent";
import { ConsentRecords } from "./components/screens/ConsentRecords";
import { ApprovedForms } from "./components/screens/ApprovedForms";
import { AnesthesiaQueue } from "./components/screens/AnesthesiaQueue";
import { PatientEducation } from "./components/screens/PatientEducation";
import { ComplianceReview } from "./components/screens/ComplianceReview";
import { AuditTrail } from "./components/screens/AuditTrail";
import { Settings } from "./components/screens/Settings";
import { PatientLink } from "./components/screens/PatientLink";

type Mode = "doctor" | "patient";

const screenTitles: Record<DoctorScreen, { en: string; ar: string; subEn?: string; subAr?: string }> = {
  "home": { en: "Doctor Workspace", ar: "مساحة الطبيب", subEn: "Tuesday, June 9, 2026", subAr: "الثلاثاء ٩ يونيو ٢٠٢٦" },
  "create-consent": { en: "Pending Consents", ar: "الموافقات المعلقة", subEn: "7 awaiting patient response", subAr: "٧ في انتظار رد المريض" },
  "consent-records": { en: "Consent Records", ar: "سجلات الموافقة", subEn: "Historical archive", subAr: "الأرشيف التاريخي" },
  "approved-forms": { en: "Approved Forms Library", ar: "مكتبة النماذج المعتمدة" },
  "anesthesia-queue": { en: "Anesthesia Queue", ar: "قائمة انتظار التخدير", subEn: "4 patients today", subAr: "٤ مرضى اليوم" },
  "patient-education": { en: "Patient Education Library", ar: "مكتبة تثقيف المريض" },
  "compliance-review": { en: "Smart Compliance Review", ar: "مراجعة الامتثال الذكية" },
  "audit-trail": { en: "Audit Trail", ar: "مسار التدقيق" },
  "settings": { en: "Settings & Support", ar: "الإعدادات والدعم" },
};


export default function App() {
  const [mode, setMode] = useState<Mode>("doctor");
  const [screen, setScreen] = useState<DoctorScreen>("home");
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [showCreateConsent, setShowCreateConsent] = useState(false);

  const isRTL = lang === "ar";

  const handleNavigate = (s: DoctorScreen) => {
    if (s === "home") {
      setShowCreateConsent(false);
      setScreen("home");
    } else {
      setScreen(s);
      setShowCreateConsent(false);
    }
  };

  const title = screenTitles[screen];

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#F7FBFC" }} dir={isRTL ? "rtl" : "ltr"}>
      {/* Top mode switcher */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: "#0D2035", borderColor: "#1a3550" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#19A978" }} />
            <span className="text-xs text-white/60 font-medium">WathiqCare Platform</span>
          </div>
          <span className="text-white/20 text-xs mx-1">·</span>
          <span className="text-xs text-white/40">Interactive Prototype · All 14 Screens</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#1a3550" }}>
            <button
              onClick={() => { setMode("doctor"); setScreen("home"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: mode === "doctor" ? "#2F90C7" : "transparent", color: "white" }}
            >
              <Monitor size={12} /> {isRTL ? "الطبيب" : "Doctor Workspace"}
            </button>
            <button
              onClick={() => setMode("patient")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: mode === "patient" ? "#19A978" : "transparent", color: "white" }}
            >
              <Smartphone size={12} /> {isRTL ? "المريض" : "Patient Link"}
            </button>
          </div>
        </div>
      </div>

      {/* Doctor workspace */}
      {mode === "doctor" && (
        <div className="flex flex-1 overflow-hidden">
          <DoctorSidebar
            active={showCreateConsent ? "home" : screen}
            onNavigate={s => {
              if (s === "home") {
                setShowCreateConsent(true);
                setScreen("home");
              } else {
                handleNavigate(s);
              }
            }}
            lang={lang}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <DoctorHeader
              title={
                showCreateConsent
                  ? (isRTL ? "إنشاء موافقة جديدة" : "Create New Consent")
                  : (isRTL ? title.ar : title.en)
              }
              subtitle={
                showCreateConsent
                  ? (isRTL ? "المريض: ليلى حسن · MRN-204871" : "Patient: Layla Hassan · MRN-204871")
                  : (isRTL ? title.subAr : title.subEn)
              }
              lang={lang}
              onToggleLang={() => setLang(l => l === "en" ? "ar" : "en")}
            />
            {showCreateConsent && <CreateConsent lang={lang} />}
            {!showCreateConsent && screen === "home" && <DoctorHome lang={lang} onNavigate={s => { if (s === "home") { setShowCreateConsent(true); } else handleNavigate(s); }} />}
            {!showCreateConsent && screen === "create-consent" && (
              <div className="flex-1 overflow-y-auto p-6" style={{ background: "#F7FBFC" }}>
                {/* Pending Consents list */}
                <div className="max-w-3xl space-y-3">
                  {[
                    { id: "WC-2026-0413", patientEn: "Omar Al-Rashid", patientAr: "عمر الراشد", procedureEn: "Cardiac Catheterization", procedureAr: "قسطرة قلبية", sentTime: "2h ago", status: "sent" as const },
                    { id: "WC-2026-0414", patientEn: "Mohammed Al-Qahtani", patientAr: "محمد القحطاني", procedureEn: "Hernia Repair", procedureAr: "إصلاح الفتق", sentTime: "5h ago", status: "sent" as const },
                    { id: "WC-2026-0415", patientEn: "Reem Al-Zahrani", patientAr: "ريم الزهراني", procedureEn: "Colonoscopy", procedureAr: "تنظير القولون", sentTime: "1d ago", status: "sent" as const },
                    { id: "WC-2026-0416", patientEn: "Hana Al-Shehri", patientAr: "هنا الشهري", procedureEn: "Knee Arthroscopy", procedureAr: "منظار الركبة", sentTime: "1d ago", status: "pending" as const },
                    { id: "WC-2026-0417", patientEn: "Tariq Mansoor", patientAr: "طارق منصور", procedureEn: "Gallbladder Removal", procedureAr: "استئصال المرارة", sentTime: "2d ago", status: "pending" as const },
                  ].map(r => {
                    return (
                      <div key={r.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border" style={{ borderColor: "#D8E8EF" }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#2F90C7,#12B7B5)" }}>
                          {(isRTL ? r.patientAr : r.patientEn).charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? r.patientAr : r.patientEn}</div>
                          <div className="text-sm" style={{ color: "#64798B" }}>{isRTL ? r.procedureAr : r.procedureEn}</div>
                          <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>{r.id} · {r.sentTime}</div>
                        </div>
                        <StatusBadge status={r.status} lang={lang} />
                        <button className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: "#EAF6FF", color: "#2F90C7" }}>
                          {isRTL ? "إعادة الإرسال" : "Resend"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {!showCreateConsent && screen === "consent-records" && <ConsentRecords lang={lang} />}
            {!showCreateConsent && screen === "approved-forms" && <ApprovedForms lang={lang} />}
            {!showCreateConsent && screen === "anesthesia-queue" && <AnesthesiaQueue lang={lang} />}
            {!showCreateConsent && screen === "patient-education" && <PatientEducation lang={lang} />}
            {!showCreateConsent && screen === "compliance-review" && <ComplianceReview lang={lang} />}
            {!showCreateConsent && screen === "audit-trail" && <AuditTrail lang={lang} />}
            {!showCreateConsent && screen === "settings" && <Settings lang={lang} />}
          </div>
        </div>
      )}

      {/* Patient link experience */}
      {mode === "patient" && <PatientLink />}
    </div>
  );
}
