"use client";

import { Shield, Check, AlertTriangle, Info, TrendingUp, BarChart2, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";

interface Props { lang: "en" | "ar" }

const monthlyData = [
  { month: "Jan", score: 94 }, { month: "Feb", score: 96 }, { month: "Mar", score: 93 },
  { month: "Apr", score: 97 }, { month: "May", score: 95 }, { month: "Jun", score: 98 },
];

const issuesByDept = [
  { dept: "Surgery", deptAr: "Ø¬Ø±Ø§Ø­Ø©", issues: 3 },
  { dept: "Cardio", deptAr: "Ù‚Ù„Ø¨", issues: 1 },
  { dept: "Ortho", deptAr: "Ø¹Ø¸Ø§Ù…", issues: 2 },
  { dept: "Gastro", deptAr: "Ù‡Ø¶Ù…ÙŠ", issues: 0 },
  { dept: "Anes.", deptAr: "ØªØ®Ø¯ÙŠØ±", issues: 1 },
];

const checks = [
  { ok: true, en: "All active consents have valid patient identity", ar: "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø§Ù„Ù†Ø´Ø·Ø© Ù„Ø¯ÙŠÙ‡Ø§ Ù‡ÙˆÙŠØ© Ù…Ø±ÙŠØ¶ ØµØ§Ù„Ø­Ø©" },
  { ok: true, en: "Approved templates used across all departments", ar: "Ø§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø© Ù…Ø³ØªØ®Ø¯Ù…Ø© ÙÙŠ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…" },
  { ok: true, en: "Anesthesia consent rate: 100%", ar: "Ù…Ø¹Ø¯Ù„ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„ØªØ®Ø¯ÙŠØ±: Ù¡Ù Ù Ùª" },
  { ok: true, en: "OTP verification enforced on all patient links", ar: "Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨Ù€ OTP Ù…Ø·Ø¨Ù‚ Ø¹Ù„Ù‰ Ø¬Ù…ÙŠØ¹ Ø±ÙˆØ§Ø¨Ø· Ø§Ù„Ù…Ø±Ø¶Ù‰" },
  { ok: false, en: "3 consents missing witness signature (non-critical)", ar: "Ù£ Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø¨Ø¯ÙˆÙ† ØªÙˆÙ‚ÙŠØ¹ Ø´Ø§Ù‡Ø¯ (ØºÙŠØ± Ø­Ø±Ø¬)" },
  { ok: true, en: "All signed consents backed up and sealed", ar: "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø§Øª Ø§Ù„Ù…ÙˆÙ‚Ø¹Ø© Ù…Ø¯Ø¹ÙˆÙ…Ø© ÙˆÙ…Ø®ØªÙˆÙ…Ø©" },
  { ok: false, en: "1 consent link expired â€” patient not responsive", ar: "Ø±Ø§Ø¨Ø· Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØ§Ø­Ø¯ Ù…Ù†ØªÙ‡ÙŠ â€” Ø§Ù„Ù…Ø±ÙŠØ¶ ØºÙŠØ± Ù…Ø³ØªØ¬ÙŠØ¨" },
  { ok: true, en: "Audit trail complete for last 90 days", ar: "Ù…Ø³Ø§Ø± Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ Ù…ÙƒØªÙ…Ù„ Ù„Ù„Ù€ Ù©Ù  ÙŠÙˆÙ…Ø§Ù‹ Ø§Ù„Ù…Ø§Ø¶ÙŠØ©" },
];

export function ComplianceReview({ lang }: Props) {
  const isRTL = lang === "ar";

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ background: "#F7FBFC" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
            {isRTL ? "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø§Ù„Ø°ÙƒÙŠØ©" : "Smart Compliance Review"}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#64798B" }}>
            {isRTL ? "ÙØ­Øµ Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ â€” Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«: Ù© ÙŠÙˆÙ†ÙŠÙˆ Ù¢Ù Ù¢Ù¦ Ù Ù©:Ù Ù " : "AI-powered audit â€” Last updated: Jun 9, 2026 09:00"}
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
          <RefreshCw size={14} /> {isRTL ? "ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØ­Øµ" : "Refresh Check"}
        </button>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Shield, colorFrom: "#2F90C7", colorTo: "#12B7B5", valEn: "98%", valAr: "Ù©Ù¨Ùª", labelEn: "Overall Compliance", labelAr: "Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø§Ù„Ø¹Ø§Ù…", trend: "+2%" },
          { icon: Check, colorFrom: "#19A978", colorTo: "#0ECBA1", valEn: "156", valAr: "Ù¡Ù¥Ù¦", labelEn: "Consents Valid", labelAr: "Ù…ÙˆØ§ÙÙ‚Ø§Øª ØµØ§Ù„Ø­Ø©", trend: "+12" },
          { icon: AlertTriangle, colorFrom: "#D9A93B", colorTo: "#F5C842", valEn: "2", valAr: "Ù¢", labelEn: "Action Needed", labelAr: "ÙŠØªØ·Ù„Ø¨ Ø¥Ø¬Ø±Ø§Ø¡", trend: "-1" },
          { icon: TrendingUp, colorFrom: "#6B5CE7", colorTo: "#9B8AF5", valEn: "4.9/5", valAr: "Ù¤.Ù©/Ù¥", labelEn: "Patient Satisfaction", labelAr: "Ø±Ø¶Ø§ Ø§Ù„Ù…Ø±ÙŠØ¶", trend: "+0.1" },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg,${card.colorFrom},${card.colorTo})` }}>
                <card.icon size={18} color="white" />
              </div>
              <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: "#E8F9F4", color: "#19A978" }}>{card.trend}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#102A43" }}>{isRTL ? card.valAr : card.valEn}</div>
            <div className="text-xs mt-1" style={{ color: "#64798B" }}>{isRTL ? card.labelAr : card.labelEn}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Trend chart */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} style={{ color: "#2F90C7" }} />
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø§Ù„Ø´Ù‡Ø±ÙŠ" : "Monthly Compliance Trend"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8E8EF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64798B" }} />
              <YAxis domain={[88, 100]} tick={{ fontSize: 11, fill: "#64798B" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D8E8EF", fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="#2F90C7" strokeWidth={2.5} dot={{ fill: "#2F90C7", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Issues by dept */}
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} style={{ color: "#D9A93B" }} />
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "Ø§Ù„Ù…Ø´ÙƒÙ„Ø§Øª Ø­Ø³Ø¨ Ø§Ù„Ù‚Ø³Ù…" : "Issues by Department"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={issuesByDept} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8E8EF" />
              <XAxis dataKey={isRTL ? "deptAr" : "dept"} tick={{ fontSize: 11, fill: "#64798B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64798B" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #D8E8EF", fontSize: 12 }} />
              <Bar dataKey="issues" radius={[6, 6, 0, 0]}>
                {issuesByDept.map((entry, i) => (
                  <Cell key={i} fill={entry.issues === 0 ? "#19A978" : entry.issues <= 1 ? "#D9A93B" : "#E84B7A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: "#12B7B5" }} />
          <span className="text-sm font-bold" style={{ color: "#102A43" }}>
            {isRTL ? "Ù†ØªØ§Ø¦Ø¬ ÙØ­Øµ Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„" : "Compliance Check Results"}
          </span>
        </div>
        <div className="space-y-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: c.ok ? "#F7FBFC" : "#FFF8E8" }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: c.ok ? "#E8F9F4" : "#FFF0D0" }}>
                {c.ok ? <Check size={10} style={{ color: "#19A978" }} /> : <Info size={10} style={{ color: "#D9A93B" }} />}
              </div>
              <span className="text-sm" style={{ color: c.ok ? "#102A43" : "#D9A93B" }}>
                {isRTL ? c.ar : c.en}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


