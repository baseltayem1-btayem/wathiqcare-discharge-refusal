"use client";

import React, { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import type { ConsentStep } from './clinical/ClinicalTypes';
import { ValidationDrawer } from './clinical/ValidationDrawer';
import { StepPatient } from './steps/StepPatient';
import { StepProcedure } from './steps/StepProcedure';
import { StepAnesthesia } from './steps/StepAnesthesia';
import { StepDisclosures } from './steps/StepDisclosures';
import { StepEducation } from './steps/StepEducation';
import { StepPreview } from './steps/StepPreview';
import { StepValidation } from './steps/StepValidation';
import { StepSend } from './steps/StepSend';

const steps: { key: ConsentStep; label: string; labelAr: string }[] = [
  { key: 'patient', label: 'Patient', labelAr: 'المريض' },
  { key: 'procedure', label: 'Procedure', labelAr: 'الإجراء' },
  { key: 'anesthesia', label: 'Anesthesia', labelAr: 'التخدير' },
  { key: 'disclosures', label: 'Disclosures', labelAr: 'الإفصاحات' },
  { key: 'education', label: 'Education', labelAr: 'التثقيف' },
  { key: 'preview', label: 'Preview', labelAr: 'المعاينة' },
  { key: 'validation', label: 'Validation', labelAr: 'التحقق' },
  { key: 'send', label: 'Send', labelAr: 'الإرسال' },
];

import type { ValidationItem } from './clinical/ClinicalTypes';
import { defaultValidation } from './fixtures/consent-builder';

interface Props {
  lang: 'en' | 'ar';
}

export function ConsentBuilder({ lang }: Props) {
  const [currentStep, setCurrentStep] = useState<ConsentStep>('patient');
  const [validation, setValidation] = useState<ValidationItem[]>(defaultValidation);
  const [completedSteps, setCompletedSteps] = useState<Set<ConsentStep>>(new Set<ConsentStep>());

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  const markStepComplete = (step: ConsentStep, itemIds: string[]) => {
    setValidation(prev => prev.map(v => itemIds.includes(v.id) ? { ...v, complete: true } : v));
    setCompletedSteps(prev => new Set([...prev, step]));
  };

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const renderStep = () => {
    const props = { lang, onNext: goNext, onPrev: goPrev, onComplete: markStepComplete };
    switch (currentStep) {
      case 'patient': return <StepPatient {...props} />;
      case 'procedure': return <StepProcedure {...props} />;
      case 'anesthesia': return <StepAnesthesia {...props} />;
      case 'disclosures': return <StepDisclosures {...props} />;
      case 'education': return <StepEducation {...props} />;
      case 'preview': return <StepPreview {...props} />;
      case 'validation': return <StepValidation {...props} validationItems={validation} />;
      case 'send': return <StepSend {...props} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stepper header */}
      <div className="bg-white border-b border-[#D8DCE3] px-8 py-0">
        <div className="flex items-center">
          {steps.map((step, i) => {
            const isActive = step.key === currentStep;
            const isComplete = completedSteps.has(step.key) && !isActive;
            const isPast = i < currentIndex;
            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'border-[#002B5C] text-[#002B5C]'
                      : isComplete || isPast
                      ? 'border-transparent text-emerald-600 hover:text-[#002B5C]'
                      : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 ${
                    isActive
                      ? 'bg-[#002B5C] text-white border-[#002B5C]'
                      : isComplete || isPast
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-[#6B7280] border-[#D8DCE3]'
                  }`}>
                    {isComplete || isPast ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </span>
                  <span>{lang === 'en' ? step.label : step.labelAr}</span>
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#D8DCE3] mx-1 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main content + validation drawer */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
          {renderStep()}
        </div>
        <ValidationDrawer
          items={validation}
          currentStep={currentStep}
          onNavigate={setCurrentStep}
        />
      </div>
    </div>
  );
}
