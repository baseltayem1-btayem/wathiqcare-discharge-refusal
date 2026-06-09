"use client";

import { useState } from "react";
import { BookOpen, Play, FileText, BarChart2, Search, Eye, Globe } from "lucide-react";

interface Props { lang: "en" | "ar" }

const materials = [
  { id: 1, titleEn: "Pre-operative Fasting Guide", titleAr: "Ø¯Ù„ÙŠÙ„ Ø§Ù„ØµÙŠØ§Ù… Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", typeEn: "PDF", typeAr: "PDF", catEn: "Pre-op", catAr: "Ù…Ø§ Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", viewsCount: 1240, duration: "5 min", langEn: "Arabic / English", langAr: "Ø¹Ø±Ø¨ÙŠ / Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ", icon: "ðŸ“„", color: "#E84B7A" },
  { id: 2, titleEn: "What Happens During Surgery", titleAr: "Ù…Ø§Ø°Ø§ ÙŠØ­Ø¯Ø« Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¬Ø±Ø§Ø­Ø©", typeEn: "Video", typeAr: "ÙÙŠØ¯ÙŠÙˆ", catEn: "Intra-op", catAr: "Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", viewsCount: 876, duration: "4 min", langEn: "Arabic", langAr: "Ø¹Ø±Ø¨ÙŠ", icon: "ðŸŽ¬", color: "#2F90C7" },
  { id: 3, titleEn: "Post-operative Care at Home", titleAr: "Ø§Ù„Ø±Ø¹Ø§ÙŠØ© ÙÙŠ Ø§Ù„Ù…Ù†Ø²Ù„ Ø¨Ø¹Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", typeEn: "Infographic", typeAr: "Ø¥Ù†ÙÙˆØºØ±Ø§ÙÙŠÙƒ", catEn: "Post-op", catAr: "Ù…Ø§ Ø¨Ø¹Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", viewsCount: 2104, duration: "3 min", langEn: "Arabic / English / Urdu", langAr: "Ø¹Ø±Ø¨ÙŠ / Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ / Ø£Ø±Ø¯ÙŠ", icon: "ðŸ–¼ï¸", color: "#19A978" },
  { id: 4, titleEn: "Understanding Anesthesia Risks", titleAr: "ÙÙ‡Ù… Ù…Ø®Ø§Ø·Ø± Ø§Ù„ØªØ®Ø¯ÙŠØ±", typeEn: "Video", typeAr: "ÙÙŠØ¯ÙŠÙˆ", catEn: "Anesthesia", catAr: "Ø§Ù„ØªØ®Ø¯ÙŠØ±", viewsCount: 643, duration: "6 min", langEn: "Arabic", langAr: "Ø¹Ø±Ø¨ÙŠ", icon: "ðŸŽ¬", color: "#6B5CE7" },
  { id: 5, titleEn: "Consent Process Explained", titleAr: "Ø´Ø±Ø­ Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©", typeEn: "PDF", typeAr: "PDF", catEn: "Consent", catAr: "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©", viewsCount: 3211, duration: "8 min", langEn: "Arabic / English", langAr: "Ø¹Ø±Ø¨ÙŠ / Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ", icon: "ðŸ“„", color: "#D9A93B" },
  { id: 6, titleEn: "Recovery Milestones & Timeline", titleAr: "Ù…Ø±Ø§Ø­Ù„ ÙˆÙ…Ø¹Ø§Ù„Ù… Ø§Ù„ØªØ¹Ø§ÙÙŠ", typeEn: "Infographic", typeAr: "Ø¥Ù†ÙÙˆØºØ±Ø§ÙÙŠÙƒ", catEn: "Post-op", catAr: "Ù…Ø§ Ø¨Ø¹Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", viewsCount: 1580, duration: "2 min", langEn: "Arabic / English", langAr: "Ø¹Ø±Ø¨ÙŠ / Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠ", icon: "ðŸ–¼ï¸", color: "#12B7B5" },
];

const cats = [
  { id: "all", en: "All", ar: "Ø§Ù„ÙƒÙ„" },
  { id: "Pre-op", en: "Pre-op", ar: "Ù…Ø§ Ù‚Ø¨Ù„" },
  { id: "Intra-op", en: "Intra-op", ar: "Ø£Ø«Ù†Ø§Ø¡" },
  { id: "Post-op", en: "Post-op", ar: "Ù…Ø§ Ø¨Ø¹Ø¯" },
  { id: "Anesthesia", en: "Anesthesia", ar: "Ø§Ù„ØªØ®Ø¯ÙŠØ±" },
  { id: "Consent", en: "Consent", ar: "Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" },
];

export function PatientEducation({ lang }: Props) {
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const isRTL = lang === "ar";

  const filtered = materials.filter(m =>
    (cat === "all" || m.catEn === cat) &&
    (isRTL ? m.titleAr : m.titleEn).toLowerCase().includes(search.toLowerCase())
  );

  const sel = materials.find(m => m.id === selected);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "Ù…ÙƒØªØ¨Ø© ØªØ«Ù‚ÙŠÙ Ø§Ù„Ù…Ø±ÙŠØ¶" : "Patient Education Library"}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background: "#F1EFFF", color: "#6B5CE7" }}>
              <BookOpen size={14} /> {isRTL ? `${materials.length} Ù…Ø§Ø¯Ø©` : `${materials.length} materials`}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-white rounded-xl border" style={{ borderColor: "#D8E8EF" }}>
            <Search size={14} style={{ color: "#64798B" }} />
            <input className="flex-1 text-sm outline-none bg-transparent" style={{ color: "#102A43" }}
              placeholder={isRTL ? "Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù…ÙˆØ§Ø¯..." : "Search materials..."}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {cats.map(c => (
              <button key={c.id} onClick={() => setCat(c.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{ borderColor: cat === c.id ? "#6B5CE7" : "#D8E8EF", background: cat === c.id ? "#F1EFFF" : "white", color: cat === c.id ? "#6B5CE7" : "#64798B" }}>
                {isRTL ? c.ar : c.en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(m => (
              <button key={m.id} onClick={() => setSelected(m.id === selected ? null : m.id)}
                className="text-left p-5 rounded-2xl bg-white border transition-all hover:shadow-md"
                style={{ borderColor: selected === m.id ? m.color : "#D8E8EF", background: selected === m.id ? m.color + "08" : "white" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: m.color + "15" }}>
                    {m.icon}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: m.color + "15", color: m.color }}>
                    {isRTL ? m.typeAr : m.typeEn}
                  </span>
                </div>
                <div className="text-sm font-bold mb-1" style={{ color: "#102A43" }}>
                  {isRTL ? m.titleAr : m.titleEn}
                </div>
                <div className="text-xs mb-3" style={{ color: "#64798B" }}>
                  {isRTL ? m.catAr : m.catEn} Â· {m.duration}
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "#64798B" }}>
                  <span className="flex items-center gap-1"><Eye size={10} /> {m.viewsCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Globe size={10} /> {isRTL ? m.langAr : m.langEn}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detail */}
      {sel && (
        <div className="w-80 border-l bg-white overflow-y-auto flex-shrink-0" style={{ borderColor: "#D8E8EF" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#D8E8EF" }}>
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? "ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø§Ø¯Ø©" : "Material Detail"}</span>
            <button onClick={() => setSelected(null)} className="text-xs" style={{ color: "#64798B" }}>âœ•</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="w-full h-36 rounded-2xl flex items-center justify-center text-5xl" style={{ background: sel.color + "12" }}>
              {sel.icon}
            </div>
            <div>
              <div className="text-base font-bold" style={{ color: "#102A43" }}>{isRTL ? sel.titleAr : sel.titleEn}</div>
              <div className="text-sm mt-1" style={{ color: "#64798B" }}>{isRTL ? sel.catAr : sel.catEn}</div>
            </div>
            <div className="space-y-2">
              {[
                { labelEn: "Type", labelAr: "Ø§Ù„Ù†ÙˆØ¹", val: isRTL ? sel.typeAr : sel.typeEn },
                { labelEn: "Duration", labelAr: "Ø§Ù„Ù…Ø¯Ø©", val: sel.duration },
                { labelEn: "Languages", labelAr: "Ø§Ù„Ù„ØºØ§Øª", val: isRTL ? sel.langAr : sel.langEn },
                { labelEn: "Total Views", labelAr: "Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ù…Ø´Ø§Ù‡Ø¯Ø§Øª", val: sel.viewsCount.toLocaleString() },
              ].map(row => (
                <div key={row.labelEn} className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#64798B" }}>{isRTL ? row.labelAr : row.labelEn}</div>
                  <div className="text-sm" style={{ color: "#102A43" }}>{row.val}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: sel.color }}>
                <Play size={13} /> {isRTL ? "Ø¹Ø±Ø¶" : "View"}
              </button>
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
                <FileText size={13} /> {isRTL ? "Ø¥Ø¶Ø§ÙØ©" : "Attach"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


