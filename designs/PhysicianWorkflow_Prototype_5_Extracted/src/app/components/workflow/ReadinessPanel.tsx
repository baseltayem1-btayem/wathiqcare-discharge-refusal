import React from 'react';
import { CheckCircle2, Circle, AlertCircle, Clock } from 'lucide-react';
import type { ReadinessChecklist } from './WorkflowTypes';

interface ReadinessItem {
  key: keyof ReadinessChecklist;
  label: string;
  labelAr: string;
  critical?: boolean;
}

const items: ReadinessItem[] = [
  { key: 'patientSelected', label: 'Patient Selected', labelAr: 'تم اختيار المريض', critical: true },
  { key: 'encounterSelected', label: 'Encounter Selected', labelAr: 'تم اختيار الزيارة', critical: true },
  { key: 'consentSelected', label: 'Consent Selected', labelAr: 'تم اختيار الموافقة', critical: true },
  { key: 'templateMapped', label: 'Runtime Template Mapped', labelAr: 'تم ربط القالب', critical: true },
  { key: 'anesthesiaDecisionComplete', label: 'Anesthesia Decision Complete', labelAr: 'قرار التخدير مكتمل', critical: true },
  { key: 'anesthesiaReviewSatisfied', label: 'Anesthesia Review Satisfied', labelAr: 'مراجعة التخدير مكتملة' },
  { key: 'draftPdfGenerated', label: 'Draft PDF Generated', labelAr: 'PDF المسودة منشأ', critical: true },
  { key: 'pdfReviewAvailable', label: 'PDF Review Available', labelAr: 'معاينة PDF متاحة' },
  { key: 'readyForNotification', label: 'Ready for Patient Notification', labelAr: 'جاهز لإشعار المريض', critical: true },
  { key: 'evidenceReady', label: 'Evidence/Audit Ready', labelAr: 'الأدلة والتدقيق جاهزة' },
];

interface Props {
  checklist: ReadinessChecklist;
  lang?: 'en' | 'ar';
}

export function ReadinessPanel({ checklist, lang = 'en' }: Props) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const criticalComplete = items.filter(item => item.critical).every(item => checklist[item.key]);
  const allComplete = items.every(item => checklist[item.key]);
  const completedCount = items.filter(item => checklist[item.key]).length;

  return (
    <div className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#D8DCE3]" style={{ background: '#F8FAFC' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#2F2F2F]">
              {lang === 'en' ? 'Readiness Checklist' : 'قائمة التحقق من الجاهزية'}
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {completedCount} / {items.length} {lang === 'en' ? 'complete' : 'مكتمل'}
            </p>
          </div>
          {allComplete && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {lang === 'en' ? 'All Ready' : 'الكل جاهز'}
            </div>
          )}
          {!allComplete && criticalComplete && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {lang === 'en' ? 'Critical Ready' : 'الحرج جاهز'}
            </div>
          )}
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-[#EEF1F5]">
        {items.map(item => {
          const isComplete = checklist[item.key];
          return (
            <div
              key={item.key}
              className="px-5 py-3 flex items-center gap-3 transition-colors hover:bg-[#F8FAFC]"
            >
              <div className="shrink-0">
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : item.critical ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D8DCE3]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isComplete ? 'text-[#2F2F2F]' : 'text-[#6B7280]'}`}>
                    {lang === 'en' ? item.label : item.labelAr}
                  </span>
                  {item.critical && !isComplete && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      {lang === 'en' ? 'Required' : 'مطلوب'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
