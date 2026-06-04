"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Plus, FileText, Eye, Archive, ClipboardCheck } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

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

  const handleComplete = () => {
    onComplete('disclosures', ['v9', 'v10', 'v11', 'v12'], {
      disclosures: values,
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
                  <button className="text-xs text-[#4B9CD3] hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {lang === 'en' ? 'Add note' : 'إضافة ملاحظة'}
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
                  <button className="text-xs text-[#4B9CD3] hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    نسخ من القالب
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

              {/* Smart chips */}
              <div className="flex gap-1.5 flex-wrap">
                {['Standard template', 'Add patient note', 'Copy from previous', 'Mark as discussed verbally'].map(chip => (
                  <button key={chip} className="text-xs border border-[#D8DCE3] rounded-full px-2.5 py-0.5 text-[#6B7280] hover:border-[#002B5C] hover:text-[#002B5C] hover:bg-blue-50 transition-colors">
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
