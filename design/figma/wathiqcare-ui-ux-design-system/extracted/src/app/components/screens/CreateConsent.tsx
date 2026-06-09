import { useState } from "react";
import {
  User, FileText, Stethoscope, Wind, BookOpen, Shield, Send,
  ChevronRight, ChevronLeft, Check, Search, AlertTriangle, Info,
  Phone, Calendar, Clipboard
} from "lucide-react";

interface Props { lang: "en" | "ar" }

const steps = {
  en: ["Patient Context","Template","Procedure Details","Anesthesia","Education","Review","Send Link"],
  ar: ["بيانات المريض","النموذج","تفاصيل الإجراء","التخدير","التثقيف","المراجعة","إرسال الرابط"],
};

const stepIcons = [User, FileText, Stethoscope, Wind, BookOpen, Shield, Send];

const templates = [
  { id: "append", nameEn: "Appendectomy", nameAr: "استئصال الزائدة الدودية", catEn: "General Surgery", catAr: "جراحة عامة", risk: "medium" },
  { id: "cardiac", nameEn: "Cardiac Catheterization", nameAr: "قسطرة قلبية", catEn: "Cardiology", catAr: "أمراض القلب", risk: "high" },
  { id: "knee", nameEn: "Knee Replacement", nameAr: "تبديل مفصل الركبة", catEn: "Orthopedics", catAr: "جراحة العظام", risk: "high" },
  { id: "colonoscopy", nameEn: "Colonoscopy", nameAr: "تنظير القولون", catEn: "Gastroenterology", catAr: "أمراض الجهاز الهضمي", risk: "low" },
  { id: "cataract", nameEn: "Cataract Surgery", nameAr: "جراحة الساد", catEn: "Ophthalmology", catAr: "طب العيون", risk: "low" },
  { id: "hernia", nameEn: "Hernia Repair", nameAr: "إصلاح الفتق", catEn: "General Surgery", catAr: "جراحة عامة", risk: "medium" },
];

const riskColor: Record<string, string> = { low: "#19A978", medium: "#D9A93B", high: "#E84B7A" };
const riskLabel: Record<string, { en: string; ar: string }> = {
  low: { en: "Low Risk", ar: "مخاطر منخفضة" },
  medium: { en: "Med Risk", ar: "مخاطر متوسطة" },
  high: { en: "High Risk", ar: "مخاطر عالية" },
};

const educationMaterials = [
  { id: "a1", titleEn: "Pre-operative Instructions", titleAr: "تعليمات ما قبل العملية", typeEn: "PDF Guide", typeAr: "دليل PDF", duration: "5 min" },
  { id: "a2", titleEn: "What to Expect During Surgery", titleAr: "ما يمكن توقعه أثناء الجراحة", typeEn: "Video", typeAr: "فيديو", duration: "3 min" },
  { id: "a3", titleEn: "Recovery & Post-op Care", titleAr: "التعافي والرعاية بعد العملية", typeEn: "Infographic", typeAr: "إنفوغرافيك", duration: "2 min" },
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
                  {isRTL ? "بيانات المريض" : "Patient Context"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "أدخل معلومات المريض أو ابحث في السجلات" : "Enter patient information or search existing records"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border space-y-4" style={{ borderColor: "#D8E8EF" }}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "الاسم الكامل" : "Full Name"}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:ring-2"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                      placeholder={isRTL ? "أدخل اسم المريض" : "Enter patient name"}
                      defaultValue={isRTL ? "ليلى حسن" : "Layla Hassan"}
                    />
                  </div>
                  <div className="w-36">
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "رقم الملف" : "MRN"}
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
                      {isRTL ? "رقم الجوال" : "Mobile"}
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
                      {isRTL ? "تاريخ الميلاد" : "Date of Birth"}
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}>
                      <Calendar size={13} style={{ color: "#64798B" }} />
                      <span>14 / 03 / 1990</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "الجنسية / اللغة المفضلة" : "Nationality / Preferred Language"}
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
                    {isRTL ? "الحالة السريرية / الملاحظات" : "Clinical Notes"}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                    style={{ borderColor: "#D8E8EF", background: "#F7FBFC", color: "#102A43" }}
                    defaultValue={isRTL ? "مريضة تبلغ من العمر 34 عاماً، تعاني من آلام في البطن مع علامات التهاب الزائدة الدودية." : "34-year-old female presenting with acute abdominal pain, signs consistent with appendicitis."}
                  />
                </div>
              </div>

              {/* Allergies & flags */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-2xl p-4 border" style={{ borderColor: "#D8E8EF" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} style={{ color: "#D9A93B" }} />
                    <span className="text-sm font-semibold" style={{ color: "#102A43" }}>
                      {isRTL ? "الحساسية" : "Allergies"}
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
                      {isRTL ? "الحالات المصاحبة" : "Comorbidities"}
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
                  {isRTL ? "اختر نموذج الموافقة" : "Select Consent Template"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "اختر من مكتبة النماذج المعتمدة" : "Choose from the approved template library"}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border" style={{ borderColor: "#D8E8EF" }}>
                <Search size={15} style={{ color: "#64798B" }} />
                <input
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder={isRTL ? "البحث عن نموذج..." : "Search templates..."}
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
                        <Check size={12} /> {isRTL ? "محدد" : "Selected"}
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
                  {isRTL ? "تفاصيل الإجراء" : "Procedure Details"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "أكمل تفاصيل الإجراء الجراحي" : "Complete the procedure-specific details"}
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
                  { labelEn: "Surgeon Name", labelAr: "اسم الجراح", val: isRTL ? "د. أحمد خليل" : "Dr. Ahmad Khalil" },
                  { labelEn: "Scheduled Date", labelAr: "تاريخ العملية", val: "12 / 06 / 2026" },
                  { labelEn: "Hospital / Operating Room", labelAr: "المستشفى / غرفة العمليات", val: isRTL ? "مستشفى الملك عبدالعزيز — غرفة ٣" : "King Abdulaziz Hospital — OR 3" },
                  { labelEn: "Procedure Duration (est.)", labelAr: "مدة الإجراء (تقديرية)", val: "90 min" },
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
                    {isRTL ? "المخاطر والمضاعفات الرئيسية" : "Key Risks & Complications"}
                  </label>
                  <div className="space-y-2">
                    {(isRTL
                      ? ["نزيف", "عدوى", "تلف الأعضاء المجاورة", "الحاجة إلى إجراء آخر"]
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
                  {isRTL ? "قرار التخدير" : "Anesthesia Decision"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "حدد نوع التخدير وأضف ملاحظات طبيب التخدير" : "Select anesthesia type and add anesthesiologist notes"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: "general", icon: "🫁", en: "General Anesthesia", ar: "تخدير عام" },
                  { id: "local", icon: "💉", en: "Local Anesthesia", ar: "تخدير موضعي" },
                  { id: "spinal", icon: "🩺", en: "Spinal / Epidural", ar: "تخدير نخاعي / فوق الجافية" },
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
                      {isRTL ? "طبيب التخدير" : "Anesthesiologist"}
                    </label>
                    <input
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}
                      defaultValue={isRTL ? "د. سارة المنصوري" : "Dr. Sara Al-Mansouri"}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                      {isRTL ? "ملاحظات التخدير" : "Anesthesia Notes"}
                    </label>
                    <textarea rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-none"
                      style={{ borderColor: "#D8E8EF", background: "#F7FBFC" }}
                      defaultValue={isRTL ? "مريضة حساسة للبنسلين. يُوصى بمراقبة دقيقة للقلب." : "Patient is allergic to Penicillin. Close cardiac monitoring recommended."}
                    />
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: "#EAFFFB", border: "1px solid #12B7B530" }}>
                    <div className="flex items-center gap-2">
                      <Info size={14} style={{ color: "#12B7B5" }} />
                      <span className="text-xs font-semibold" style={{ color: "#12B7B5" }}>
                        {isRTL ? "يتطلب موافقة منفصلة للتخدير" : "Requires separate anesthesia consent"}
                      </span>
                    </div>
                    <p className="text-xs mt-1 ms-5" style={{ color: "#64798B" }}>
                      {isRTL ? "سيتم إنشاء نموذج تخدير منفصل وإضافته إلى الطابور." : "A separate anesthesia form will be generated and added to the queue."}
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
                  {isRTL ? "مواد التثقيف الصحي" : "Patient Education Materials"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "اختر المواد التي ستُرسل مع الرابط الآمن للمريض" : "Select materials to send with the patient's secure link"}
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
                          <span>·</span>
                          <span>{m.duration} {isRTL ? "دقائق" : "read"}</span>
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
                    ? "💡 يُوصى بمشاركة مواد التثقيف قبل ٢٤ ساعة من الإجراء لضمان فهم المريض."
                    : "💡 Recommended to share education materials 24h before the procedure for best patient comprehension."}
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Smart Review */}
          {step === 5 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "المراجعة الذكية" : "Smart Review"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "مراجعة الامتثال بالذكاء الاصطناعي قبل الإرسال" : "AI compliance check before sending to patient"}
                </p>
              </div>
              {/* AI check card */}
              <div className="bg-white rounded-2xl p-5 border space-y-3" style={{ borderColor: "#D8E8EF" }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EAFFFB" }}>
                    <Shield size={15} style={{ color: "#12B7B5" }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "فحص الامتثال — ٩٨٪ صحيح" : "Compliance Check — 98% Valid"}
                  </span>
                  <span className="ms-auto px-2.5 py-0.5 rounded-lg text-xs font-semibold" style={{ background: "#E8F9F4", color: "#19A978" }}>
                    {isRTL ? "جاهز للإرسال" : "Ready to Send"}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {[
                    { ok: true, en: "Patient identity verified", ar: "هوية المريض مؤكدة" },
                    { ok: true, en: "Template approved by legal team", ar: "النموذج معتمد من الفريق القانوني" },
                    { ok: true, en: "Risks documented", ar: "المخاطر موثقة" },
                    { ok: true, en: "Anesthesia consent included", ar: "موافقة التخدير مضمنة" },
                    { ok: true, en: "Education materials attached", ar: "مواد التثقيف مرفقة" },
                    { ok: false, en: "Witness signature required (optional)", ar: "توقيع الشاهد مطلوب (اختياري)" },
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
                  {isRTL ? "ملخص الموافقة" : "Consent Summary"}
                </div>
                {[
                  { labelEn: "Patient", labelAr: "المريض", val: isRTL ? "ليلى حسن" : "Layla Hassan" },
                  { labelEn: "Procedure", labelAr: "الإجراء", val: isRTL ? "استئصال الزائدة الدودية" : "Appendectomy" },
                  { labelEn: "Surgeon", labelAr: "الجراح", val: isRTL ? "د. أحمد خليل" : "Dr. Ahmad Khalil" },
                  { labelEn: "Anesthesia", labelAr: "التخدير", val: isRTL ? "تخدير عام" : "General Anesthesia" },
                  { labelEn: "Scheduled", labelAr: "الموعد", val: "12 Jun 2026 — 09:00" },
                  { labelEn: "Language", labelAr: "اللغة", val: isRTL ? "العربية" : "Arabic" },
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
                  {isRTL ? "إرسال الرابط الآمن" : "Send Secure Link"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                  {isRTL ? "سيتلقى المريض رابطاً آمناً عبر SMS للتوقيع الإلكتروني" : "Patient will receive a secure SMS link for e-signature"}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-5 border text-left space-y-3" style={{ borderColor: "#D8E8EF" }}>
                <div>
                  <label className="text-sm font-semibold block mb-1.5" style={{ color: "#102A43" }}>
                    {isRTL ? "رقم جوال المريض" : "Patient Mobile"}
                  </label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2.5 rounded-xl text-sm border font-medium" style={{ borderColor: "#D8E8EF", background: "#EAF6FF", color: "#2F90C7" }}>+966</span>
                    <input className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none" style={{ borderColor: "#D8E8EF" }} defaultValue="055 123 4567" />
                  </div>
                </div>
                <div className="p-3 rounded-xl text-sm" style={{ background: "#EAFFFB", color: "#64798B" }}>
                  {isRTL
                    ? "📱 سيصل رابط الموافقة مع رمز OTP لمرة واحدة. صالح لمدة ٤٨ ساعة."
                    : "📱 Consent link + one-time OTP will be sent. Valid for 48 hours."}
                </div>
              </div>
              <button
                onClick={() => setSent(true)}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(90deg, #2F90C7, #12B7B5)" }}
              >
                <Send size={16} />
                {isRTL ? "إرسال الرابط الآمن" : "Send Secure Link"}
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
                {isRTL ? "تم الإرسال بنجاح!" : "Link Sent Successfully!"}
              </h2>
              <p className="text-sm" style={{ color: "#64798B" }}>
                {isRTL
                  ? "تم إرسال رابط الموافقة الآمن إلى ليلى حسن (+966 055 123 4567)"
                  : "Secure consent link sent to Layla Hassan (+966 055 123 4567)"}
              </p>
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#D8E8EF" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "#64798B" }}>
                  {isRTL ? "الرابط الآمن" : "SECURE LINK"}
                </div>
                <div className="px-3 py-2 rounded-xl text-xs font-mono text-left" style={{ background: "#F7FBFC", color: "#2F90C7", wordBreak: "break-all" }}>
                  https://consent.wathiqcare.com/p/Xq9mR2kL4nT
                </div>
                <div className="mt-3 text-xs" style={{ color: "#64798B" }}>
                  {isRTL ? "صالح لمدة ٤٨ ساعة · مشفر · OTP مطلوب" : "Valid 48h · Encrypted · OTP required"}
                </div>
              </div>
              <button
                onClick={() => { setStep(0); setSent(false); setSelectedTemplate(null); setAnesthesiaType(null); setSelectedMaterials([]); }}
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#123B5C" }}
              >
                {isRTL ? "إنشاء موافقة جديدة" : "Create New Consent"}
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
              {isRTL ? "السابق" : "Back"}
            </button>
            <span className="text-xs" style={{ color: "#64798B" }}>
              {isRTL ? `الخطوة ${step + 1} من 7` : `Step ${step + 1} of 7`}
            </span>
            <button
              onClick={step === 6 ? () => setSent(true) : next}
              disabled={step === 1 && !selectedTemplate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: step === 6 ? "linear-gradient(90deg,#19A978,#0ECBA1)" : "linear-gradient(90deg,#2F90C7,#12B7B5)" }}
            >
              {step === 6 ? (isRTL ? "إرسال" : "Send") : (isRTL ? "التالي" : "Next")}
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
                {isRTL ? "ملخص الموافقة" : "Consent Summary"}
              </span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {/* Patient */}
            <div className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#64798B" }}>
                {isRTL ? "المريض" : "PATIENT"}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#2F90C7,#12B7B5)" }}>L</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                    {isRTL ? "ليلى حسن" : "Layla Hassan"}
                  </div>
                  <div className="text-xs" style={{ color: "#64798B" }}>MRN-204871</div>
                </div>
              </div>
            </div>
            {selectedTpl && (
              <div className="p-3 rounded-xl" style={{ background: "#EAF6FF" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "الإجراء" : "PROCEDURE"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#123B5C" }}>
                  {isRTL ? selectedTpl.nameAr : selectedTpl.nameEn}
                </div>
              </div>
            )}
            {anesthesiaType && (
              <div className="p-3 rounded-xl" style={{ background: "#EAFFFB" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "التخدير" : "ANESTHESIA"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#12B7B5" }}>
                  {isRTL
                    ? anesthesiaType === "general" ? "تخدير عام" : anesthesiaType === "local" ? "تخدير موضعي" : "تخدير نخاعي"
                    : anesthesiaType === "general" ? "General" : anesthesiaType === "local" ? "Local" : "Spinal"}
                </div>
              </div>
            )}
            {selectedMaterials.length > 0 && (
              <div className="p-3 rounded-xl" style={{ background: "#F1EFFF" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "#64798B" }}>
                  {isRTL ? "المواد التعليمية" : "EDUCATION"}
                </div>
                <div className="text-sm font-semibold" style={{ color: "#6B5CE7" }}>
                  {selectedMaterials.length} {isRTL ? "مواد مرفقة" : "materials attached"}
                </div>
              </div>
            )}
            <div className="p-3 rounded-xl border border-dashed" style={{ borderColor: "#D8E8EF" }}>
              <div className="text-xs" style={{ color: "#64798B" }}>
                {isRTL ? "أكمل جميع الخطوات لإرسال رابط الموافقة الآمن" : "Complete all steps to send the secure consent link to the patient"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
