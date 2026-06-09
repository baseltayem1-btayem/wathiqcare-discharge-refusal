"use client";

import { useState } from "react";
import { Search, Filter, Download, Eye, ChevronRight, Calendar, User } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface Props { lang: "en" | "ar" }

const records = [
  { id: "WC-2026-0412", patientEn: "Layla Hassan", patientAr: "Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù†", mrn: "MRN-204871", procedureEn: "Appendectomy", procedureAr: "Ø§Ø³ØªØ¦ØµØ§Ù„ Ø§Ù„Ø²Ø§Ø¦Ø¯Ø©", date: "09 Jun 2026", status: "signed" as const, doctorEn: "Dr. Ahmad Khalil", doctorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" },
  { id: "WC-2026-0411", patientEn: "Omar Al-Rashid", patientAr: "Ø¹Ù…Ø± Ø§Ù„Ø±Ø§Ø´Ø¯", mrn: "MRN-187432", procedureEn: "Cardiac Catheterization", procedureAr: "Ù‚Ø³Ø·Ø±Ø© Ù‚Ù„Ø¨ÙŠØ©", date: "09 Jun 2026", status: "pending" as const, doctorEn: "Dr. Ahmad Khalil", doctorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" },
  { id: "WC-2026-0410", patientEn: "Sara Al-Mansouri", patientAr: "Ø³Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµÙˆØ±ÙŠ", mrn: "MRN-201134", procedureEn: "Knee Replacement", procedureAr: "ØªØ¨Ø¯ÙŠÙ„ Ù…ÙØµÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©", date: "08 Jun 2026", status: "approved" as const, doctorEn: "Dr. Nasser Al-Ghamdi", doctorAr: "Ø¯. Ù†Ø§ØµØ± Ø§Ù„ØºØ§Ù…Ø¯ÙŠ" },
  { id: "WC-2026-0409", patientEn: "Khalid Nasser", patientAr: "Ø®Ø§Ù„Ø¯ Ù†Ø§ØµØ±", mrn: "MRN-195700", procedureEn: "Anesthesia Pre-op", procedureAr: "ØªØ®Ø¯ÙŠØ± Ù…Ø§ Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", date: "07 Jun 2026", status: "anesthesia" as const, doctorEn: "Dr. Sara Al-Mansouri", doctorAr: "Ø¯. Ø³Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµÙˆØ±ÙŠ" },
  { id: "WC-2026-0408", patientEn: "Fatimah Ibrahim", patientAr: "ÙØ§Ø·Ù…Ø© Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ…", mrn: "MRN-210045", procedureEn: "Cataract Surgery", procedureAr: "Ø¬Ø±Ø§Ø­Ø© Ø§Ù„Ø³Ø§Ø¯", date: "06 Jun 2026", status: "signed" as const, doctorEn: "Dr. Ahmad Khalil", doctorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" },
  { id: "WC-2026-0407", patientEn: "Mohammed Al-Qahtani", patientAr: "Ù…Ø­Ù…Ø¯ Ø§Ù„Ù‚Ø­Ø·Ø§Ù†ÙŠ", mrn: "MRN-183221", procedureEn: "Hernia Repair", procedureAr: "Ø¥ØµÙ„Ø§Ø­ Ø§Ù„ÙØªÙ‚", date: "05 Jun 2026", status: "expired" as const, doctorEn: "Dr. Nasser Al-Ghamdi", doctorAr: "Ø¯. Ù†Ø§ØµØ± Ø§Ù„ØºØ§Ù…Ø¯ÙŠ" },
  { id: "WC-2026-0406", patientEn: "Reem Al-Zahrani", patientAr: "Ø±ÙŠÙ… Ø§Ù„Ø²Ù‡Ø±Ø§Ù†ÙŠ", mrn: "MRN-199832", procedureEn: "Colonoscopy", procedureAr: "ØªÙ†Ø¸ÙŠØ± Ø§Ù„Ù‚ÙˆÙ„ÙˆÙ†", date: "04 Jun 2026", status: "signed" as const, doctorEn: "Dr. Ahmad Khalil", doctorAr: "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" },
];

export function ConsentRecords({ lang }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const isRTL = lang === "ar";

  const filtered = records.filter(r => {
    const name = isRTL ? r.patientAr : r.patientEn;
    const proc = isRTL ? r.procedureAr : r.procedureEn;
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || proc.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const sel = records.find(r => r.id === selected);

  const filters = [
    { id: "all", en: "All", ar: "Ø§Ù„ÙƒÙ„" },
    { id: "signed", en: "Signed", ar: "Ù…ÙˆÙ‚Ø¹" },
    { id: "pending", en: "Pending", ar: "Ù…Ø¹Ù„Ù‚" },
    { id: "approved", en: "Approved", ar: "Ù…Ø¹ØªÙ…Ø¯" },
    { id: "expired", en: "Expired", ar: "Ù…Ù†ØªÙ‡ÙŠ" },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#102A43" }}>
            {isRTL ? "Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" : "Consent Records"}
          </h2>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white" style={{ borderColor: "#D8E8EF" }}>
              <Search size={14} style={{ color: "#64798B" }} />
              <input
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder={isRTL ? "Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø£Ùˆ Ø±Ù‚Ù… Ø§Ù„Ù…Ù„Ù..." : "Search by name, procedure, or record ID..."}
                style={{ color: "#102A43" }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
              <Filter size={14} /> {isRTL ? "ØªØµÙÙŠØ©" : "Filter"}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#123B5C" }}>
              <Download size={14} /> {isRTL ? "ØªØµØ¯ÙŠØ±" : "Export"}
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  borderColor: filter === f.id ? "#2F90C7" : "#D8E8EF",
                  background: filter === f.id ? "#EAF6FF" : "white",
                  color: filter === f.id ? "#2F90C7" : "#64798B"
                }}
              >
                {isRTL ? f.ar : f.en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id === selected ? null : r.id)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border text-left transition-all hover:shadow-sm"
              style={{
                borderColor: selected === r.id ? "#2F90C7" : "#D8E8EF",
                background: selected === r.id ? "#EAF6FF" : "white"
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#2F90C7,#12B7B5)" }}>
                {(isRTL ? r.patientAr : r.patientEn).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? r.patientAr : r.patientEn}
                  </span>
                  <span className="text-xs" style={{ color: "#64798B" }}>{r.mrn}</span>
                </div>
                <div className="text-sm mt-0.5" style={{ color: "#64798B" }}>
                  {isRTL ? r.procedureAr : r.procedureEn}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#64798B" }}>
                  <span className="flex items-center gap-1"><User size={10} />{isRTL ? r.doctorAr : r.doctorEn}</span>
                  <span className="flex items-center gap-1"><Calendar size={10} />{r.date}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={r.status} lang={lang} />
                <span className="text-xs font-mono" style={{ color: "#64798B" }}>{r.id}</span>
              </div>
              <ChevronRight size={14} style={{ color: "#64798B" }} />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: "#64798B" }}>
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{isRTL ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬" : "No records found"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {sel && (
        <div className="w-80 border-l bg-white overflow-y-auto flex-shrink-0" style={{ borderColor: "#D8E8EF" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#D8E8EF" }}>
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" : "Consent Detail"}
            </span>
            <button onClick={() => setSelected(null)} className="text-xs" style={{ color: "#64798B" }}>âœ•</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-2"
                style={{ background: "linear-gradient(135deg,#2F90C7,#12B7B5)" }}>
                {(isRTL ? sel.patientAr : sel.patientEn).charAt(0)}
              </div>
              <div className="text-base font-bold" style={{ color: "#102A43" }}>
                {isRTL ? sel.patientAr : sel.patientEn}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "#64798B" }}>{sel.mrn}</div>
              <div className="mt-2"><StatusBadge status={sel.status} lang={lang} /></div>
            </div>
            <div className="space-y-3">
              {[
                { labelEn: "Record ID", labelAr: "Ø±Ù‚Ù… Ø§Ù„Ø³Ø¬Ù„", val: sel.id },
                { labelEn: "Procedure", labelAr: "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡", val: isRTL ? sel.procedureAr : sel.procedureEn },
                { labelEn: "Surgeon", labelAr: "Ø§Ù„Ø¬Ø±Ø§Ø­", val: isRTL ? sel.doctorAr : sel.doctorEn },
                { labelEn: "Date", labelAr: "Ø§Ù„ØªØ§Ø±ÙŠØ®", val: sel.date },
              ].map(row => (
                <div key={row.labelEn} className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>{isRTL ? row.labelAr : row.labelEn}</div>
                  <div className="text-sm font-medium" style={{ color: "#102A43" }}>{row.val}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2F90C7" }}>
                <Eye size={14} /> {isRTL ? "Ø¹Ø±Ø¶" : "View"}
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
                <Download size={14} /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


