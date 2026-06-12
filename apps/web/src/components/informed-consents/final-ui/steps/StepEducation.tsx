"use client";

import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, BookOpen, CheckCircle2, HelpCircle, Lightbulb } from 'lucide-react';
import type { ConsentStep } from '../clinical/ClinicalTypes';
import { criticalCareConsentTemplate } from '@/data/imc-digital-consent-templates';

interface Props {
  lang: 'en' | 'ar';
  onNext: () => void;
  onPrev: () => void;
  onComplete: (step: ConsentStep, ids: string[], payload?: Record<string, unknown>) => void;
  procedure?: Record<string, unknown>;
}

type EducationSection = {
  id: string;
  icon: typeof BookOpen | typeof CheckCircle2 | typeof HelpCircle | typeof Lightbulb;
  label: string;
  labelAr: string;
  contentEn: string;
  contentAr: string;
};

type EducationChecklistGroup = {
  phase: string;
  phaseAr: string;
  headerClassName: string;
  titleClassName: string;
  items: Array<{ en: string; ar: string }>;
};

function isCriticalCareProcedure(procedure?: Record<string, unknown>): boolean {
  if (!procedure) {
    return false;
  }

  const values = [
    procedure.id,
    procedure.code,
    procedure.name,
    procedure.category,
    (procedure.digitalConsentTemplate as Record<string, unknown> | undefined)?.formCode,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase());

  return values.some(
    (value) =>
      value.includes('imc mr 1363') ||
      value.includes('imc-mr-1363') ||
      value.includes('critical care') ||
      value.includes('intensive care') ||
      value.includes('icu'),
  );
}

function buildEducationContent(procedure?: Record<string, unknown>): {
  titleEn: string;
  titleAr: string;
  sections: EducationSection[];
  beforeAfter: EducationChecklistGroup[];
} {
  const criticalCareSelected = isCriticalCareProcedure(procedure);
  const nameEn = String(procedure?.name || 'Planned procedure').trim() || 'Planned procedure';
  const nameAr = String(procedure?.nameAr || 'الإجراء المخطط').trim() || 'الإجراء المخطط';
  const descriptionEn = String(procedure?.description || '').trim();
  const descriptionAr = String(procedure?.descriptionAr || '').trim();

  if (!criticalCareSelected) {
    return {
      titleEn: nameEn,
      titleAr: nameAr,
      sections: [
        {
          id: 'overview',
          icon: BookOpen,
          label: 'Procedure Overview',
          labelAr: 'نظرة عامة على الإجراء',
          contentEn:
            descriptionEn ||
            `${nameEn} has been explained in clear language, including why it is recommended, what will happen, and what to expect before and after the procedure.`,
          contentAr:
            descriptionAr ||
            `تم شرح ${nameAr} بلغة واضحة، بما في ذلك سبب التوصية به، وما الذي سيحدث، وما المتوقع قبل الإجراء وبعده.`,
        },
        {
          id: 'benefits',
          icon: CheckCircle2,
          label: 'Expected Benefits',
          labelAr: 'الفوائد المتوقعة',
          contentEn:
            `The clinical team explained the expected benefits of ${nameEn}, the intended therapeutic goal, and the expected short-term monitoring plan.`,
          contentAr:
            `شرح الفريق الطبي الفوائد المتوقعة من ${nameAr}، والهدف العلاجي المقصود، وخطة المتابعة المتوقعة على المدى القريب.`,
        },
        {
          id: 'risks',
          icon: HelpCircle,
          label: 'Risks',
          labelAr: 'المخاطر',
          contentEn:
            `Potential risks, complications, and safety precautions for ${nameEn} were discussed with the patient, including when urgent review may be required.`,
          contentAr:
            `تمت مناقشة المخاطر والمضاعفات المحتملة واحتياطات السلامة المتعلقة بـ ${nameAr} مع المريض، بما في ذلك الحالات التي قد تستدعي مراجعة عاجلة.`,
        },
        {
          id: 'alternatives',
          icon: Lightbulb,
          label: 'Alternatives & Refusal',
          labelAr: 'البدائل ومخاطر الرفض',
          contentEn:
            'Available alternatives, the option to defer or refuse treatment when clinically appropriate, and the consequences of delaying care were reviewed before signing.',
          contentAr:
            'تمت مراجعة البدائل المتاحة، وخيار تأجيل العلاج أو رفضه عندما يكون ذلك مناسباً سريرياً، والنتائج المحتملة لتأخير الرعاية قبل التوقيع.',
        },
      ],
      beforeAfter: [
        {
          phase: 'Before',
          phaseAr: 'قبل الإجراء',
          headerClassName: 'bg-[#4B9CD3]/15',
          titleClassName: 'text-[#4B9CD3]',
          items: [
            { en: 'Confirm understanding of the recommended procedure', ar: 'تأكيد فهم الإجراء الموصى به' },
            { en: 'Review questions with the physician before signing', ar: 'مراجعة الأسئلة مع الطبيب قبل التوقيع' },
            { en: 'Verify contact details and follow-up instructions', ar: 'التحقق من بيانات التواصل وتعليمات المتابعة' },
            { en: 'Confirm any required preparation or restrictions', ar: 'تأكيد أي تحضيرات أو قيود مطلوبة' },
          ],
        },
        {
          phase: 'After',
          phaseAr: 'بعد الإجراء',
          headerClassName: 'bg-[#1A7F4B]/15',
          titleClassName: 'text-[#1A7F4B]',
          items: [
            { en: 'Follow the physician’s discharge or monitoring plan', ar: 'اتباع خطة الطبيب للخروج أو المراقبة' },
            { en: 'Use medications and supportive care as directed', ar: 'استخدام الأدوية والرعاية الداعمة حسب التوجيهات' },
            { en: 'Escalate new symptoms or concerns promptly', ar: 'الإبلاغ السريع عن أي أعراض أو مخاوف جديدة' },
            { en: 'Attend the scheduled follow-up review', ar: 'حضور موعد المتابعة المحدد' },
          ],
        },
      ],
    };
  }

  const digitalTemplate = (procedure?.digitalConsentTemplate as Record<string, unknown> | undefined) || {};
  const selectedDetails = Array.isArray(digitalTemplate.selectedIcuProcedureDetails)
    ? (digitalTemplate.selectedIcuProcedureDetails as Array<Record<string, unknown>>)
    : criticalCareConsentTemplate.procedures.filter((item) => item.isDefaultSelected) as unknown as Array<Record<string, unknown>>;

  const selectedProcedureLinesEn = selectedDetails.length
    ? selectedDetails
        .map((item, index) => {
          const title = String((item.title as Record<string, unknown> | undefined)?.en || '').trim();
          const uses = String((item.uses as Record<string, unknown> | undefined)?.en || '').trim();
          return `${index + 1}. ${title}${uses ? `\nUse: ${uses}` : ''}`;
        })
        .join('\n\n')
    : 'Selected ICU procedures will be reviewed before signing.';

  const selectedProcedureLinesAr = selectedDetails.length
    ? selectedDetails
        .map((item, index) => {
          const title = String((item.title as Record<string, unknown> | undefined)?.ar || '').trim();
          const uses = String((item.uses as Record<string, unknown> | undefined)?.ar || '').trim();
          return `${index + 1}. ${title}${uses ? `\nالاستخدام: ${uses}` : ''}`;
        })
        .join('\n\n')
    : 'ستتم مراجعة إجراءات العناية المركزة المختارة قبل التوقيع.';

  const selectedRiskLinesEn = selectedDetails.length
    ? selectedDetails
        .map((item, index) => {
          const title = String((item.title as Record<string, unknown> | undefined)?.en || '').trim();
          const risks = String((item.risks as Record<string, unknown> | undefined)?.en || '').trim();
          return `${index + 1}. ${title}: ${risks}`;
        })
        .join('\n')
    : 'Procedure-specific ICU risks will be reviewed with the patient or responsible representative.';

  const selectedRiskLinesAr = selectedDetails.length
    ? selectedDetails
        .map((item, index) => {
          const title = String((item.title as Record<string, unknown> | undefined)?.ar || '').trim();
          const risks = String((item.risks as Record<string, unknown> | undefined)?.ar || '').trim();
          return `${index + 1}. ${title}: ${risks}`;
        })
        .join('\n')
    : 'ستتم مراجعة مخاطر إجراءات العناية المركزة الخاصة بالحالة مع المريض أو ممثله المسؤول.';

  return {
    titleEn: `${criticalCareConsentTemplate.title.en} / ${criticalCareConsentTemplate.formCode}`,
    titleAr: `${criticalCareConsentTemplate.title.ar} / ${criticalCareConsentTemplate.formCode}`,
    sections: [
      {
        id: 'overview',
        icon: BookOpen,
        label: 'ICU Procedure Overview',
        labelAr: 'نظرة عامة على إجراءات العناية المركزة',
        contentEn: `${criticalCareConsentTemplate.introduction.map((item) => item.en).join(' ')}\n\n${selectedProcedureLinesEn}`,
        contentAr: `${criticalCareConsentTemplate.introduction.map((item) => item.ar).join(' ')}\n\n${selectedProcedureLinesAr}`,
      },
      {
        id: 'benefits',
        icon: CheckCircle2,
        label: 'Clinical Purpose & Benefits',
        labelAr: 'الغرض السريري والفوائد',
        contentEn:
          'These ICU interventions support monitoring, medication delivery, organ support, and urgent treatment decisions when clinically necessary. The physician explained why each selected intervention may be needed during critical care admission.',
        contentAr:
          'تدعم هذه الإجراءات في العناية المركزة المراقبة، وإعطاء الأدوية، ودعم الأعضاء، واتخاذ قرارات علاجية عاجلة عند الحاجة السريرية. وقد شرح الطبيب سبب الحاجة إلى كل إجراء مختار أثناء دخول الرعاية الحرجة.',
      },
      {
        id: 'risks',
        icon: HelpCircle,
        label: 'Procedure Risks',
        labelAr: 'مخاطر الإجراءات',
        contentEn: selectedRiskLinesEn,
        contentAr: selectedRiskLinesAr,
      },
      {
        id: 'alternatives',
        icon: Lightbulb,
        label: 'Alternatives & Refusal',
        labelAr: 'البدائل ومخاطر الرفض',
        contentEn: criticalCareConsentTemplate.refusalSection.text.en,
        contentAr: criticalCareConsentTemplate.refusalSection.text.ar,
      },
    ],
    beforeAfter: [
      {
        phase: 'Before',
        phaseAr: 'قبل الإجراء',
        headerClassName: 'bg-[#4B9CD3]/15',
        titleClassName: 'text-[#4B9CD3]',
        items: [
          { en: 'Review the selected ICU procedures and why they may be required', ar: 'مراجعة إجراءات العناية المركزة المختارة وسبب الحاجة إليها' },
          { en: 'Confirm the responsible decision maker and interpreter needs', ar: 'تأكيد ممثل القرار المسؤول والحاجة إلى مترجم' },
          { en: 'Discuss monitoring, lines, ventilation, and escalation plans', ar: 'مناقشة خطط المراقبة، والقساطر، والتهوية، والتصعيد العلاجي' },
          { en: 'Ask questions before consent is finalized', ar: 'طرح الأسئلة قبل اعتماد الموافقة' },
        ],
      },
      {
        phase: 'After',
        phaseAr: 'بعد الإجراء',
        headerClassName: 'bg-[#1A7F4B]/15',
        titleClassName: 'text-[#1A7F4B]',
        items: [
          { en: 'Expect continuous ICU monitoring and reassessment', ar: 'توقع المراقبة المستمرة وإعادة التقييم داخل العناية المركزة' },
          { en: 'Less common procedures may require separate consent unless emergent', ar: 'قد تتطلب الإجراءات الأقل شيوعاً موافقة مستقلة ما لم تكن الحالة طارئة' },
          { en: 'The care team will update the patient or responsible relative regularly', ar: 'سيقوم الفريق العلاجي بتحديث المريض أو القريب المسؤول بشكل منتظم' },
          { en: 'Consent remains active through ICU treatment unless revoked', ar: 'تظل الموافقة سارية خلال علاج العناية المركزة ما لم يتم سحبها' },
        ],
      },
    ],
  };
}

export function StepEducation({ lang, onNext, onPrev, onComplete, procedure }: Props) {
  const [activeSection, setActiveSection] = useState('overview');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const educationContent = useMemo(() => buildEducationContent(procedure), [procedure]);

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleComplete = () => {
    onComplete('education', ['v13'], {
      education: {
        titleEn: educationContent.titleEn,
        titleAr: educationContent.titleAr,
        sections: educationContent.sections.map((section) => ({
          id: section.id,
          label: section.label,
          labelAr: section.labelAr,
          contentEn: section.contentEn,
          contentAr: section.contentAr,
        })),
        beforeAfter: educationContent.beforeAfter,
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
          <span className="ml-auto text-blue-100 text-xs">{lang === 'en' ? educationContent.titleEn : educationContent.titleAr}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#D8DCE3] overflow-x-auto">
          {educationContent.sections.map(s => (
            <button key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeSection === s.id ? 'border-[#4B9CD3] text-[#002B5C]' : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'}`}>
              <s.icon className="w-3.5 h-3.5" />
              {lang === 'en' ? s.label : s.labelAr}
            </button>
          ))}
        </div>

        <div className="p-6">
          {educationContent.sections.map(s => activeSection === s.id && (
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
        {educationContent.beforeAfter.map(phase => (
          <div key={phase.phase} className="bg-white border border-[#D8DCE3] rounded-lg overflow-hidden">
            <div className={`px-4 py-3 border-b border-[#D8DCE3] ${phase.headerClassName}`}>
              <span className={`text-sm font-semibold ${phase.titleClassName}`}>
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
