"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, CheckCircle2, HelpCircle, Lightbulb } from 'lucide-react';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
}

const educationSections = [
  {
    id: 'overview', icon: BookOpen, label: 'Procedure Overview', labelAr: 'نظرة عامة على الإجراء',
    contentEn: 'Your surgeon will perform a laparoscopic cholecystectomy — a minimally invasive surgery to remove your gallbladder. Three to four small incisions are made in your abdomen. A tiny camera (laparoscope) and surgical tools are inserted to view and remove the gallbladder safely.',
    contentAr: 'سيجري طبيبك استئصال المرارة بالمنظار — وهو عملية جراحية طفيفة التوغل لإزالة المرارة. تُجرى ثلاثة إلى أربعة شقوق صغيرة في بطنك. تُدخَل كاميرا صغيرة (منظار) وأدوات جراحية لعرض المرارة وإزالتها بأمان.',
  },
  {
    id: 'benefits', icon: CheckCircle2, label: 'Benefits', labelAr: 'الفوائد',
    contentEn: '• Relief from gallstone pain and symptoms\n• Minimal scarring (small incisions)\n• Short hospital stay (1–2 days)\n• Quick recovery (return to work in 1–2 weeks)\n• High success rate (>95%)',
    contentAr: '• تخفيف آلام حصى المرارة والأعراض\n• ندوب ضئيلة (شقوق صغيرة)\n• فترة إقامة قصيرة بالمستشفى (1-2 أيام)\n• تعافٍ سريع (العودة للعمل خلال 1-2 أسبوع)\n• معدل نجاح مرتفع (أكثر من 95%)',
  },
  {
    id: 'risks', icon: HelpCircle, label: 'Risks', labelAr: 'المخاطر',
    contentEn: 'All surgeries carry some risk. For this procedure:\n• Bleeding or infection (1–3%)\n• Bile duct injury (0.3–0.5%) — may require additional surgery\n• Conversion to open surgery (5%)\n• Anesthesia-related complications\n• Your doctor will discuss your specific risks with you.',
    contentAr: 'جميع العمليات تنطوي على بعض المخاطر. بالنسبة لهذا الإجراء:\n• النزيف أو العدوى (1-3%)\n• إصابة القناة الصفراوية (0.3-0.5%) — قد تستلزم جراحة إضافية\n• التحول إلى الجراحة المفتوحة (5%)\n• مضاعفات مرتبطة بالتخدير\n• سيناقش طبيبك معك مخاطرك المحددة.',
  },
  {
    id: 'alternatives', icon: Lightbulb, label: 'Alternatives & No-Treatment', labelAr: 'البدائل وعدم العلاج',
    contentEn: 'You have the right to refuse surgery. Alternative options discussed with your doctor include:\n• Dietary modifications (low-fat diet)\n• Pain management only\n• Open surgical cholecystectomy\n\nIf untreated, gallstones may cause serious complications including infection and perforation.',
    contentAr: 'لديك الحق في رفض الجراحة. البدائل التي ناقشها معك طبيبك تشمل:\n• التعديلات الغذائية (نظام غذائي قليل الدهون)\n• إدارة الألم فقط\n• استئصال المرارة جراحياً مفتوحاً\n\nإذا لم تُعالَج، قد تسبب حصى المرارة مضاعفات خطيرة تشمل العدوى والانثقاب.',
  },
];

const beforeAfter = [
  {
    phase: 'Before', phaseAr: 'قبل الإجراء', color: '#4B9CD3',
    items: [
      { en: 'Fast from midnight (no food or drink)', ar: 'الصيام من منتصف الليل (بدون طعام أو شراب)' },
      { en: 'Stop blood thinners 5 days before', ar: 'إيقاف مضادات التخثر قبل 5 أيام' },
      { en: 'Arrive 2 hours before scheduled surgery', ar: 'الحضور قبل ساعتين من الجراحة المحددة' },
      { en: 'Arrange for a responsible adult to drive you home', ar: 'ترتيب وجود شخص بالغ مسؤول لأخذك إلى المنزل' },
    ],
  },
  {
    phase: 'After', phaseAr: 'بعد الإجراء', color: '#1A7F4B',
    items: [
      { en: 'Rest for 24–48 hours', ar: 'الراحة لمدة 24-48 ساعة' },
      { en: 'No driving for 24 hours after anesthesia', ar: 'عدم قيادة السيارة لمدة 24 ساعة بعد التخدير' },
      { en: 'Take prescribed pain medications as directed', ar: 'تناول أدوية الألم الموصوفة كما هو موجه' },
      { en: 'Follow-up appointment in 1 week', ar: 'موعد متابعة بعد أسبوع واحد' },
    ],
  },
];

export function StepEducation({ lang, onNext, onPrev, onComplete }: Props) {
  const [activeSection, setActiveSection] = useState('overview');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleComplete = () => {
    onComplete('education', ['v13'], {
      education: {
        sections: educationSections.map((section) => ({
          id: section.id,
          label: section.label,
          labelAr: section.labelAr,
          contentEn: section.contentEn,
          contentAr: section.contentAr,
        })),
        beforeAfter,
        checkedItems,
      },
    });
    onNext();
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Patient Education Package' : 'حزمة تثقيف المريض'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'This is what the patient will read before signing. Review and confirm accuracy.' : 'هذا ما سيقرأه المريض قبل التوقيع. راجع وأكد الدقة.'}</p>
      </div>

      {/* Patient-facing preview card */}
      <div className="bg-white border-2 border-[#4B9CD3] rounded-lg overflow-hidden">
        <div className="bg-[#4B9CD3] px-5 py-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">{lang === 'en' ? 'Patient Education Preview' : 'معاينة تثقيف المريض'}</span>
          <span className="ml-auto text-blue-100 text-xs">{lang === 'en' ? 'Laparoscopic Cholecystectomy' : 'استئصال المرارة بالمنظار'}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D8DCE3] overflow-x-auto">
          {educationSections.map(s => (
            <button key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeSection === s.id ? 'border-[#4B9CD3] text-[#002B5C]' : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'}`}>
              <s.icon className="w-3.5 h-3.5" />
              {lang === 'en' ? s.label : s.labelAr}
            </button>
          ))}
        </div>

        <div className="p-6">
          {educationSections.map(s => activeSection === s.id && (
            <div key={s.id}>
              <div className={`mb-4 ${lang === 'ar' ? 'text-right' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <p className="text-sm text-[#2F2F2F] leading-relaxed whitespace-pre-line">
                  {lang === 'en' ? s.contentEn : s.contentAr}
                </p>
              </div>
              <div className="bg-[#EBF3FB] border border-[#4B9CD3]/30 rounded p-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#4B9CD3] shrink-0" />
                <span className="text-xs text-[#002B5C]">{lang === 'en' ? 'Have questions? Ask your doctor before signing.' : 'هل لديك أسئلة؟ اسأل طبيبك قبل التوقيع.'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Before / After checklist */}
      <div className="grid grid-cols-2 gap-4">
        {beforeAfter.map(phase => (
          <div key={phase.phase} className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D8DCE3]" style={{ background: `${phase.color}15` }}>
              <span className="text-sm font-semibold" style={{ color: phase.color }}>
                {lang === 'en' ? phase.phase : phase.phaseAr}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {phase.items.map((item, i) => {
                const key = `${phase.phase}-${i}`;
                return (
                  <label key={key} className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox"
                      checked={checkedItems.includes(key)}
                      onChange={() => toggleCheck(key)}
                      className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-[#002B5C]" />
                    <span className={`text-xs text-[#2F2F2F] leading-snug ${lang === 'ar' ? 'text-right' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                      {lang === 'en' ? item.en : item.ar}
                    </span>
                  </label>
                );
              })}
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
          {lang === 'en' ? 'Continue to Preview' : 'متابعة للمعاينة'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
