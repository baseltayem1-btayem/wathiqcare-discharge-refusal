"use client";

import React from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import type { ConsentStep, ValidationItem } from '../clinical/ClinicalTypes';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[]) => void;
  validationItems: ValidationItem[];
}

export function StepValidation({ lang, onNext, onPrev, onComplete, validationItems }: Props) {
  const critical = validationItems.filter(v => !v.complete && v.severity === 'critical');
  const warnings = validationItems.filter(v => !v.complete && v.severity === 'warning');
  const ready = validationItems.filter(v => v.complete);
  const canProceed = critical.length === 0;

  const handleComplete = () => {
    if (canProceed) {
      onComplete('validation', ['v15']);
      onNext();
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-[#002B5C]">{lang === 'en' ? 'Completeness Validation' : 'التحقق من الاكتمال'}</h2>
        <p className="text-sm text-[#6B7280] mt-1">{lang === 'en' ? 'All critical items must be resolved before the consent link can be sent.' : 'يجب حل جميع العناصر الحرجة قبل إرسال رابط الموافقة.'}</p>
      </div>

      {/* Summary */}
      <div className={`border rounded-lg p-5 ${canProceed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          {canProceed
            ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            : <AlertCircle className="w-6 h-6 text-red-600" />}
          <div>
            <p className={`font-semibold ${canProceed ? 'text-emerald-800' : 'text-red-800'}`}>
              {canProceed
                ? (lang === 'en' ? 'Ready to Send — All critical items complete' : 'جاهز للإرسال — جميع العناصر الحرجة مكتملة')
                : `${critical.length} ${lang === 'en' ? 'critical items must be resolved before sending' : 'عناصر حرجة يجب حلها قبل الإرسال'}`}
            </p>
            <p className={`text-xs mt-0.5 ${canProceed ? 'text-emerald-700' : 'text-red-700'}`}>
              {ready.length}/{validationItems.length} {lang === 'en' ? 'items complete' : 'عنصر مكتمل'}
              {warnings.length > 0 && ` · ${warnings.length} ${lang === 'en' ? 'warnings' : 'تحذير'}`}
            </p>
          </div>
        </div>

        <div className="w-full bg-white/60 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${Math.round((ready.length / validationItems.length) * 100)}%`,
              background: canProceed ? '#1A7F4B' : '#C0392B',
            }}
          />
        </div>
      </div>

      {/* Critical items */}
      {critical.length > 0 && (
        <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-800">{lang === 'en' ? 'Critical — Must Fix' : 'حرج — يجب الإصلاح'}</span>
            <span className="ml-auto text-xs font-mono text-red-600">{critical.length}</span>
          </div>
          <div className="divide-y divide-[#EEF1F5]">
            {critical.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[#2F2F2F]">{item.label}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5" dir="rtl">{item.labelAr}</p>
                </div>
                <span className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 capitalize">{item.section}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">{lang === 'en' ? 'Warnings — Recommended' : 'تحذيرات — موصى به'}</span>
            <span className="ml-auto text-xs font-mono text-amber-600">{warnings.length}</span>
          </div>
          <div className="divide-y divide-[#EEF1F5]">
            {warnings.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-5 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-[#2F2F2F]">{item.label}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5" dir="rtl">{item.labelAr}</p>
                </div>
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 capitalize">{item.section}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed items */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">{lang === 'en' ? 'Completed' : 'مكتمل'}</span>
          <span className="ml-auto text-xs font-mono text-emerald-600">{ready.length}</span>
        </div>
        <div className="divide-y divide-[#EEF1F5]">
          {ready.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-[#6B7280]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PDF readiness */}
      <div className="bg-white border border-[#D8DCE3] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#002B5C]" />
          <span className="text-sm font-semibold text-[#2F2F2F]">{lang === 'en' ? 'Document Readiness' : 'جاهزية الوثيقة'}</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: lang === 'en' ? 'Patient View' : 'عرض المريض', ready: true },
            { label: 'PDF Document', ready: canProceed },
            { label: lang === 'en' ? 'Evidence Package' : 'الحزمة الدليلية', ready: canProceed },
            { label: lang === 'en' ? 'Audit Trail' : 'مسار التدقيق', ready: true },
          ].map(item => (
            <div key={item.label} className={`border rounded-lg p-3 text-center ${item.ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className={`w-6 h-6 rounded-full mx-auto mb-2 flex items-center justify-center ${item.ready ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {item.ready ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <p className={`text-xs font-medium ${item.ready ? 'text-emerald-700' : 'text-amber-700'}`}>{item.label}</p>
              <p className={`text-[10px] mt-0.5 ${item.ready ? 'text-emerald-600' : 'text-amber-600'}`}>{item.ready ? 'Ready' : 'Pending'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="flex items-center gap-2 border border-[#D8DCE3] text-[#6B7280] hover:text-[#2F2F2F] px-4 py-2.5 rounded text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" />
          {lang === 'en' ? 'Back' : 'رجوع'}
        </button>
        <button onClick={handleComplete} disabled={!canProceed} className="flex items-center gap-2 bg-[#C9A13B] hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded text-sm font-medium transition-colors">
          {lang === 'en' ? 'Proceed to Send' : 'المتابعة للإرسال'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
