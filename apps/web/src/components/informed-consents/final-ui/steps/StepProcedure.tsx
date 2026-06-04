"use client";

import React, { useState } from 'react';
import { Stethoscope, Zap, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { ClinicalBadge } from '../clinical/ClinicalBadge';
import type { ConsentStep } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
}

const procedures = [
  {
    id: 'P001', code: '47562', name: 'Laparoscopic Cholecystectomy', nameAr: 'استئصال المرارة بالمنظار',
    category: 'General Surgery', complexity: 'medium' as const,
    requiresAnesthesia: true, duration: '45–90 min',
    description: 'Minimally invasive removal of the gallbladder using laparoscopic technique.',
    descriptionAr: 'إزالة المرارة بأسلوب طفيف التوغل باستخدام تقنية المنظار.',
  },
  {
    id: 'P002', code: '43239', name: 'Upper GI Endoscopy', nameAr: 'تنظير الجهاز الهضمي العلوي',
    category: 'Gastroenterology', complexity: 'low' as const,
    requiresAnesthesia: false, duration: '15–30 min',
    description: 'Endoscopic examination of the esophagus, stomach, and duodenum.',
    descriptionAr: 'فحص بالمنظار للمريء والمعدة والاثني عشر.',
  },
];

const relatedConsents = [
  { id: 'RC1', name: 'Surgical Consent', nameAr: 'موافقة جراحية', required: true, active: true },
  { id: 'RC2', name: 'General Anesthesia Consent', nameAr: 'موافقة التخدير العام', required: true, active: true },
  { id: 'RC3', name: 'Blood Transfusion Consent', nameAr: 'موافقة نقل الدم', required: false, active: false },
  { id: 'RC4', name: 'Telemedicine / Data Sharing Consent', nameAr: 'موافقة الطب عن بُعد / مشاركة البيانات', required: false, active: false },
  { id: 'RC5', name: 'Photography / Teaching Consent', nameAr: 'موافقة التصوير / التعليم', required: false, active: false },
];

const complexityColors = { low: 'text-emerald-700 bg-emerald-50 border-emerald-200', medium: 'text-amber-700 bg-amber-50 border-amber-200', high: 'text-red-700 bg-red-50 border-red-200' };

export function StepProcedure({ lang, onNext, onPrev, onComplete }: Props) {
  const [selectedProc, setSelectedProc] = useState(procedures[0]);
  const [activeConsents, setActiveConsents] = useState<string[]>(['RC1', 'RC2']);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleContinue = () => {
    onComplete('procedure', ['v3', 'v4', 'v5'], {
      procedure: {
        id: selectedProc.id,
        code: selectedProc.code,
        name: selectedProc.name,
        nameAr: selectedProc.nameAr,
        category: selectedProc.category,
        complexity: selectedProc.complexity,
        requiresAnesthesia: selectedProc.requiresAnesthesia,
        duration: selectedProc.duration,
        description: selectedProc.description,
        descriptionAr: selectedProc.descriptionAr,
        activeConsents,
      },
    });
    onNext();
  };

  return (
    <div className="p-8 space-y-6" dir={dir}>
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Procedure & Consent Selection' : 'اختيار الإجراء والموافقة'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'Select the procedure and configure the consent package.' : 'اختر الإجراء وقم بتهيئة حزمة الموافقة.'}</p>
      </div>

      {/* Procedure list */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9] flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#002B5C]" />
          <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Recommended Procedures' : 'الإجراءات الموصى بها'}</span>
          <span className="text-xs text-[#6B7280] ml-auto">{lang === 'en' ? 'Based on encounter' : 'بناءً على الزيارة'}</span>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {procedures.map(proc => (
            <div key={proc.id}
              onClick={() => setSelectedProc(proc)}
              className={`px-5 py-4 flex items-start gap-4 cursor-pointer transition-colors ${selectedProc.id === proc.id ? 'bg-blue-50 border-l-2 border-l-[#002B5C]' : 'hover:bg-[#F4F6F9]'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${selectedProc.id === proc.id ? 'border-[#002B5C] bg-[#002B5C]' : 'border-[#D8DCE3] bg-white'}`}>
                {selectedProc.id === proc.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="font-medium text-[#2F2F2F]">{lang === 'en' ? proc.name : proc.nameAr}</span>
                  <span className={`text-xs border rounded px-1.5 py-0.5 font-medium ${complexityColors[proc.complexity]}`}>
                    {lang === 'en' ? `${proc.complexity.charAt(0).toUpperCase() + proc.complexity.slice(1)} Complexity` : `تعقيد ${proc.complexity === 'low' ? 'منخفض' : proc.complexity === 'medium' ? 'متوسط' : 'عالٍ'}`}
                  </span>
                  {proc.requiresAnesthesia && (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {lang === 'en' ? 'Anesthesia Required' : 'يتطلب تخديراً'}
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-xs text-[#6B7280]">CPT: {proc.code}</span>
                  <span className="text-xs text-[#6B7280]">{proc.category}</span>
                  <span className="text-xs text-[#6B7280]">{proc.duration}</span>
                </div>
                <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">{lang === 'en' ? proc.description : proc.descriptionAr}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related consents */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8DCE3] bg-[#F4F6F9]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#4B9CD3]" />
            <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Consent Package Configuration' : 'تهيئة حزمة الموافقة'}</span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">{lang === 'en' ? 'Select which consent forms to include in this package.' : 'اختر نماذج الموافقة التي ستدرج في هذه الحزمة.'}</p>
        </div>
        <div className="p-4 space-y-2">
          {relatedConsents.map(rc => (
            <div key={rc.id}
              className={`flex items-center gap-3 px-4 py-3 rounded border cursor-pointer transition-colors ${
                activeConsents.includes(rc.id)
                  ? 'border-[#002B5C] bg-blue-50'
                  : 'border-[#D8DCE3] bg-white hover:bg-[#F4F6F9]'
              }`}
              onClick={() => setActiveConsents(prev => prev.includes(rc.id) ? prev.filter(id => id !== rc.id) : [...prev, rc.id])}>
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${activeConsents.includes(rc.id) ? 'bg-[#002B5C] border-[#002B5C]' : 'border-[#D8DCE3] bg-white'}`}>
                {activeConsents.includes(rc.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm text-[#2F2F2F]">{lang === 'en' ? rc.name : rc.nameAr}</span>
              </div>
              {rc.required && (
                <span className="text-xs bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-medium">
                  {lang === 'en' ? 'Required' : 'إلزامي'}
                </span>
              )}
            </div>
          ))}
        </div>
        {selectedProc.requiresAnesthesia && !activeConsents.includes('RC2') && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-800">{lang === 'en' ? 'This procedure requires general anesthesia — anesthesia consent is mandatory.' : 'يتطلب هذا الإجراء تخديراً عاماً — موافقة التخدير إلزامية.'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={handleContinue} className="flex items-center gap-2 bg-[#002B5C] hover:bg-blue-900 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
          {lang === 'en' ? 'Continue to Anesthesia' : 'متابعة للتخدير'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
