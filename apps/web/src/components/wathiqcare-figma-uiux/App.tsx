"use client";

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
  "home": { en: "Doctor Workspace", ar: "Ù…Ø³Ø§Ø­Ø© Ø§Ù„Ø·Ø¨ÙŠØ¨", subEn: "Tuesday, June 9, 2026", subAr: "Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡ Ù© ÙŠÙˆÙ†ÙŠÙˆ Ù¢Ù Ù¢Ù¦" },
  "create-consent": { en: "Pending Consents", ar: "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©", subEn: "7 awaiting patient response", subAr: "Ù§ ÙÙŠ Ø§Ù†ØªØ¸Ø§Ø± Ø±Ø¯ Ø§Ù„Ù…Ø±ÙŠØ¶" },
  "consent-records": { en: "Consent Records", ar: "Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©", subEn: "Historical archive", subAr: "Ø§Ù„Ø£Ø±Ø´ÙŠÙ Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠ" },
  "approved-forms": { en: "Approved Forms Library", ar: "Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©" },
  "anesthesia-queue": { en: "Anesthesia Queue", ar: "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®Ø¯ÙŠØ±", subEn: "4 patients today", subAr: "Ù¤ Ù…Ø±Ø¶Ù‰ Ø§Ù„ÙŠÙˆÙ…" },
  "patient-education": { en: "Patient Education Library", ar: "Ù…ÙƒØªØ¨Ø© ØªØ«Ù‚ÙŠÙ Ø§Ù„Ù…Ø±ÙŠØ¶" },
  "compliance-review": { en: "Smart Compliance Review", ar: "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø§Ù„Ø°ÙƒÙŠØ©" },
  "audit-trail": { en: "Audit Trail", ar: "Ù…Ø³Ø§Ø± Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚" },
  "settings": { en: "Settings & Support", ar: "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ø¯Ø¹Ù…" },
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
              <Monitor size={12} /> {isRTL ? "Ø§Ù„Ø·Ø¨ÙŠØ¨" : "Doctor Workspace"}
            </button>
            <button
              onClick={() => setMode("patient")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: mode === "patient" ? "#19A978" : "transparent", color: "white" }}
            >
              <Smartphone size={12} /> {isRTL ? "Ø§Ù„Ù…Ø±ÙŠØ¶" : "Patient Link"}
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
                  ? (isRTL ? "Ø¥Ù†Ø´Ø§Ø¡ Ù…ÙˆØ§ÙÙ‚Ø© Ø¬Ø¯ÙŠØ¯Ø©" : "Create New Consent")
                  : (isRTL ? title.ar : title.en)
              }
              subtitle={
                showCreateConsent
                  ? (isRTL ? "Ø§Ù„Ù…Ø±ÙŠØ¶: Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù† · MRN-204871" : "Patient: Layla Hassan · MRN-204871")
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
                    { id: "WC-2026-0413", patientEn: "Omar Al-Rashid", patientAr: "Ø¹Ù…Ø± Ø§Ù„Ø±Ø§Ø´Ø¯", procedureEn: "Cardiac Catheterization", procedureAr: "Ù‚Ø³Ø·Ø±Ø© Ù‚Ù„Ø¨ÙŠØ©", sentTime: "2h ago", status: "sent" as const },
                    { id: "WC-2026-0414", patientEn: "Mohammed Al-Qahtani", patientAr: "Ù…Ø­Ù…Ø¯ Ø§Ù„Ù‚Ø­Ø·Ø§Ù†ÙŠ", procedureEn: "Hernia Repair", procedureAr: "Ø¥ØµÙ„Ø§Ø­ Ø§Ù„ÙØªÙ‚", sentTime: "5h ago", status: "sent" as const },
                    { id: "WC-2026-0415", patientEn: "Reem Al-Zahrani", patientAr: "Ø±ÙŠÙ… Ø§Ù„Ø²Ù‡Ø±Ø§Ù†ÙŠ", procedureEn: "Colonoscopy", procedureAr: "ØªÙ†Ø¸ÙŠØ± Ø§Ù„Ù‚ÙˆÙ„ÙˆÙ†", sentTime: "1d ago", status: "sent" as const },
                    { id: "WC-2026-0416", patientEn: "Hana Al-Shehri", patientAr: "Ù‡Ù†Ø§ Ø§Ù„Ø´Ù‡Ø±ÙŠ", procedureEn: "Knee Arthroscopy", procedureAr: "Ù…Ù†Ø¸Ø§Ø± Ø§Ù„Ø±ÙƒØ¨Ø©", sentTime: "1d ago", status: "pending" as const },
                    { id: "WC-2026-0417", patientEn: "Tariq Mansoor", patientAr: "Ø·Ø§Ø±Ù‚ Ù…Ù†ØµÙˆØ±", procedureEn: "Gallbladder Removal", procedureAr: "Ø§Ø³ØªØ¦ØµØ§Ù„ Ø§Ù„Ù…Ø±Ø§Ø±Ø©", sentTime: "2d ago", status: "pending" as const },
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
                          {isRTL ? "Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„" : "Resend"}
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



