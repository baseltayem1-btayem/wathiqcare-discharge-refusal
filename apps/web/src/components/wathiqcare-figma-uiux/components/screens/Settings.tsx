"use client";

import { useState } from "react";
import { Settings as SettingsIcon, User, Bell, Shield, Globe, HelpCircle, MessageSquare, Phone, Mail, ChevronRight, Check } from "lucide-react";

interface Props { lang: "en" | "ar" }

export function Settings({ lang }: Props) {
  const [notifConsent, setNotifConsent] = useState(true);
  const [notifCompliance, setNotifCompliance] = useState(true);
  const [notifExpiry, setNotifExpiry] = useState(false);
  const [langPref, setLangPref] = useState<"en" | "ar">(lang);
  const isRTL = lang === "ar";

  const Toggle = ({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) => (
    <button onClick={() => setOn(!on)} className="w-11 h-6 rounded-full transition-all flex items-center" style={{ background: on ? "#2F90C7" : "#D8E8EF", padding: "2px" }}>
      <div className="w-5 h-5 rounded-full bg-white shadow transition-all" style={{ transform: on ? "translateX(20px)" : "translateX(0)" }} />
    </button>
  );

  const sections = [
    {
      titleEn: "Profile", titleAr: "Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ", icon: User, color: "#2F90C7",
      items: [
        { labelEn: "Full Name", labelAr: "Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„", val: isRTL ? "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" : "Dr. Ahmad Khalil", editable: true },
        { labelEn: "Specialty", labelAr: "Ø§Ù„ØªØ®ØµØµ", val: isRTL ? "Ø¬Ø±Ø§Ø­ / Ø§Ù„Ø¹Ù†Ø§ÙŠØ© Ø§Ù„Ù…Ø±ÙƒØ²Ø©" : "Surgeon / ICU", editable: true },
        { labelEn: "Hospital", labelAr: "Ø§Ù„Ù…Ø³ØªØ´ÙÙ‰", val: isRTL ? "Ù…Ø³ØªØ´ÙÙ‰ Ø§Ù„Ù…Ù„Ùƒ Ø¹Ø¨Ø¯Ø§Ù„Ø¹Ø²ÙŠØ²" : "King Abdulaziz Hospital", editable: false },
        { labelEn: "Employee ID", labelAr: "Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¸Ù", val: "DOC-20847", editable: false },
      ]
    },
    {
      titleEn: "Security", titleAr: "Ø§Ù„Ø£Ù…Ø§Ù†", icon: Shield, color: "#19A978",
      items: [
        { labelEn: "Two-Factor Authentication", labelAr: "Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ø«Ù†Ø§Ø¦ÙŠ", val: isRTL ? "Ù…ÙØ¹Ù‘Ù„" : "Enabled", editable: false },
        { labelEn: "Session Timeout", labelAr: "Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¬Ù„Ø³Ø©", val: "30 min", editable: true },
        { labelEn: "IP Whitelist", labelAr: "Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¨ÙŠØ¶Ø§Ø¡", val: isRTL ? "Ù£ Ø¹Ù†Ø§ÙˆÙŠÙ†" : "3 IPs", editable: true },
      ]
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "#F7FBFC" }}>
      <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
        {isRTL ? "Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ø¯Ø¹Ù…" : "Settings & Support"}
      </h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Profile & Security */}
        <div className="col-span-2 space-y-4">
          {sections.map(sec => (
            <div key={sec.titleEn} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E8EF" }}>
              <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: sec.color + "18" }}>
                  <sec.icon size={14} style={{ color: sec.color }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? sec.titleAr : sec.titleEn}</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#F7FBFC" }}>
                {sec.items.map(item => (
                  <div key={item.labelEn} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "#102A43" }}>{isRTL ? item.labelAr : item.labelEn}</div>
                      <div className="text-sm" style={{ color: "#64798B" }}>{item.val}</div>
                    </div>
                    {item.editable && (
                      <button className="text-xs font-semibold" style={{ color: "#2F90C7" }}>
                        {isRTL ? "ØªØ¹Ø¯ÙŠÙ„" : "Edit"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Notifications */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E8EF" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#D9A93B18" }}>
                <Bell size={14} style={{ color: "#D9A93B" }} />
              </div>
              <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? "Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª" : "Notifications"}</span>
            </div>
            <div className="divide-y" style={{ borderColor: "#F7FBFC" }}>
              {[
                { labelEn: "Consent signed by patient", labelAr: "ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø±ÙŠØ¶ Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©", val: notifConsent, set: setNotifConsent },
                { labelEn: "Compliance issues detected", labelAr: "Ø§ÙƒØªØ´Ø§Ù Ù…Ø´ÙƒÙ„Ø§Øª Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„", val: notifCompliance, set: setNotifCompliance },
                { labelEn: "Consent link expiry warning", labelAr: "ØªØ­Ø°ÙŠØ± Ø§Ù†ØªÙ‡Ø§Ø¡ ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø±Ø§Ø¨Ø·", val: notifExpiry, set: setNotifExpiry },
              ].map(n => (
                <div key={n.labelEn} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm" style={{ color: "#102A43" }}>{isRTL ? n.labelAr : n.labelEn}</span>
                  <Toggle on={n.val} setOn={n.set} />
                </div>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E8EF" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#12B7B518" }}>
                <Globe size={14} style={{ color: "#12B7B5" }} />
              </div>
              <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? "Ø§Ù„Ù„ØºØ©" : "Language"}</span>
            </div>
            <div className="flex gap-3 p-5">
              {(["en", "ar"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLangPref(l)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: langPref === l ? "#2F90C7" : "#D8E8EF",
                    background: langPref === l ? "#EAF6FF" : "white",
                    color: langPref === l ? "#2F90C7" : "#64798B"
                  }}
                >
                  {langPref === l && <Check size={13} />}
                  {l === "en" ? "English (LTR)" : "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (RTL)"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E8EF" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#6B5CE718" }}>
                <HelpCircle size={14} style={{ color: "#6B5CE7" }} />
              </div>
              <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? "Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„ÙÙ†ÙŠ" : "Support"}</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                { icon: MessageSquare, en: "Live Chat", ar: "Ø§Ù„Ø¯Ø±Ø¯Ø´Ø© Ø§Ù„Ø­ÙŠØ©", subEn: "Response < 2 min", subAr: "Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø£Ù‚Ù„ Ù…Ù† Ø¯Ù‚ÙŠÙ‚ØªÙŠÙ†", color: "#2F90C7" },
                { icon: Phone, en: "Call Support", ar: "Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„Ù‡Ø§ØªÙÙŠ", subEn: "800-WATHIQ-1", subAr: "800-WATHIQ-1", color: "#19A978" },
                { icon: Mail, en: "Email", ar: "Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ", subEn: "support@wathiqcare.com", subAr: "support@wathiqcare.com", color: "#D9A93B" },
              ].map(s => (
                <button key={s.en} className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm" style={{ borderColor: "#D8E8EF" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color + "15" }}>
                    <s.icon size={15} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "#102A43" }}>{isRTL ? s.ar : s.en}</div>
                    <div className="text-xs" style={{ color: "#64798B" }}>{isRTL ? s.subAr : s.subEn}</div>
                  </div>
                  <ChevronRight size={13} style={{ color: "#64798B" }} />
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: "linear-gradient(135deg,#123B5C,#2F90C7)", boxShadow: "0 4px 20px #2F90C730" }}>
            <SettingsIcon size={20} color="white" className="mb-2 opacity-70" />
            <div className="text-sm font-bold text-white mb-1">WathiqCare v2.4.1</div>
            <div className="text-xs text-white/60">
              {isRTL ? "Ù…Ø±Ø®Øµ Ù„Ù…Ø³ØªØ´ÙÙ‰ Ø§Ù„Ù…Ù„Ùƒ Ø¹Ø¨Ø¯Ø§Ù„Ø¹Ø²ÙŠØ²" : "Licensed to King Abdulaziz Hospital"}
            </div>
            <div className="text-xs text-white/50 mt-1">
              {isRTL ? "Ù…Ø¹ØªÙ…Ø¯ HIPAA Â· NCA Â· MOH" : "HIPAA Â· NCA Â· MOH Certified"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


