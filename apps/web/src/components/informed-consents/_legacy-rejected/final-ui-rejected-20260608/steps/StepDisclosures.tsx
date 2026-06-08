"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Plus, FileText, Eye, Archive, ClipboardCheck } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

const SMART_DISCLOSURE_TEMPLATES: Record<string, { en: string; ar: string }> = {
  procedure: {
    en: "The proposed procedure has been explained in clear, patient-friendly language, including what will be done, why it is recommended, the expected benefits, and the main steps involved. The patient was given the opportunity to ask questions before making a decision.",
    ar: "\u062a\u0645 \u0634\u0631\u062d \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0642\u062a\u0631\u062d \u0644\u0644\u0645\u0631\u064a\u0636 \u0628\u0644\u063a\u0629 \u0648\u0627\u0636\u062d\u0629 \u0648\u0645\u0628\u0633\u0637\u0629\u060c \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0637\u0628\u064a\u0639\u0629 \u0627\u0644\u0625\u062c\u0631\u0627\u0621\u060c \u0648\u0633\u0628\u0628 \u0627\u0644\u062a\u0648\u0635\u064a\u0629 \u0628\u0647\u060c \u0648\u0627\u0644\u0641\u0648\u0627\u0626\u062f \u0627\u0644\u0645\u062a\u0648\u0642\u0639\u0629\u060c \u0648\u0627\u0644\u062e\u0637\u0648\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629 \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0647."
  },
  risks: {
    en: "Patient-specific risks have been discussed, including risks related to medical history, current medications, allergies, previous procedures, and other relevant clinical factors. These factors may affect the expected outcome, recovery, or treatment plan.",
    ar: "\u062a\u0645\u062a \u0645\u0646\u0627\u0642\u0634\u0629 \u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0631\u064a\u0636\u060c \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0645\u0631\u0636\u064a\u060c \u0648\u0627\u0644\u0623\u062f\u0648\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629\u060c \u0648\u0627\u0644\u062d\u0633\u0627\u0633\u064a\u0629\u060c \u0648\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0627\u0628\u0642\u0629\u060c \u0648\u0623\u064a \u0639\u0648\u0627\u0645\u0644 \u0633\u0631\u064a\u0631\u064a\u0629 \u0623\u062e\u0631\u0649 \u0630\u0627\u062a \u0635\u0644\u0629."
  },
  alternatives: {
    en: "Reasonable alternatives were discussed, including observation, medication, non-surgical management, referral, or other clinically appropriate options. The potential benefits and limitations of each option were explained.",
    ar: "\u062a\u0645\u062a \u0645\u0646\u0627\u0642\u0634\u0629 \u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060c \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u062f\u0648\u0646 \u062a\u062f\u062e\u0644\u060c \u0623\u0648 \u0627\u0644\u0639\u0644\u0627\u062c \u0627\u0644\u062f\u0648\u0627\u0626\u064a\u060c \u0623\u0648 \u0627\u0644\u062a\u062f\u0628\u064a\u0631 \u063a\u064a\u0631 \u0627\u0644\u062c\u0631\u0627\u062d\u064a\u060c \u0623\u0648 \u0623\u064a \u062e\u064a\u0627\u0631\u0627\u062a \u0623\u062e\u0631\u0649 \u0645\u0646\u0627\u0633\u0628\u0629 \u0633\u0631\u064a\u0631\u064a\u064b\u0627."
  },
  refusal: {
    en: "The risks of refusing or delaying the recommended procedure were explained. These may include persistence or worsening of symptoms, progression of the condition, urgent care needs, complications, or reduced effectiveness of later treatment.",
    ar: "\u062a\u0645 \u0634\u0631\u062d \u0645\u062e\u0627\u0637\u0631 \u0631\u0641\u0636 \u0623\u0648 \u062a\u0623\u062c\u064a\u0644 \u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u060c \u0648\u0642\u062f \u062a\u0634\u0645\u0644 \u0627\u0633\u062a\u0645\u0631\u0627\u0631 \u0627\u0644\u0623\u0639\u0631\u0627\u0636 \u0623\u0648 \u062a\u0641\u0627\u0642\u0645\u0647\u0627\u060c \u0623\u0648 \u062a\u0637\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u0629\u060c \u0623\u0648 \u0627\u0644\u062d\u0627\u062c\u0629 \u0625\u0644\u0649 \u0631\u0639\u0627\u064a\u0629 \u0639\u0627\u062c\u0644\u0629\u060c \u0623\u0648 \u062d\u062f\u0648\u062b \u0645\u0636\u0627\u0639\u0641\u0627\u062a."
  },
  default: {
    en: "This disclosure was reviewed with the patient in plain language. The patient was informed of the relevant benefits, risks, alternatives, and possible consequences of refusal or delay, and was given the opportunity to ask questions.",
    ar: "\u062a\u0645\u062a \u0645\u0631\u0627\u062c\u0639\u0629 \u0647\u0630\u0627 \u0627\u0644\u0625\u0641\u0635\u0627\u062d \u0645\u0639 \u0627\u0644\u0645\u0631\u064a\u0636 \u0628\u0644\u063a\u0629 \u0648\u0627\u0636\u062d\u0629. \u0648\u062a\u0645 \u0625\u0628\u0644\u0627\u063a \u0627\u0644\u0645\u0631\u064a\u0636 \u0628\u0627\u0644\u0641\u0648\u0627\u0626\u062f \u0648\u0627\u0644\u0645\u062e\u0627\u0637\u0631 \u0648\u0627\u0644\u0628\u062f\u0627\u0626\u0644 \u0630\u0627\u062a \u0627\u0644\u0635\u0644\u0629\u060c \u0648\u0627\u0644\u0622\u062b\u0627\u0631 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629 \u0644\u0644\u0631\u0641\u0636 \u0623\u0648 \u0627\u0644\u062a\u0623\u062c\u064a\u0644."
  }
};

const resolveSmartDisclosureTemplate = (fieldId: string, fieldLabel?: string) => {
  const key = `${fieldId} ${fieldLabel || ""}`.toLowerCase();

  if (key.includes("risk")) return SMART_DISCLOSURE_TEMPLATES.risks;
  if (key.includes("alternative")) return SMART_DISCLOSURE_TEMPLATES.alternatives;
  if (key.includes("refusal")) return SMART_DISCLOSURE_TEMPLATES.refusal;
  if (key.includes("procedure") || key.includes("description") || key.includes("reason") || key.includes("indication")) {
    return SMART_DISCLOSURE_TEMPLATES.procedure;
  }

  return SMART_DISCLOSURE_TEMPLATES.default;
};



interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
}

type DisclosureField = {
  id: string;
  label: string;
  labelAr: string;
  placeholder: string;
  placeholderAr: string;
  defaultEn: string;
  defaultAr: string;
  required: boolean;
  inPatientView: boolean;
  inPDF: boolean;
  inEvidence: boolean;
  inAudit: boolean;
};

const fields: DisclosureField[] = [
  {
    id: 'proc_desc', label: 'Procedure Description', labelAr: 'وصف الإجراء',
    placeholder: 'Describe the procedure in plain language...', placeholderAr: 'صف الإجراء بلغة واضحة...',
    defaultEn: 'Laparoscopic cholecystectomy is a minimally invasive surgical procedure to remove the gallbladder through small incisions using a camera and specialized instruments.',
    defaultAr: 'استئصال المرارة بالمنظار هو إجراء جراحي طفيف التوغل لإزالة المرارة عبر شقوق صغيرة باستخدام كاميرا وأدوات متخصصة.',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
  {
    id: 'reason', label: 'Reason for Procedure', labelAr: 'سبب الإجراء',
    placeholder: 'Clinical indication...', placeholderAr: 'المؤشر السريري...',
    defaultEn: 'Symptomatic cholelithiasis with recurrent biliary colic unresponsive to conservative management.',
    defaultAr: 'تحصّ صفراوي مصحوب بأعراض مع مغص صفراوي متكرر لا يستجيب للعلاج التحفظي.',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
  {
    id: 'risks', label: 'Patient-Specific Risks', labelAr: 'المخاطر الخاصة بالمريض',
    placeholder: 'Procedure-specific and patient-specific risks...', placeholderAr: 'مخاطر خاصة بالإجراء والمريض...',
    defaultEn: 'Risks include bleeding (2%), infection (1–3%), bile duct injury (0.3–0.5%), conversion to open surgery, injury to adjacent organs. Given patient\'s allergy to NSAIDs, post-operative pain management will be modified.',
    defaultAr: 'المخاطر تشمل: النزيف (2%)، العدوى (1-3%)، إصابة القناة الصفراوية (0.3-0.5%)، التحول إلى الجراحة المفتوحة، إصابة الأعضاء المجاورة. نظراً لحساسية المريض من مضادات الالتهاب، ستُعدَّل إدارة الألم بعد العملية.',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
  {
    id: 'outcomes', label: 'Expected Outcomes', labelAr: 'النتائج المتوقعة',
    placeholder: 'Expected benefits and outcomes...', placeholderAr: 'الفوائد والنتائج المتوقعة...',
    defaultEn: 'Resolution of gallbladder symptoms in >95% of cases. Short hospital stay (1–2 days). Quick return to normal activities within 1–2 weeks.',
    defaultAr: 'حل أعراض المرارة في أكثر من 95% من الحالات. فترة إقامة قصيرة بالمستشفى (1-2 أيام). العودة السريعة للأنشطة الاعتيادية خلال 1-2 أسبوع.',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: false,
  },
  {
    id: 'alternatives', label: 'Alternatives Discussed', labelAr: 'البدائل التي تمت مناقشتها',
    placeholder: 'Conservative management, alternative procedures...', placeholderAr: 'الإدارة التحفظية، الإجراءات البديلة...',
    defaultEn: 'Conservative management with dietary modifications (discussed — not suitable due to recurrent attacks). Open cholecystectomy (discussed — more invasive). Percutaneous cholecystostomy (not indicated in this case).',
    defaultAr: 'الإدارة التحفظية بتعديل النظام الغذائي (نوقشت — غير مناسبة بسبب النوبات المتكررة). الاستئصال المفتوح (نوقش — أكثر توغلاً). تصريف المرارة عبر الجلد (غير مشار إليه في هذه الحالة).',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
  {
    id: 'refusal', label: 'Risks of Refusal', labelAr: 'مخاطر الرفض',
    placeholder: 'What happens if the patient refuses...', placeholderAr: 'ما يحدث إذا رفض المريض...',
    defaultEn: 'Untreated cholelithiasis may lead to acute cholecystitis, gangrenous cholecystitis, perforation, bile peritonitis, sepsis, and life-threatening complications.',
    defaultAr: 'قد يؤدي التحصّ الصفراوي غير المعالج إلى التهاب المرارة الحاد، والتهاب المرارة الغنغريني، والانثقاب، والتهاب الصفاق الصفراوي، والإنتان، ومضاعفات تهدد الحياة.',
    required: true, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
  {
    id: 'special_warnings', label: 'Special Warnings', labelAr: 'تحذيرات خاصة',
    placeholder: 'Any special warnings specific to this patient...', placeholderAr: 'أي تحذيرات خاصة بهذا المريض...',
    defaultEn: 'Patient has documented allergy to NSAIDs — alternative analgesic protocol will be used. Patient to fast from midnight. Anticoagulants must be stopped 5 days prior.',
    defaultAr: 'المريض لديه حساسية موثقة من مضادات الالتهاب — سيُستخدم بروتوكول مسكنات بديل. الصيام من منتصف الليل. يجب إيقاف مضادات التخثر قبل 5 أيام.',
    required: false, inPatientView: true, inPDF: true, inEvidence: true, inAudit: true,
  },
];

const IndicatorTag = ({ active, label }: { active: boolean; label: string }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-[#F4F6F9] border-[#D8DCE3] text-[#6B7280]'}`}>
    {label}
  </span>
);

export function StepDisclosures({ lang, onNext, onPrev, onComplete }: Props) {
  const [values, setValues] = useState<Record<string, { en: string; ar: string }>>(
    Object.fromEntries(fields.map(f => [f.id, { en: f.defaultEn, ar: f.defaultAr }]))
  );
  const [showAr, setShowAr] = useState(false);
  const [visibleNotes, setVisibleNotes] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const toggleNote = (fieldId: string) => {
    setVisibleNotes(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const applyStandardTemplate = (fieldId: string, fieldLabel?: string) => {
    const template = resolveSmartDisclosureTemplate(fieldId, fieldLabel);

    setValues(prev => ({
      ...prev,
      [fieldId]: {
        ...(prev[fieldId] || {}),
        en: template.en,
        ar: template.ar,
      },
    }));
  };

  const handleComplete = () => {
    const disclosurePayload = Object.fromEntries(
      Object.entries(values).map(([fieldId, value]) => [
        fieldId,
        {
          ...value,
          note: notes[fieldId] || '',
        },
      ]),
    );

    onComplete('disclosures', ['v9', 'v10', 'v11', 'v12'], {
      disclosures: disclosurePayload,
    });
    onNext();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#002B5C]">{lang === 'en' ? 'Physician Dynamic Disclosure' : 'الإفصاح الطبي الديناميكي'}</h2>
          <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Complete each disclosure field. All fields appear in the consent PDF and evidence package.' : 'أكمل كل حقل إفصاح. تظهر جميع الحقول في وثيقة PDF والحزمة الدليلية.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAr(!showAr)}
            className={`flex items-center gap-1.5 text-xs border rounded px-2.5 py-1.5 font-medium transition-colors ${showAr ? 'bg-[#002B5C] text-white border-[#002B5C]' : 'border-[#D8DCE3] text-[#6B7280] hover:bg-[#F4F6F9]'}`}>
            ع / EN {showAr ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 bg-white border border-[#D8DCE3] rounded-lg px-4 py-3">
        <span className="text-xs text-[#6B7280] font-medium">Indicator legend:</span>
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-blue-600" /><span className="text-xs text-[#6B7280]">Patient View</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#6B7280]" /><span className="text-xs text-[#6B7280]">PDF</span>
        </div>
        <div className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5 text-[#6B7280]" /><span className="text-xs text-[#6B7280]">Evidence Pkg</span>
        </div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-[#6B7280]" /><span className="text-xs text-[#6B7280]">Audit Trail</span>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.id} className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EEF1F5] bg-[#F8F9FB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? field.label : field.labelAr}</span>
                {field.required && <span className="text-xs text-red-600 font-medium">*{lang === 'en' ? 'Required' : 'مطلوب'}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <IndicatorTag active={field.inPatientView} label="Patient" />
                <IndicatorTag active={field.inPDF} label="PDF" />
                <IndicatorTag active={field.inEvidence} label="Evidence" />
                <IndicatorTag active={field.inAudit} label="Audit" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* English field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">English (LTR)</label>
                  <button
                    type="button"
                    onClick={() => toggleNote(field.id)}
                    className="text-xs text-[#4B9CD3] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {visibleNotes[field.id]
                      ? (lang === 'en' ? 'Hide note' : '\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629')
                      : (lang === 'en' ? 'Add note' : '\u0625\u0636\u0627\u0641\u0629 \u0645\u0644\u0627\u062d\u0638\u0629')}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={values[field.id]?.en ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.id]: { ...prev[field.id], en: e.target.value } }))}
                  placeholder={field.placeholder}
                  className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none"
                />
              </div>

              {/* Arabic field — always shown for bilingual */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">العربية (RTL)</label>
                  <button
                    type="button"
                    onClick={() => applyStandardTemplate(field.id, field.label)}
                    className="text-xs text-[#4B9CD3] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {lang === 'en' ? 'Copy from template' : '\u0646\u0633\u062e \u0645\u0646 \u0627\u0644\u0642\u0627\u0644\u0628'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={values[field.id]?.ar ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [field.id]: { ...prev[field.id], ar: e.target.value } }))}
                  placeholder={field.placeholderAr}
                  dir="rtl"
                  className="w-full border border-[#D8DCE3] rounded bg-[#F8F9FB] px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none text-right"
                />
              </div>

              {visibleNotes[field.id] && (
                <div>
                  <label className="text-xs font-medium text-[#6B7280] uppercase tracking-wide block mb-1.5">
                    {lang === 'en' ? 'Internal Note' : '\u0645\u0644\u0627\u062d\u0638\u0629 \u062f\u0627\u062e\u0644\u064a\u0629'}
                  </label>
                  <textarea
                    rows={2}
                    value={notes[field.id] || ''}
                    onChange={e => setNotes(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={lang === 'en' ? 'Add internal physician note for this disclosure...' : '\u0623\u0636\u0641 \u0645\u0644\u0627\u062d\u0638\u0629 \u062f\u0627\u062e\u0644\u064a\u0629 \u0644\u0644\u0637\u0628\u064a\u0628 \u062d\u0648\u0644 \u0647\u0630\u0627 \u0627\u0644\u0625\u0641\u0635\u0627\u062d...'}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    className={`w-full border border-[#D8DCE3] rounded bg-white px-3 py-2 text-sm text-[#2F2F2F] focus:outline-none focus:ring-2 focus:ring-[#4B9CD3] resize-none ${lang === 'ar' ? 'text-right' : ''}`}
                  />
                </div>
              )}

              {/* Smart chips */}
              <div className="flex gap-1.5 flex-wrap">
                {['Standard template', 'Add patient note', 'Copy from previous', 'Mark as discussed verbally'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      if (chip === 'Standard template') applyStandardTemplate(field.id, field.label);
                      if (chip === 'Add patient note') toggleNote(field.id);
                    }}
                    className="text-xs border border-[#D8DCE3] rounded-full px-2.5 py-0.5 text-[#6B7280] hover:border-[#002B5C] hover:text-[#002B5C] hover:bg-blue-50 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={handleComplete} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
          {lang === 'en' ? 'Continue to Education' : 'متابعة للتثقيف'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
