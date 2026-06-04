"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import type { ConsentStep, ValidationItem } from './clinical/ClinicalTypes';
import { defaultValidation } from './fixtures/consent-builder';
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


const SAFE_CONSENT_STEP_AR_LABELS: Record<string, string> = {
  patient: "\u0627\u0644\u0645\u0631\u064a\u0636",
  procedure: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621",
  anesthesia: "\u0627\u0644\u062a\u062e\u062f\u064a\u0631",
  disclosures: "\u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a",
  education: "\u0627\u0644\u062a\u062b\u0642\u064a\u0641",
  preview: "\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629",
  validation: "\u0627\u0644\u062a\u062d\u0642\u0642",
  send: "\u0627\u0644\u0625\u0631\u0633\u0627\u0644",
};

function getSafeConsentStepLabel(step: Record<string, unknown>, lang: string): string {
  const stepKey = String(step.id || step.key || step.step || "").trim();

  if (lang === "ar" && SAFE_CONSENT_STEP_AR_LABELS[stepKey]) {
    return SAFE_CONSENT_STEP_AR_LABELS[stepKey];
  }

  return String(step.label || step.title || step.name || stepKey);
}

const steps: { key: ConsentStep; label: string; labelAr: string }[] = [
  { key: 'patient', label: 'Patient', labelAr: "\u0627\u0644\u0645\u0631\u064a\u0636" },
  { key: 'procedure', label: 'Procedure', labelAr: "\u0627\u0644\u0625\u062c\u0631\u0627\u0621" },
  { key: 'anesthesia', label: 'Anesthesia', labelAr: "\u0627\u0644\u062a\u062e\u062f\u064a\u0631" },
  { key: 'disclosures', label: 'Disclosures', labelAr: "\u0627\u0644\u0625\u0641\u0635\u0627\u062d\u0627\u062a" },
  { key: 'education', label: 'Education', labelAr: "\u0627\u0644\u062a\u062b\u0642\u064a\u0641" },
  { key: 'preview', label: 'Preview', labelAr: "\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629" },
  { key: 'validation', label: 'Validation', labelAr: "\u0627\u0644\u062a\u062d\u0642\u0642" },
  { key: 'send', label: 'Send', labelAr: "\u0627\u0644\u0625\u0631\u0633\u0627\u0644" },
];


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

type BuilderState = {
  patient: Record<string, unknown>;
  procedure: Record<string, unknown>;
  anesthesia: Record<string, unknown>;
  disclosures: Record<string, unknown>;
  education: Record<string, unknown>;
  document: Record<string, unknown>;
  updatedAt?: string;
};

const defaultPatient = mockPatients[0];
const defaultEncounter = mockEncounters.find((encounter) => encounter.status === 'active') || mockEncounters[0];

const pilotConsentCase = {
  id: 'a4173dc9-5e40-4204-9b2c-4712abb6c7fa',
  caseNumber: 'ENC-2024-1847',
  medicalRecordNo: 'MRN-2024-0847',
  patientName: 'Mohammed Ibrahim Al-Rashidi',
  mobile: '',
  email: '',
} as const;

const defaultPatientRecord = defaultPatient as unknown as Record<string, unknown>;
const defaultEncounterRecord = defaultEncounter as unknown as Record<string, unknown>;

export function ConsentBuilder({ lang }: Props) {
  const [currentStep, setCurrentStep] = useState<ConsentStep>('patient');
  const [validation, setValidation] = useState<ValidationItem[]>(defaultValidation);
  const [completedSteps, setCompletedSteps] = useState<Set<ConsentStep>>(new Set<ConsentStep>());
  const [patientMobile, setPatientMobile] = useState(pilotConsentCase.mobile);
  const [patientEmail, setPatientEmail] = useState(pilotConsentCase.email);
  const [builderState, setBuilderState] = useState<BuilderState>({
    patient: {
      name: String(defaultPatientRecord.name || defaultPatientRecord.fullName || defaultPatientRecord.patientName || 'Selected patient'),
      mrn: String(defaultPatientRecord.mrn || defaultPatientRecord.MRN || 'Not provided'),
      dateOfBirth: String(defaultPatientRecord.dateOfBirth || defaultPatientRecord.dob || 'Not provided'),
      mobile: patientMobile,
      email: patientEmail,
    },
    procedure: {
      name: 'Not selected',
      nameAr: '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
      description: 'Not provided',
      descriptionAr: '\u063a\u064a\u0631 \u0645\u062f\u062e\u0644',
      requiresAnesthesia: false,
    },
    anesthesia: {
      applies: false,
      status: 'Not applicable',
      typeLabel: 'Not applicable',
      typeLabelAr: '\u063a\u064a\u0631 \u0645\u0646\u0637\u0628\u0642',
      anesthesiologistRequired: false,
    },
    disclosures: {},
    education: {},
    document: {},
  });
  const [linkedDocumentId, setLinkedDocumentId] = useState('');
  const [documentReady, setDocumentReady] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isLinkingDocument, setIsLinkingDocument] = useState(false);

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  const markStepComplete = (step: ConsentStep, itemIds: string[], payload?: Record<string, unknown>) => {
    const completedIds = new Set(itemIds);

    if (step === 'anesthesia' && completedIds.has('anesthesia-not-applicable')) {
      completedIds.add('v6');
      completedIds.add('v7');
      completedIds.add('v8');
    }

    if (step === 'disclosures') {
      completedIds.add('v9');
      completedIds.add('v10');
      completedIds.add('v11');
      completedIds.add('v12');
    }

    if (step === 'education') {
      completedIds.add('v13');
    }

    if (payload) {
      setBuilderState(prev => ({
        ...prev,
        ...(payload as Partial<BuilderState>),
        updatedAt: new Date().toISOString(),
      }));
    }

    setValidation(prev => prev.map(v => completedIds.has(v.id) ? { ...v, complete: true } : v));
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
            patientId: pilotConsentCase.medicalRecordNo,
            patientMrn: pilotConsentCase.medicalRecordNo,
            patientCaseId: pilotConsentCase.id,
            encounterId: pilotConsentCase.caseNumber,
            encounterNumber: pilotConsentCase.caseNumber,
            encounterCaseNumber: pilotConsentCase.caseNumber,
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
    const liveBuilderState: BuilderState = {
      ...builderState,
      patient: {
        ...builderState.patient,
        mobile: patientMobile,
        email: patientEmail,
      },
      document: {
        linkedDocumentId,
        documentReady,
        documentError,
        isLinkingDocument,
      },
    };

    const props = { lang, onNext: goNext, onPrev: goPrev, onComplete: markStepComplete };
    switch (currentStep) {
      case 'patient': return <StepPatient {...props} mobile={patientMobile} email={patientEmail} onMobileChange={setPatientMobile} onEmailChange={setPatientEmail} />;
      case 'procedure': return <StepProcedure {...props} />;
      case 'anesthesia': return <StepAnesthesia {...props} />;
      case 'disclosures': return <StepDisclosures {...props} />;
      case 'education': return <StepEducation {...props} />;
      case 'preview': return <StepPreview {...props} builderState={liveBuilderState} linkedDocumentId={linkedDocumentId} documentReady={documentReady} documentError={documentError} isLinkingDocument={isLinkingDocument} onGoToStep={setCurrentStep} />;
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


