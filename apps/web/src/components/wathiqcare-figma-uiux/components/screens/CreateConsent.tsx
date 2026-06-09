import { useState } from "react";
import {
  User, FileText, Stethoscope, Wind, BookOpen, Shield, Send,
  ChevronRight, ChevronLeft, Check, Search, AlertTriangle, Info,
  Phone, Calendar, Clipboard
} from "lucide-react";

interface Props { lang: "en" | "ar" }

const steps = {
  en: ["Patient Context","Template","Procedure Details","Anesthesia","Education","Review","Send Link"],
  ar: ["Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶","Ø§Ù„Ù†Ù…ÙˆØ°Ø¬","ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡","Ø§Ù„ØªØ®Ø¯ÙŠØ±","Ø§Ù„ØªØ«Ù‚ÙŠÙ","Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©","Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø§Ø¨Ø·"],
};

const stepIcons = [User, FileText, Stethoscope, Wind, BookOpen, Shield, Send];

const templates = [
  { id: "append", nameEn: "Appendectomy", nameAr: "Ø§Ø³ØªØ¦ØµØ§Ù„ Ø§Ù„Ø²Ø§Ø¦Ø¯Ø© Ø§Ù„Ø¯ÙˆØ¯ÙŠØ©", catEn: "General Surgery", catAr: "Ø¬Ø±Ø§Ø­Ø© Ø¹Ø§Ù…Ø©", risk: "medium" },
  { id: "cardiac", nameEn: "Cardiac Catheterization", nameAr: "Ù‚Ø³Ø·Ø±Ø© Ù‚Ù„Ø¨ÙŠØ©", catEn: "Cardiology", catAr: "Ø£Ù…Ø±Ø§Ø¶ Ø§Ù„Ù‚Ù„Ø¨", risk: "high" },
  { id: "knee", nameEn: "Knee Replacement", nameAr: "ØªØ¨Ø¯ÙŠÙ„ Ù…ÙØµÙ„ Ø§Ù„Ø±ÙƒØ¨Ø©", catEn: "Orthopedics", catAr: "Ø¬Ø±Ø§Ø­Ø© Ø§Ù„Ø¹Ø¸Ø§Ù…", risk: "high" },
  { id: "colonoscopy", nameEn: "Colonoscopy", nameAr: "ØªÙ†Ø¸ÙŠØ± Ø§Ù„Ù‚ÙˆÙ„ÙˆÙ†", catEn: "Gastroenterology", catAr: "Ø£Ù…Ø±Ø§Ø¶ Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ù‡Ø¶Ù…ÙŠ", risk: "low" },
  { id: "cataract", nameEn: "Cataract Surgery", nameAr: "Ø¬Ø±Ø§Ø­Ø© Ø§Ù„Ø³Ø§Ø¯", catEn: "Ophthalmology", catAr: "Ø·Ø¨ Ø§Ù„Ø¹ÙŠÙˆÙ†", risk: "low" },
  { id: "hernia", nameEn: "Hernia Repair", nameAr: "Ø¥ØµÙ„Ø§Ø­ Ø§Ù„ÙØªÙ‚", catEn: "General Surgery", catAr: "Ø¬Ø±Ø§Ø­Ø© Ø¹Ø§Ù…Ø©", risk: "medium" },
];

const riskColor: Record<string, string> = { low: "#19A978", medium: "#D9A93B", high: "#E84B7A" };
const riskLabel: Record<string, { en: string; ar: string }> = {
  low: { en: "Low Risk", ar: "Ù…Ø®Ø§Ø·Ø± Ù…Ù†Ø®ÙØ¶Ø©" },
  medium: { en: "Med Risk", ar: "Ù…Ø®Ø§Ø·Ø± Ù…ØªÙˆØ³Ø·Ø©" },
  high: { en: "High Risk", ar: "Ù…Ø®Ø§Ø·Ø± Ø¹Ø§Ù„ÙŠØ©" },
};

const educationMaterials = [
  { id: "a1", titleEn: "Pre-operative Instructions", titleAr: "ØªØ¹Ù„ÙŠÙ…Ø§Øª Ù…Ø§ Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", typeEn: "PDF Guide", typeAr: "Ø¯Ù„ÙŠÙ„ PDF", duration: "5 min" },
  { id: "a2", titleEn: "What to Expect During Surgery", titleAr: "Ù…Ø§ ÙŠÙ…ÙƒÙ† ØªÙˆÙ‚Ø¹Ù‡ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¬Ø±Ø§Ø­Ø©", typeEn: "Video", typeAr: "ÙÙŠØ¯ÙŠÙˆ", duration: "3 min" },
  { id: "a3", titleEn: "Recovery & Post-op Care", titleAr: "Ø§Ù„ØªØ¹Ø§ÙÙŠ ÙˆØ§Ù„Ø±Ø¹Ø§ÙŠØ© Ø¨Ø¹Ø¯ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", typeEn: "Infographic", typeAr: "Ø¥Ù†ÙÙˆØºØ±Ø§ÙÙŠÙƒ", duration: "2 min" },
];

export function CreateConsent({ lang }: Props) {
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [anesthesiaType, setAnesthesiaType] = useState<"general" | "local" | "spinal" | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [searchTpl, setSearchTpl] = useState("");
  const [sent, setSent] = useState(false);

  const isRTL = lang === "ar";
  const stepLabels = steps[lang];

  const next = () => { if (step < 6) setStep(s => s + 1); };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  const filteredTemplates = templates.filter(t =>
    (isRTL ? t.nameAr : t.nameEn).toLowerCase().includes(searchTpl.toLowerCase())
  );

  const selectedTpl = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="flex flex-1 overflow-hidden" style={{ background: "#F7FBFC" }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Step progress */}
        <div className="bg-white border-b px-6 py-4" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center gap-0">
            {stepLabels.map((label, i) => {
              const Icon = stepIcons[i];
              const done = i < step;
              const active = i === step;
              return (
                <div key={i} className="flex items-center">
                  <button
                    onClick={() => i <= step && setStep(i)}
                    className="flex flex-col items-center gap-1 group"
                    style={{ opacity: i > step ? 0.4 : 1 }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: done ? "#19A978" : active ? "#2F90C7" : "#D8E8EF",
                        boxShadow: active ? "0 0 0 3px #2F90C720" : "none"
                      }}
                    >
                      {done ? <Check size={15} color="white" /> : <Icon size={15} color={active ? "white" : "#64798B"} />}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: active ? "#2F90C7" : done ? "#19A978" : "#64798B" }}>
                      {label}
                    </span>
                  </button>
                  {i < 6 && (
                    <div className="w-10 h-0.5 mx-1 mt-[-14px]" style={{ background: done ? "#19A978" : "#D8E8EF" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 0: Patient Context */}
          {step === 0 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶" : "Patient Context"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø£Ø¯Ø®Ù„ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ø³Ø¬Ù„Ø§Øª" : "Enter patient information or search existing records"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border space-y-4" style={{ borderColor: "#D8E8EF" }}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„" : "Full Name"}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                      placeholder={isRTL ? "Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ù…Ø±ÙŠØ¶" : "Enter patient name"}
                      defaultValue={isRTL ? "Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù†" : "Layla Hassan"}
                    />
                  </div>
                  <div className="w-36">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø±Ù‚Ù… Ø§Ù„Ù…Ù„Ù" : "MRN"}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                      defaultValue="MRN-204871"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ù„" : "Mobile"}
                    </label>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm border" style={{ borderColor: "#D8E8EF", background: "#EAF6FF", color: "#2F90C7" }}>
                        <Phone size={13} /> +966
                      </span>
                      <input
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
                        style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                        defaultValue="055 123 4567"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ÙŠÙ„Ø§Ø¯" : "Date of Birth"}
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}>
                      <Calendar size={13} style={{ color: "#64798B" }} />
                      <span>14 / 03 / 1990</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "Ø§Ù„Ø¬Ù†Ø³ÙŠØ© / Ø§Ù„Ù„ØºØ© Ø§Ù„Ù…ÙØ¶Ù„Ø©" : "Nationality / Preferred Language"}
                  </label>
                  <div className="flex gap-2">
                    {["Arabic", "English", "Urdu", "Filipino"].map(l => (
                      <button
                        key={l}
                        className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                        style={{
                          borderColor: l === "Arabic" ? "#2F90C7" : "#D8E8EF",
                          background: l === "Arabic" ? "#EAF6FF" : "white",
                          color: l === "Arabic" ? "#2F90C7" : "#64798B"
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø±ÙŠØ±ÙŠØ© / Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª" : "Clinical Notes"}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                    style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                    defaultValue={isRTL ? "Ù…Ø±ÙŠØ¶Ø© ØªØ¨Ù„Øº Ù…Ù† Ø§Ù„Ø¹Ù…Ø± 34 Ø¹Ø§Ù…Ø§Ù‹ØŒ ØªØ¹Ø§Ù†ÙŠ Ù…Ù† Ø¢Ù„Ø§Ù… ÙÙŠ Ø§Ù„Ø¨Ø·Ù† Ù…Ø¹ Ø¹Ù„Ø§Ù…Ø§Øª Ø§Ù„ØªÙ‡Ø§Ø¨ Ø§Ù„Ø²Ø§Ø¦Ø¯Ø© Ø§Ù„Ø¯ÙˆØ¯ÙŠØ©." : "34-year-old female presenting with acute abdominal pain, signs consistent with appendicitis."}
                  />
                </div>
              </div>

              {/* Allergies & flags */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-2xl p-4 border" style={{ borderColor: "#D8E8EF" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: "#D9A93B" }} />
                    <span className="text-sm font-semibold" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø§Ù„Ø­Ø³Ø§Ø³ÙŠØ©" : "Allergies"}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["Penicillin", "Latex"].map(a => (
                      <span key={a} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "#FFEAEA", color: "#d4183d" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-2xl p-4 border" style={{ borderColor: "#D8E8EF" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={14} style={{ color: "#2F90C7" }} />
                    <span className="text-sm font-semibold" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ù…ØµØ§Ø­Ø¨Ø©" : "Comorbidities"}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["Hypertension", "Type 2 DM"].map(c => (
                      <span key={c} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "#EAF6FF", color: "#2F90C7" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Template Selection */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ø§Ø®ØªØ± Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" : "Select Consent Template"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ø®ØªØ± Ù…Ù† Ù…ÙƒØªØ¨Ø© Ø§Ù„Ù†Ù…Ø§Ø°Ø¬ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©" : "Choose from the approved template library"}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border" style={{ borderColor: "#D8E8EF" }}>
                <Search size={15} style={{ color: "#64798B" }} />
                <input
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder={isRTL ? "Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ù†Ù…ÙˆØ°Ø¬..." : "Search templates..."}
                  style={{ color: "#102A43" }}
                  value={searchTpl}
                  onChange={e => setSearchTpl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className="text-left p-4 rounded-2xl border bg-white transition-all duration-150"
                    style={{
                      borderColor: selectedTemplate === tpl.id ? "#2F90C7" : "#D8E8EF",
                      boxShadow: selectedTemplate === tpl.id ? "0 0 0 2px #2F90C730" : "none",
                      background: selectedTemplate === tpl.id ? "#EAF6FF" : "white"
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#F7FBFC" }}>
                        <FileText size={16} style={{ color: "#2F90C7" }} />
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: riskColor[tpl.risk] + "20", color: riskColor[tpl.risk] }}>
                        {lang === "en" ? riskLabel[tpl.risk].en : riskLabel[tpl.risk].ar}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                        {isRTL ? tpl.nameAr : tpl.nameEn}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>
                        {isRTL ? tpl.catAr : tpl.catEn}
                      </div>
                    </div>
                    {selectedTemplate === tpl.id && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2F90C7" }}>
                        <Check size={12} /> {isRTL ? "Ù…Ø­Ø¯Ø¯" : "Selected"}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Procedure Details */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" : "Procedure Details"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø£ÙƒÙ…Ù„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø¬Ø±Ø§Ø­ÙŠ" : "Complete the procedure-specific details"}
                </p>
              </div>
              {selectedTpl && (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "#EAF6FF", border: "1px solid #2F90C730" }}>
                  <FileText size={18} style={{ color: "#2F90C7" }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#123B5C" }}>
                      {isRTL ? selectedTpl.nameAr : selectedTpl.nameEn}
                    </div>
                    <div className="text-xs" style={{ color: "#64798B" }}>
                      {isRTL ? selectedTpl.catAr : selectedTpl.catEn}
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-2xl p-5 border space-y-4" style={{ borderColor: "#D8E8EF" }}>
                {[
                  { labelEn: "Surgeon Name", labelAr: "Ø§Ø³Ù… Ø§Ù„Ø¬Ø±Ø§Ø­", val: isRTL ? "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" : "Dr. Ahmad Khalil" },
                  { labelEn: "Scheduled Date", labelAr: "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¹Ù…Ù„ÙŠØ©", val: "12 / 06 / 2026" },
                  { labelEn: "Hospital / Operating Room", labelAr: "Ø§Ù„Ù…Ø³ØªØ´ÙÙ‰ / ØºØ±ÙØ© Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª", val: isRTL ? "Ù…Ø³ØªØ´ÙÙ‰ Ø§Ù„Ù…Ù„Ùƒ Ø¹Ø¨Ø¯Ø§Ù„Ø¹Ø²ÙŠØ² â€” ØºØ±ÙØ© Ù£" : "King Abdulaziz Hospital â€” OR 3" },
                  { labelEn: "Procedure Duration (est.)", labelAr: "Ù…Ø¯Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ (ØªÙ‚Ø¯ÙŠØ±ÙŠØ©)", val: "90 min" },
                ].map(f => (
                  <div key={f.labelEn}>
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? f.labelAr : f.labelEn}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                      defaultValue={f.val}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "Ø§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ù…Ø¶Ø§Ø¹ÙØ§Øª Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©" : "Key Risks & Complications"}
                  </label>
                  <div className="space-y-2">
                    {(isRTL
                      ? ["Ù†Ø²ÙŠÙ", "Ø¹Ø¯ÙˆÙ‰", "ØªÙ„Ù Ø§Ù„Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„Ù…Ø¬Ø§ÙˆØ±Ø©", "Ø§Ù„Ø­Ø§Ø¬Ø© Ø¥Ù„Ù‰ Ø¥Ø¬Ø±Ø§Ø¡ Ø¢Ø®Ø±"]
                      : ["Bleeding", "Infection", "Adjacent organ injury", "Need for further procedure"]
                    ).map((risk, i) => (
                      <label key={i} className="flex items-center gap-2 cursor-pointer">
                        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "#2F90C7" }}>
                          <Check size={10} color="white" />
                        </div>
                        <span className="text-sm" style={{ color: "#102A43" }}>{risk}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Anesthesia */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ù‚Ø±Ø§Ø± Ø§Ù„ØªØ®Ø¯ÙŠØ±" : "Anesthesia Decision"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø­Ø¯Ø¯ Ù†ÙˆØ¹ Ø§Ù„ØªØ®Ø¯ÙŠØ± ÙˆØ£Ø¶Ù Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø·Ø¨ÙŠØ¨ Ø§Ù„ØªØ®Ø¯ÙŠØ±" : "Select anesthesia type and add anesthesiologist notes"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "general", icon: "ðŸ«", en: "General Anesthesia", ar: "ØªØ®Ø¯ÙŠØ± Ø¹Ø§Ù…" },
                  { id: "local", icon: "ðŸ’‰", en: "Local Anesthesia", ar: "ØªØ®Ø¯ÙŠØ± Ù…ÙˆØ¶Ø¹ÙŠ" },
                  { id: "spinal", icon: "ðŸ©º", en: "Spinal / Epidural", ar: "ØªØ®Ø¯ÙŠØ± Ù†Ø®Ø§Ø¹ÙŠ / ÙÙˆÙ‚ Ø§Ù„Ø¬Ø§ÙÙŠØ©" },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setAnesthesiaType(opt.id)}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl border bg-white transition-all"
                    style={{
                      borderColor: anesthesiaType === opt.id ? "#12B7B5" : "#D8E8EF",
                      background: anesthesiaType === opt.id ? "#EAFFFB" : "white",
                      boxShadow: anesthesiaType === opt.id ? "0 0 0 2px #12B7B530" : "none"
                    }}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <span className="text-sm font-semibold text-center" style={{ color: anesthesiaType === opt.id ? "#123B5C" : "#64798B" }}>
                      {isRTL ? opt.ar : opt.en}
                    </span>
                    {anesthesiaType === opt.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#12B7B5" }}>
                        <Check size={11} color="white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {anesthesiaType && (
                <div className="bg-white rounded-2xl p-5 border space-y-4" style={{ borderColor: "#D8E8EF" }}>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "Ø·Ø¨ÙŠØ¨ Ø§Ù„ØªØ®Ø¯ÙŠØ±" : "Anesthesiologist"}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}
                      defaultValue={isRTL ? "Ø¯. Ø³Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØµÙˆØ±ÙŠ" : "Dr. Sara Al-Mansouri"}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„ØªØ®Ø¯ÙŠØ±" : "Anesthesia Notes"}
                    </label>
                    <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}
                      defaultValue={isRTL ? "Ù…Ø±ÙŠØ¶Ø© Ø­Ø³Ø§Ø³Ø© Ù„Ù„Ø¨Ù†Ø³Ù„ÙŠÙ†. ÙŠÙÙˆØµÙ‰ Ø¨Ù…Ø±Ø§Ù‚Ø¨Ø© Ø¯Ù‚ÙŠÙ‚Ø© Ù„Ù„Ù‚Ù„Ø¨." : "Patient is allergic to Penicillin. Close cardiac monitoring recommended."}
                    />
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "#EAFFFB", border: "1px solid #12B7B530" }}>
                    <div className="flex items-center gap-2">
                      <Info size={14} style={{ color: "#12B7B5" }} />
                      <span className="text-xs font-semibold" style={{ color: "#12B7B5" }}>
                        {isRTL ? "ÙŠØªØ·Ù„Ø¨ Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ù†ÙØµÙ„Ø© Ù„Ù„ØªØ®Ø¯ÙŠØ±" : "Requires separate anesthesia consent"}
                      </span>
                    </div>
                    <p className="text-xs mt-1 ms-5" style={{ color: "#64798B" }}>
                      {isRTL ? "Ø³ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù†Ù…ÙˆØ°Ø¬ ØªØ®Ø¯ÙŠØ± Ù…Ù†ÙØµÙ„ ÙˆØ¥Ø¶Ø§ÙØªÙ‡ Ø¥Ù„Ù‰ Ø§Ù„Ø·Ø§Ø¨ÙˆØ±." : "A separate anesthesia form will be generated and added to the queue."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Education */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ù…ÙˆØ§Ø¯ Ø§Ù„ØªØ«Ù‚ÙŠÙ Ø§Ù„ØµØ­ÙŠ" : "Patient Education Materials"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ø®ØªØ± Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„ØªÙŠ Ø³ØªÙØ±Ø³Ù„ Ù…Ø¹ Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¢Ù…Ù† Ù„Ù„Ù…Ø±ÙŠØ¶" : "Select materials to send with the patient's secure link"}
                </p>
              </div>
              <div className="space-y-3">
                {educationMaterials.map(m => {
                  const sel = selectedMaterials.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMaterials(p => sel ? p.filter(x => x !== m.id) : [...p, m.id])}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border bg-white transition-all"
                      style={{
                        borderColor: sel ? "#2F90C7" : "#D8E8EF",
                        background: sel ? "#EAF6FF" : "white"
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: sel ? "#2F90C7" : "#F7FBFC" }}>
                        <BookOpen size={18} color={sel ? "white" : "#64798B"} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                          {isRTL ? m.titleAr : m.titleEn}
                        </div>
                        <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: "#64798B" }}>
                          <span>{isRTL ? m.typeAr : m.typeEn}</span>
                          <span>Â·</span>
                          <span>{m.duration} {isRTL ? "Ø¯Ù‚Ø§Ø¦Ù‚" : "read"}</span>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded flex items-center justify-center border transition-all"
                        style={{ borderColor: sel ? "#2F90C7" : "#D8E8EF", background: sel ? "#2F90C7" : "white" }}>
                        {sel && <Check size={11} color="white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="p-4 rounded-2xl" style={{ background: "#F1EFFF", border: "1px solid #6B5CE720" }}>
                <p className="text-sm" style={{ color: "#6B5CE7" }}>
                  {isRTL
                    ? "ðŸ’¡ ÙŠÙÙˆØµÙ‰ Ø¨Ù…Ø´Ø§Ø±ÙƒØ© Ù…ÙˆØ§Ø¯ Ø§Ù„ØªØ«Ù‚ÙŠÙ Ù‚Ø¨Ù„ Ù¢Ù¤ Ø³Ø§Ø¹Ø© Ù…Ù† Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ù„Ø¶Ù…Ø§Ù† ÙÙ‡Ù… Ø§Ù„Ù…Ø±ÙŠØ¶."
                    : "ðŸ’¡ Recommended to share education materials 24h before the procedure for best patient comprehension."}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Smart Review */}
          {step === 5 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø°ÙƒÙŠØ©" : "Smart Review"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ Ø¨Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„" : "AI compliance check before sending to patient"}
                </p>
              </div>
              {/* AI check card */}
              <div className="bg-white rounded-2xl p-5 border space-y-3" style={{ borderColor: "#D8E8EF" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EAFFFB" }}>
                    <Shield size={15} style={{ color: "#12B7B5" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "ÙØ­Øµ Ø§Ù„Ø§Ù…ØªØ«Ø§Ù„ â€” Ù©Ù¨Ùª ØµØ­ÙŠØ­" : "Compliance Check â€” 98% Valid"}
                  </span>
                  <span className="ms-auto px-2.5 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "#E8F9F4", color: "#19A978" }}>
                    {isRTL ? "Ø¬Ø§Ù‡Ø² Ù„Ù„Ø¥Ø±Ø³Ø§Ù„" : "Ready to Send"}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {[
                    { ok: true, en: "Patient identity verified", ar: "Ù‡ÙˆÙŠØ© Ø§Ù„Ù…Ø±ÙŠØ¶ Ù…Ø¤ÙƒØ¯Ø©" },
                    { ok: true, en: "Template approved by legal team", ar: "Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ù…Ø¹ØªÙ…Ø¯ Ù…Ù† Ø§Ù„ÙØ±ÙŠÙ‚ Ø§Ù„Ù‚Ø§Ù†ÙˆÙ†ÙŠ" },
                    { ok: true, en: "Risks documented", ar: "Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ù…ÙˆØ«Ù‚Ø©" },
                    { ok: true, en: "Anesthesia consent included", ar: "Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„ØªØ®Ø¯ÙŠØ± Ù…Ø¶Ù…Ù†Ø©" },
                    { ok: true, en: "Education materials attached", ar: "Ù…ÙˆØ§Ø¯ Ø§Ù„ØªØ«Ù‚ÙŠÙ Ù…Ø±ÙÙ‚Ø©" },
                    { ok: false, en: "Witness signature required (optional)", ar: "ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø´Ø§Ù‡Ø¯ Ù…Ø·Ù„ÙˆØ¨ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: item.ok ? "#E8F9F4" : "#FFF8E8" }}>
                        {item.ok
                          ? <Check size={11} style={{ color: "#19A978" }} />
                          : <Info size={11} style={{ color: "#D9A93B" }} />}
                      </div>
                      <span className="text-sm" style={{ color: item.ok ? "#102A43" : "#D9A93B" }}>
                        {isRTL ? item.ar : item.en}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Summary */}
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
                <div className="text-sm font-bold mb-3" style={{ color: "#102A43" }}>
                  {isRTL ? "Ù…Ù„Ø®Øµ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" : "Consent Summary"}
                </div>
                {[
                  { labelEn: "Patient", labelAr: "Ø§Ù„Ù…Ø±ÙŠØ¶", val: isRTL ? "Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù†" : "Layla Hassan" },
                  { labelEn: "Procedure", labelAr: "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡", val: isRTL ? "Ø§Ø³ØªØ¦ØµØ§Ù„ Ø§Ù„Ø²Ø§Ø¦Ø¯Ø© Ø§Ù„Ø¯ÙˆØ¯ÙŠØ©" : "Appendectomy" },
                  { labelEn: "Surgeon", labelAr: "Ø§Ù„Ø¬Ø±Ø§Ø­", val: isRTL ? "Ø¯. Ø£Ø­Ù…Ø¯ Ø®Ù„ÙŠÙ„" : "Dr. Ahmad Khalil" },
                  { labelEn: "Anesthesia", labelAr: "Ø§Ù„ØªØ®Ø¯ÙŠØ±", val: isRTL ? "ØªØ®Ø¯ÙŠØ± Ø¹Ø§Ù…" : "General Anesthesia" },
                  { labelEn: "Scheduled", labelAr: "Ø§Ù„Ù…ÙˆØ¹Ø¯", val: "12 Jun 2026 â€” 09:00" },
                  { labelEn: "Language", labelAr: "Ø§Ù„Ù„ØºØ©", val: isRTL ? "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" : "Arabic" },
                ].map(row => (
                  <div key={row.labelEn} className="flex justify-between py-2 border-t text-sm" style={{ borderColor: "#F7FBFC" }}>
                    <span style={{ color: "#64798B" }}>{isRTL ? row.labelAr : row.labelEn}</span>
                    <span className="font-semibold" style={{ color: "#102A43" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Send Link */}
          {step === 6 && !sent && (
            <div className="max-w-md mx-auto space-y-5 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "linear-gradient(135deg, #2F90C7, #12B7B5)" }}>
                <Send size={28} color="white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¢Ù…Ù†" : "Send Secure Link"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø³ÙŠØªÙ„Ù‚Ù‰ Ø§Ù„Ù…Ø±ÙŠØ¶ Ø±Ø§Ø¨Ø·Ø§Ù‹ Ø¢Ù…Ù†Ø§Ù‹ Ø¹Ø¨Ø± SMS Ù„Ù„ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ" : "Patient will receive a secure SMS link for e-signature"}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 border text-left space-y-3" style={{ borderColor: "#D8E8EF" }}>
                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "Ø±Ù‚Ù… Ø¬ÙˆØ§Ù„ Ø§Ù„Ù…Ø±ÙŠØ¶" : "Patient Mobile"}
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: "#D8E8EF", background: "#EAF6FF", color: "#2F90C7" }}>+966</span>
                    <input className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: "#D8E8EF" }} defaultValue="055 123 4567" />
                  </div>
                </div>
                <div className="p-3 rounded-xl text-sm" style={{ background: "#EAFFFB", color: "#64798B" }}>
                  {isRTL
                    ? "ðŸ“± Ø³ÙŠØµÙ„ Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø¹ Ø±Ù…Ø² OTP Ù„Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø©. ØµØ§Ù„Ø­ Ù„Ù…Ø¯Ø© Ù¤Ù¨ Ø³Ø§Ø¹Ø©."
                    : "ðŸ“± Consent link + one-time OTP will be sent. Valid for 48 hours."}
                </div>
              </div>
              <button
                onClick={() => setSent(true)}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(90deg, #2F90C7, #12B7B5)" }}
              >
                <Send size={16} />
                {isRTL ? "Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¢Ù…Ù†" : "Send Secure Link"}
              </button>
            </div>
          )}

          {/* Sent confirmation */}
          {step === 6 && sent && (
            <div className="max-w-md mx-auto text-center space-y-5 py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "#E8F9F4" }}>
                <Check size={36} style={{ color: "#19A978" }} />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "#102A43" }}>
                {isRTL ? "ØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¨Ù†Ø¬Ø§Ø­!" : "Link Sent Successfully!"}
              </h2>
              <p className="text-sm" style={{ color: "#64798B" }}>
                {isRTL
                  ? "ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¢Ù…Ù† Ø¥Ù„Ù‰ Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù† (+966 055 123 4567)"
                  : "Secure consent link sent to Layla Hassan (+966 055 123 4567)"}
              </p>
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ù„Ø±Ø§Ø¨Ø· Ø§Ù„Ø¢Ù…Ù†" : "SECURE LINK"}
                </div>
                <div className="px-3 py-2 rounded-xl text-xs font-mono text-left" style={{ background: "#F7FBFC", color: "#2F90C7", wordBreak: "break-all" }}>
                  https://consent.wathiqcare.com/p/Xq9mR2kL4nT
                </div>
                <div className="mt-3 text-xs" style={{ color: "#64798B" }}>
                  {isRTL ? "ØµØ§Ù„Ø­ Ù„Ù…Ø¯Ø© Ù¤Ù¨ Ø³Ø§Ø¹Ø© Â· Ù…Ø´ÙØ± Â· OTP Ù…Ø·Ù„ÙˆØ¨" : "Valid 48h Â· Encrypted Â· OTP required"}
                </div>
              </div>
              <button
                onClick={() => { setStep(0); setSent(false); setSelectedTemplate(null); setAnesthesiaType(null); setSelectedMaterials([]); }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#123B5C" }}
              >
                {isRTL ? "Ø¥Ù†Ø´Ø§Ø¡ Ù…ÙˆØ§ÙÙ‚Ø© Ø¬Ø¯ÙŠØ¯Ø©" : "Create New Consent"}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        {!(step === 6 && sent) && (
          <div className="bg-white border-t px-6 py-4 flex items-center justify-between" style={{ borderColor: "#D8E8EF" }}>
            <button
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-30"
              style={{ borderColor: "#D8E8EF", color: "#64798B" }}
            >
              <ChevronLeft size={15} />
              {isRTL ? "Ø§Ù„Ø³Ø§Ø¨Ù‚" : "Back"}
            </button>
            <span className="text-xs" style={{ color: "#64798B" }}>
              {isRTL ? `Ø§Ù„Ø®Ø·ÙˆØ© ${step + 1} Ù…Ù† 7` : `Step ${step + 1} of 7`}
            </span>
            <button
              onClick={step === 6 ? () => setSent(true) : next}
              disabled={step === 1 && !selectedTemplate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: step === 6 ? "linear-gradient(90deg,#19A978,#0ECBA1)" : "linear-gradient(90deg,#2F90C7,#12B7B5)" }}
            >
              {step === 6 ? (isRTL ? "Ø¥Ø±Ø³Ø§Ù„" : "Send") : (isRTL ? "Ø§Ù„ØªØ§Ù„ÙŠ" : "Next")}
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Right panel: consent summary */}
      {step < 6 && (
        <div className="w-72 border-l bg-white overflow-y-auto flex-shrink-0" style={{ borderColor: "#D8E8EF" }}>
          <div className="px-4 py-4 border-b" style={{ borderColor: "#D8E8EF" }}>
            <div className="flex items-center gap-2">
              <Clipboard size={14} style={{ color: "#2F90C7" }} />
              <span className="text-sm font-bold" style={{ color: "#102A43" }}>
                {isRTL ? "Ù…Ù„Ø®Øµ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©" : "Consent Summary"}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Patient */}
            <div className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#64798B" }}>
                {isRTL ? "Ø§Ù„Ù…Ø±ÙŠØ¶" : "PATIENT"}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#2F90C7,#12B7B5)" }}>L</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                    {isRTL ? "Ù„ÙŠÙ„Ù‰ Ø­Ø³Ù†" : "Layla Hassan"}
                  </div>
                  <div className="text-xs" style={{ color: "#64798B" }}>MRN-204871</div>
                </div>
              </div>
            </div>
            {selectedTpl && (
              <div className="p-3 rounded-xl" style={{ background: "#EAF6FF" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡" : "PROCEDURE"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#123B5C" }}>
                  {isRTL ? selectedTpl.nameAr : selectedTpl.nameEn}
                </div>
              </div>
            )}
            {anesthesiaType && (
              <div className="p-3 rounded-xl" style={{ background: "#EAFFFB" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ù„ØªØ®Ø¯ÙŠØ±" : "ANESTHESIA"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#12B7B5" }}>
                  {isRTL
                    ? anesthesiaType === "general" ? "ØªØ®Ø¯ÙŠØ± Ø¹Ø§Ù…" : anesthesiaType === "local" ? "ØªØ®Ø¯ÙŠØ± Ù…ÙˆØ¶Ø¹ÙŠ" : "ØªØ®Ø¯ÙŠØ± Ù†Ø®Ø§Ø¹ÙŠ"
                    : anesthesiaType === "general" ? "General" : anesthesiaType === "local" ? "Local" : "Spinal"}
                </div>
              </div>
            )}
            {selectedMaterials.length > 0 && (
              <div className="p-3 rounded-xl" style={{ background: "#F1EFFF" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "Ø§Ù„Ù…ÙˆØ§Ø¯ Ø§Ù„ØªØ¹Ù„ÙŠÙ…ÙŠØ©" : "EDUCATION"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#6B5CE7" }}>
                  {selectedMaterials.length} {isRTL ? "Ù…ÙˆØ§Ø¯ Ù…Ø±ÙÙ‚Ø©" : "materials attached"}
                </div>
              </div>
            )}
            <div className="p-3 rounded-xl border border-dashed" style={{ borderColor: "#D8E8EF" }}>
              <div className="text-xs" style={{ color: "#64798B" }}>
                {isRTL ? "Ø£ÙƒÙ…Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø®Ø·ÙˆØ§Øª Ù„Ø¥Ø±Ø³Ø§Ù„ Ø±Ø§Ø¨Ø· Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ø¢Ù…Ù†" : "Complete all steps to send the secure consent link to the patient"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

