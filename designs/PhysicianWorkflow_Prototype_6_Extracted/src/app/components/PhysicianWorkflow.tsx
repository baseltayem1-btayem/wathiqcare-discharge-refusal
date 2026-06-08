import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { StepPatientSearch } from './workflow/StepPatientSearch';
import { ReadinessPanel } from './workflow/ReadinessPanel';
import type { Patient, Encounter, IMCLibraryItem, AnesthesiaDecision, DraftDocument, ReadinessChecklist, WorkflowStep } from './workflow/WorkflowTypes';

const workflowSteps = [
  { key: 'patient-search' as WorkflowStep, label: 'Patient Search', labelAr: 'البحث عن مريض' },
  { key: 'encounter-selection' as WorkflowStep, label: 'Encounter Selection', labelAr: 'اختيار الزيارة' },
  { key: 'consent-selection' as WorkflowStep, label: 'Consent Selection', labelAr: 'اختيار الموافقة' },
  { key: 'anesthesia-decision' as WorkflowStep, label: 'Anesthesia Decision', labelAr: 'قرار التخدير' },
  { key: 'draft-generation' as WorkflowStep, label: 'Draft Generation', labelAr: 'إنشاء المسودة' },
  { key: 'draft-review' as WorkflowStep, label: 'Draft Review', labelAr: 'مراجعة المسودة' },
  { key: 'patient-notification' as WorkflowStep, label: 'Patient Notification', labelAr: 'إشعار المريض' },
  { key: 'audit-evidence' as WorkflowStep, label: 'Audit & Evidence', labelAr: 'التدقيق والأدلة' },
];

interface Props {
  lang: 'en' | 'ar';
}

export function PhysicianWorkflow({ lang }: Props) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('patient-search');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [selectedConsent, setSelectedConsent] = useState<IMCLibraryItem | null>(null);
  const [anesthesiaDecision, setAnesthesiaDecision] = useState<AnesthesiaDecision | null>(null);
  const [draftDocument, setDraftDocument] = useState<DraftDocument | null>(null);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const currentStepIndex = workflowSteps.findIndex(s => s.key === currentStep);

  // Calculate readiness checklist
  const checklist: ReadinessChecklist = {
    patientSelected: !!selectedPatient,
    encounterSelected: !!selectedEncounter,
    consentSelected: !!selectedConsent,
    templateMapped: !!selectedConsent?.mappingAvailable,
    anesthesiaDecisionComplete: !!anesthesiaDecision,
    anesthesiaReviewSatisfied: !anesthesiaDecision?.reviewRequired || false, // Would check actual review status
    draftPdfGenerated: !!draftDocument?.pdfGenerated,
    pdfReviewAvailable: !!draftDocument?.pdfUrl,
    readyForNotification: !!(draftDocument?.pdfGenerated && (!anesthesiaDecision?.reviewRequired || false)),
    evidenceReady: !!draftDocument?.pdfGenerated,
  };

  const handlePatientSelected = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentStep('encounter-selection');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Workflow Stepper */}
      <div className="bg-white border-b border-[#D8DCE3] px-8 py-0 shrink-0">
        <div className="flex items-center overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {workflowSteps.map((step, i) => {
            const isActive = currentStep === step.key;
            const isPast = i < currentStepIndex;
            const isComplete = isPast;

            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 py-4 px-3 border-b-2 transition-all text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? 'border-[#002B5C] text-[#002B5C]'
                      : isComplete
                      ? 'border-transparent text-emerald-600 hover:text-[#002B5C]'
                      : 'border-transparent text-[#6B7280] hover:text-[#2F2F2F]'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 ${
                      isActive
                        ? 'bg-[#002B5C] text-white border-[#002B5C]'
                        : isComplete
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-[#6B7280] border-[#D8DCE3]'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span>{lang === 'en' ? step.label : step.labelAr}</span>
                </button>
                {i < workflowSteps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#D8DCE3] mx-0.5 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content + Readiness Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Workflow Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F4F6F9]">
          {currentStep === 'patient-search' && (
            <StepPatientSearch lang={lang} onPatientSelected={handlePatientSelected} />
          )}
          {currentStep === 'encounter-selection' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Encounter Selection' : 'اختيار الزيارة'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'This screen will load encounters for the selected patient' : 'ستعرض هذه الشاشة زيارات المريض المحدد'}
              </p>
            </div>
          )}
          {currentStep === 'consent-selection' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Consent / Procedure Selection' : 'اختيار الموافقة / الإجراء'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Select IMC-approved consent templates' : 'اختر قوالب الموافقة المعتمدة من IMC'}
              </p>
            </div>
          )}
          {currentStep === 'anesthesia-decision' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Anesthesia Decision' : 'قرار التخدير'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Select anesthesia type and review requirements' : 'اختر نوع التخدير ومتطلبات المراجعة'}
              </p>
            </div>
          )}
          {currentStep === 'draft-generation' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Draft PDF Generation' : 'إنشاء مسودة PDF'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Generate consent document draft PDF' : 'إنشاء مسودة وثيقة الموافقة PDF'}
              </p>
            </div>
          )}
          {currentStep === 'draft-review' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Draft PDF Review' : 'مراجعة مسودة PDF'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Review generated PDF and request anesthesia review if needed' : 'راجع ملف PDF المنشأ واطلب مراجعة التخدير إذا لزم الأمر'}
              </p>
            </div>
          )}
          {currentStep === 'patient-notification' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Patient Notification' : 'إشعار المريض'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Send secure signing link to patient' : 'إرسال رابط التوقيع الآمن للمريض'}
              </p>
            </div>
          )}
          {currentStep === 'audit-evidence' && (
            <div className="bg-white border border-[#D8DCE3] rounded-lg p-12 text-center">
              <h3 className="text-lg font-semibold text-[#2F2F2F] mb-2">
                {lang === 'en' ? 'Audit & Evidence Readiness' : 'جاهزية التدقيق والأدلة'}
              </h3>
              <p className="text-sm text-[#6B7280]">
                {lang === 'en' ? 'Evidence package and audit trail status' : 'حالة حزمة الأدلة ومسار التدقيق'}
              </p>
            </div>
          )}
        </div>

        {/* Readiness Panel */}
        <div className="w-80 border-l border-[#D8DCE3] bg-[#F8FAFC] p-6 overflow-y-auto shrink-0">
          <ReadinessPanel checklist={checklist} lang={lang} />
        </div>
      </div>
    </div>
  );
}
