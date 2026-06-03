"use client";

import React, { useEffect, useState } from 'react';
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
import { mockEncounters, mockPatients } from './fixtures/patient-search';

const steps: { key: ConsentStep; label: string; labelAr: string }[] = [
  { key: 'patient', label: 'Patient', labelAr: 'Ø§Ù„Ù…Ø±ÙŠØ¶' },
  { key: 'procedure', label: 'Procedure', labelAr: 'Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡' },
  { key: 'anesthesia', label: 'Anesthesia', labelAr: 'Ø§Ù„ØªØ®Ø¯ÙŠØ±' },
  { key: 'disclosures', label: 'Disclosures', labelAr: 'Ø§Ù„Ø¥ÙØµØ§Ø­Ø§Øª' },
  { key: 'education', label: 'Education', labelAr: 'Ø§Ù„ØªØ«Ù‚ÙŠÙ' },
  { key: 'preview', label: 'Preview', labelAr: 'Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©' },
  { key: 'validation', label: 'Validation', labelAr: 'Ø§Ù„ØªØ­Ù‚Ù‚' },
  { key: 'send', label: 'Send', labelAr: 'Ø§Ù„Ø¥Ø±Ø³Ø§Ù„' },
];

import type { ValidationItem } from './clinical/ClinicalTypes';
import { defaultValidation } from './fixtures/consent-builder';

interface Props {
  lang: 'en' | 'ar';
}

type RuntimeConsentTemplate = {
  id: string;
  templateVersionId: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department: string | null;
  language: 'bilingual';
};

type DraftConsentResponse = {
  id: string;
  draftPdfUrl?: string | null;
};

const defaultPatient = mockPatients[0];
const defaultEncounter = mockEncounters.find((encounter) => encounter.status === 'active') || mockEncounters[0];

export function ConsentBuilder({ lang }: Props) {
  const [currentStep, setCurrentStep] = useState<ConsentStep>('patient');
  const [validation, setValidation] = useState<ValidationItem[]>(defaultValidation);
  const [completedSteps, setCompletedSteps] = useState<Set<ConsentStep>>(new Set<ConsentStep>());
  const [patientMobile, setPatientMobile] = useState('+966 50 234 5678');
  const [patientEmail, setPatientEmail] = useState('m.alrashidi@email.com');
  const [linkedDocumentId, setLinkedDocumentId] = useState('');
  const [documentReady, setDocumentReady] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isLinkingDocument, setIsLinkingDocument] = useState(false);

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

  useEffect(() => {
    const shouldLinkDocument = currentStep === 'preview' || currentStep === 'validation' || currentStep === 'send';
    if (!shouldLinkDocument || linkedDocumentId) {
      return;
    }

    let isCancelled = false;

    const linkConsentDocument = async () => {
      setIsLinkingDocument(true);
      setDocumentError(null);

      try {
        const templatesResponse = await fetch('/api/modules/informed-consents/templates', {
          cache: 'no-store',
        });

        if (!templatesResponse.ok) {
          const errorText = await templatesResponse.text().catch(() => '');
          throw new Error(
            `Failed to load consent templates: HTTP ${templatesResponse.status}${errorText ? ` - ${errorText.slice(0, 300)}` : ''}`,
          );
        }

        const templates = await templatesResponse.json() as RuntimeConsentTemplate[];
        const selectedTemplate = templates.find((template) => {
          const consentType = template.consentType.toUpperCase();
          const specialty = template.specialty.toUpperCase();
          return consentType.includes('SURGICAL') || specialty.includes('SURGERY') || template.titleEn.toUpperCase().includes('SURGICAL');
        }) || templates[0];

        if (!selectedTemplate?.id) {
          throw new Error('No live consent template is available');
        }

        const draftResponse = await fetch('/api/modules/informed-consents/generate-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId: defaultPatient.mrn,
            patientMrn: defaultPatient.mrn,
            encounterId: defaultEncounter.id,
            encounterNumber: defaultEncounter.id,
            encounterDepartment: defaultEncounter.department,
            encounterPhysician: defaultEncounter.physician,
            encounterDiagnosis: 'Symptomatic cholelithiasis',
            encounterProcedure: 'Laparoscopic cholecystectomy',
            templateId: selectedTemplate.id,
            templateVersionId: selectedTemplate.templateVersionId,
            language: selectedTemplate.language,
          }),
        });

        const draftPayload = await draftResponse.json().catch(() => null) as DraftConsentResponse | { message?: string; error?: string } | null;

        if (!draftResponse.ok) {
          throw new Error((draftPayload && 'message' in draftPayload && draftPayload.message) || (draftPayload && 'error' in draftPayload && draftPayload.error) || 'Failed to generate linked consent document');
        }

        const payloadRecord = draftPayload as Record<string, unknown> | null;

        const linkedConsentDocumentId =
          typeof payloadRecord?.id === 'string'
            ? payloadRecord.id
            : typeof (payloadRecord?.document as Record<string, unknown> | undefined)?.id === 'string'
              ? String((payloadRecord?.document as Record<string, unknown>).id)
              : typeof (payloadRecord?.consentDocument as Record<string, unknown> | undefined)?.id === 'string'
                ? String((payloadRecord?.consentDocument as Record<string, unknown>).id)
                : typeof payloadRecord?.documentId === 'string'
                  ? payloadRecord.documentId
                  : typeof payloadRecord?.consentDocumentId === 'string'
                    ? payloadRecord.consentDocumentId
                    : '';

        if (!linkedConsentDocumentId) {
          throw new Error('Draft generation did not return a linked consent document');
        }

        if (!isCancelled) {
          setLinkedDocumentId(linkedConsentDocumentId);
          setDocumentReady(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setDocumentReady(false);
          setDocumentError(error instanceof Error ? error.message : 'Failed to link consent document');
        }
      } finally {
        if (!isCancelled) {
          setIsLinkingDocument(false);
        }
      }
    };

    void linkConsentDocument();

    return () => {
      isCancelled = true;
    };
  }, [currentStep, linkedDocumentId]);

  const renderStep = () => {
    const props = { lang, onNext: goNext, onPrev: goPrev, onComplete: markStepComplete };
    switch (currentStep) {
      case 'patient': return <StepPatient {...props} mobile={patientMobile} email={patientEmail} onMobileChange={setPatientMobile} onEmailChange={setPatientEmail} />;
      case 'procedure': return <StepProcedure {...props} />;
      case 'anesthesia': return <StepAnesthesia {...props} />;
      case 'disclosures': return <StepDisclosures {...props} />;
      case 'education': return <StepEducation {...props} />;
      case 'preview': return <StepPreview {...props} />;
      case 'validation': return <StepValidation {...props} validationItems={validation} />;
      case 'send': return <StepSend {...props} mobile={patientMobile} email={patientEmail} linkedDocumentId={linkedDocumentId} documentReady={documentReady} isLinkingDocument={isLinkingDocument} documentError={documentError} />;
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






