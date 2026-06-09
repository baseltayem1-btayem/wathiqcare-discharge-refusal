"use client";

import { Activity, Download, Filter, Lock, User, FileText, Send, Eye, CheckSquare } from "lucide-react";

interface Props { lang: "en" | "ar" }

const events = [
  { id: "EVT-0841", time: "09:14:32", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„", actionEn: "Consent signed by patient â€” Layla Hassan", actionAr: "ØªÙ… ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ù† Ø§Ù„Ù…Ø±ÙŠØ¶Ø© â€” Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù†", typeEn: "Signature", typeAr: "ØªÙˆÙ‚ÙŠØ¹", icon: CheckSquare, color: "#19A978", ip: "192.168.1.45", deviceEn: "Mobile Safari / iOS", deviceAr: "Ù…ÙˆØ¨Ø§ÙŠÙ„ Ø³ÙØ§Ø±ÙŠ / iOS" },
  { id: "EVT-0840", time: "08:57:11", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„", actionEn: "Secure link sent via SMS to +966 055 123 4567", actionAr: "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¢Ù…Ù† Ø¹Ø¨Ø± SMS Ø¥Ù„Ù‰ +966 055 123 4567", typeEn: "Link Sent", typeAr: "Ø¥Ø±Ø³Ø§Ù„ Ø±Ø§Ø¨Ø·", icon: Send, color: "#2F90C7", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "ÙƒØ±ÙˆÙ… / ÙˆÙŠÙ†Ø¯ÙˆØ² Ù¡Ù¡" },
  { id: "EVT-0839", time: "08:47:00", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„", actionEn: "Consent form created â€” Appendectomy (WC-2026-0412)", actionAr: "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© â€” Ø§Ø³ØªØ¦ØµØ§Ù„ Ø§Ù„Ø²Ø§Ø¦Ø¯Ø© (WC-2026-0412)", typeEn: "Form Created", typeAr: "Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù…ÙˆØ°Ø¬", icon: FileText, color: "#6B5CE7", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "ÙƒØ±ÙˆÙ… / ÙˆÙŠÙ†Ø¯ÙˆØ² Ù¡Ù¡" },
  { id: "EVT-0838", time: "08:32:15", date: "09 Jun 2026", actorEn: "System", actorAr: "Ø§Ù„Ù†Ø¸Ø§Ù…", actionEn: "Patient OTP verified â€” Layla Hassan (MRN-204871)", actionAr: "ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† OTP Ù„Ù„Ù…Ø±ÙŠØ¶Ø© â€” Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù† (MRN-204871)", typeEn: "OTP Verified", typeAr: "Ø§Ù„ØªØ­Ù‚Ù‚ OTP", icon: Lock, color: "#12B7B5", ip: "Mobile Network", deviceEn: "Mobile Safari / iOS", deviceAr: "Ù…ÙˆØ¨Ø§ÙŠÙ„ Ø³ÙØ§Ø±ÙŠ / iOS" },
  { id: "EVT-0837", time: "17:22:04", date: "08 Jun 2026", actorEn: "Dr. Nasser Al-Ghamdi", actorAr: "Ø¯. Ù†Ø§ØµØ± Ø§Ù„ØºØ§Ù…Ø¯ÙŠ", actionEn: "Consent record WC-2026-0410 downloaded (PDF)", actionAr: "ØªÙ… ØªÙ†Ø²ÙŠÙ„ Ø³Ø¬Ù„ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© WC-2026-0410 (PDF)", typeEn: "Download", typeAr: "ØªÙ†Ø²ÙŠÙ„", icon: Download, color: "#D9A93B", ip: "10.0.0.21", deviceEn: "Firefox / macOS", deviceAr: "ÙØ§ÙŠØ±ÙÙˆÙƒØ³ / macOS" },
  { id: "EVT-0836", time: "15:09:44", date: "08 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„", actionEn: "Patient education materials sent â€” Sara Al-Mansouri", actionAr: "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ù…ÙˆØ§Ø¯ Ø§Ù„ØªØ«Ù‚ÙŠÙ â€” Ø³Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµÙˆØ±ÙŠ", typeEn: "Education", typeAr: "ØªØ«Ù‚ÙŠÙ", icon: Eye, color: "#19A978", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "ÙƒØ±ÙˆÙ… / ÙˆÙŠÙ†Ø¯ÙˆØ² Ù¡Ù¡" },
  { id: "EVT-0835", time: "11:03:28", date: "07 Jun 2026", actorEn: "System", actorAr: "Ø§Ù„Ù†Ø¸Ø§Ù…", actionEn: "Consent link expired â€” Khalid Nasser (no response in 48h)", actionAr: "Ø§Ù†ØªÙ‡Øª ØµÙ„Ø§Ø­ÙŠØ© Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© â€” Ø®Ø§Ù„Ø¯ Ù†Ø§ØµØ± (Ù„Ø§ Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø®Ù„Ø§Ù„ Ù¤Ù¨ Ø³Ø§Ø¹Ø©)", typeEn: "Expired", typeAr: "Ø§Ù†ØªÙ‡Ù‰", icon: Lock, color: "#E84B7A", ip: "â€”", deviceEn: "â€”", deviceAr: "â€”" },
];

export function AuditTrail({ lang }: Props) {
  const isRTL = lang === "ar";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
            {isRTL ? "Ù…Ø³Ø§Ø± Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ / Ø§Ù„Ø£Ø¯Ù„Ø© Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©" : "Audit Trail / Legal Evidence"}
          </h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
              <Filter size={13} /> {isRTL ? "ØªØµÙÙŠØ©" : "Filter"}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#123B5C" }}>
              <Download size={13} /> {isRTL ? "ØªØµØ¯ÙŠØ± Ø§Ù„Ø³Ø¬Ù„" : "Export Log"}
            </button>
          </div>
        </div>
        <p className="text-sm" style={{ color: "#64798B" }}>
          {isRTL ? "Ø³Ø¬Ù„ ØºÙŠØ± Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ Ù„Ø¬Ù…ÙŠØ¹ Ø£Ù†Ø´Ø·Ø© Ø§Ù„Ù…Ù†ØµØ© â€¢ Ù…Ø´ÙØ± â€¢ Ù…Ø®ØªÙˆÙ… Ø¨Ø§Ù„ÙˆÙ‚Øª" : "Immutable log of all platform activity â€¢ Encrypted â€¢ Timestamped"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="flex gap-4 p-4 bg-white rounded-2xl border" style={{ borderColor: "#D8E8EF" }}>
            {/* Icon + line */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ev.color + "15" }}>
                <ev.icon size={16} style={{ color: ev.color }} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                    {isRTL ? ev.actionAr : ev.actionEn}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#64798B" }}>
                    <span className="flex items-center gap-1">
                      <User size={10} /> {isRTL ? ev.actorAr : ev.actorEn}
                    </span>
                    <span>Â·</span>
                    <span>{ev.time} Â· {ev.date}</span>
                    <span>Â·</span>
                    <span>IP: {ev.ip}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#64798B" }}>
                    {isRTL ? ev.deviceAr : ev.deviceEn}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: ev.color + "18", color: ev.color }}>
                    {isRTL ? ev.typeAr : ev.typeEn}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#64798B" }}>{ev.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="p-4 rounded-2xl" style={{ background: "#EAF6FF", border: "1px solid #2F90C730" }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={13} style={{ color: "#2F90C7" }} />
            <span className="text-xs font-bold" style={{ color: "#2F90C7" }}>
              {isRTL ? "Ù…Ù„Ø§Ø­Ø¸Ø© Ù‚Ø§Ù†ÙˆÙ†ÙŠØ©" : "Legal Note"}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#64798B" }}>
            {isRTL
              ? "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¥Ø¯Ø®Ø§Ù„Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ Ù…Ø®ØªÙˆÙ…Ø© Ø²Ù…Ù†ÙŠØ§Ù‹ ÙˆÙ…Ø´ÙØ±Ø© ÙˆÙ„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„Ù‡Ø§. Ù‡Ø°Ø§ Ø§Ù„Ø³Ø¬Ù„ ØµØ§Ù„Ø­ ÙƒØ¯Ù„ÙŠÙ„ Ù‚Ø§Ù†ÙˆÙ†ÙŠ ÙˆÙÙ‚Ø§Ù‹ Ù„Ù…Ø¹Ø§ÙŠÙŠØ± HIPAA ÙˆNCA."
              : "All entries in this log are timestamped, encrypted, and immutable. This log is valid as legal evidence per HIPAA and NCA standards."}
          </p>
        </div>
      </div>
    </div>
  );
}


