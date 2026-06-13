"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";

import type { ConsentStep, ValidationItem } from "./clinical/ClinicalTypes";
import { defaultValidation } from "./fixtures/consent-builder";
import { ValidationDrawer } from "./clinical/ValidationDrawer";
import { StepPatient } from "./steps/StepPatient";
import { StepProcedure } from "./steps/StepProcedure";
import { StepAnesthesia } from "./steps/StepAnesthesia";
import { StepDisclosures } from "./steps/StepDisclosures";
import { StepEducation } from "./steps/StepEducation";
import { StepPreview } from "./steps/StepPreview";
import { StepValidation } from "./steps/StepValidation";
import { StepSend } from "./steps/StepSend";
import { mockEncounters, mockPatients } from "./fixtures/patient-search";
import { criticalCareConsentTemplate } from "@/data/imc-digital-consent-templates";

const SAFE_CONSENT_STEP_AR_LABELS: Record<string, string> = {
  patient: "المريض",
  procedure: "الإجراء",
  anesthesia: "التخدير",
  disclosures: "الإفصاحات",
  education: "التثقيف",
  preview: "المعاينة",
  validation: "التحقق",
  send: "الإرسال",
};

function getSafeConsentStepLabel(step: Record<string, unknown>, lang: string): string {
  const stepKey = String(step.id || step.key || step.step || "").trim();

  if (lang === "ar" && SAFE_CONSENT_STEP_AR_LABELS[stepKey]) {
    return SAFE_CONSENT_STEP_AR_LABELS[stepKey];
  }

  return String(step.label || step.title || step.name || stepKey);
}

const steps: { key: ConsentStep; label: string; labelAr: string }[] = [
  { key: "patient", label: "Patient", labelAr: "المريض" },
  { key: "procedure", label: "Procedure", labelAr: "الإجراء" },
  { key: "anesthesia", label: "Anesthesia", labelAr: "التخدير" },
  { key: "disclosures", label: "Disclosures", labelAr: "الإفصاحات" },
  { key: "education", label: "Education", labelAr: "التثقيف" },
  { key: "preview", label: "Preview", labelAr: "المعاينة" },
  { key: "validation", label: "Validation", labelAr: "التحقق" },
  { key: "send", label: "Send", labelAr: "الإرسال" },
];

interface Props {
  lang: "en" | "ar";
  licenseExpired?: boolean;
  licenseExpiryDate?: string;
}

type RuntimeConsentTemplate = {
  id: string;
  templateVersionId: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department: string | null;
  language: "bilingual";
};

type DraftConsentResponse = {
  id?: string;
  documentId?: string;
  consentDocumentId?: string;
  draftPdfUrl?: string | null;
  document?: {
    id?: string;
  };
  consentDocument?: {
    id?: string;
  };
};

type TemplateApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  detail?: unknown;
};

type EducationVisualPersistPayload = {
  diagnosis?: string;
  procedure?: string;
  specialty?: string;
  language?: "ar" | "en" | "bilingual";
  formCode?: string;
  templateId?: string;
  clinicalTopic?: string;
  viewedAt?: string | null;
  displayedAt?: string | null;
  generatedAt?: string | null;
  visualAidSourceEn?: string;
  visualAidSourceAr?: string;
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
const defaultEncounter =
  mockEncounters.find((encounter) => encounter.status === "active") || mockEncounters[0];

const pilotConsentCase = {
  id: "a4173dc9-5e40-4204-9b2c-4712abb6c7fa",
  caseNumber: "ENC-2024-1847",
  medicalRecordNo: "MRN-2024-0847",
  patientName: "Mohammed Ibrahim Al-Rashidi",
  mobile: "+966 54 358 7772",
  email: "Admin@wathiqcare.med.sa",
} as const;

const defaultPatientRecord = defaultPatient as unknown as Record<string, unknown>;

function normalizeSaudiMobileForDisplay(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.startsWith("966")) {
    return `+${digits}`;
  }

  if (digits.startsWith("05")) {
    return `+966${digits.slice(1)}`;
  }

  if (digits.startsWith("5") && digits.length === 9) {
    return `+966${digits}`;
  }

  return trimmed;
}

function extractLinkedConsentDocumentId(payload: DraftConsentResponse | null): string {
  if (!payload) return "";

  if (typeof payload.id === "string" && payload.id.trim()) {
    return payload.id.trim();
  }

  if (typeof payload.document?.id === "string" && payload.document.id.trim()) {
    return payload.document.id.trim();
  }

  if (
    typeof payload.consentDocument?.id === "string" &&
    payload.consentDocument.id.trim()
  ) {
    return payload.consentDocument.id.trim();
  }

  if (typeof payload.documentId === "string" && payload.documentId.trim()) {
    return payload.documentId.trim();
  }

  if (
    typeof payload.consentDocumentId === "string" &&
    payload.consentDocumentId.trim()
  ) {
    return payload.consentDocumentId.trim();
  }

  return "";
}

function readTemplateApiErrorMessage(payload: TemplateApiErrorPayload | null): string {
  const candidates = [payload?.error, payload?.message, payload?.detail];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isCriticalCareProcedure(procedure: Record<string, unknown> | undefined): boolean {
  if (!procedure) {
    return false;
  }

  const values = [
    procedure.id,
    procedure.code,
    procedure.name,
    procedure.category,
    procedure.description,
    (procedure.digitalConsentTemplate as Record<string, unknown> | undefined)?.formCode,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());

  return values.some(
    (value) =>
      value.includes("imc mr 1363") ||
      value.includes("imc-mr-1363") ||
      value.includes("critical care") ||
      value.includes("intensive care") ||
      value.includes("icu"),
  );
}

function selectTemplateForProcedure(
  templates: RuntimeConsentTemplate[],
  procedure: Record<string, unknown> | undefined,
): RuntimeConsentTemplate | undefined {
  const criticalCareSelected = isCriticalCareProcedure(procedure);

  if (criticalCareSelected) {
    return templates.find((template) => {
      const title = template.titleEn.toUpperCase();
      const specialty = template.specialty.toUpperCase();
      const department = String(template.department || "").toUpperCase();

      return (
        title.includes("CRITICAL CARE") ||
        title.includes("INTENSIVE CARE") ||
        specialty.includes("CRITICAL CARE") ||
        specialty.includes("INTENSIVE CARE") ||
        department.includes("ICU") ||
        department.includes("CRITICAL_CARE")
      );
    });
  }

  const name = String(procedure?.name || "").toUpperCase();
  const category = String(procedure?.category || "").toUpperCase();

  const directMatch = templates.find((template) => {
    const title = template.titleEn.toUpperCase();
    const specialty = template.specialty.toUpperCase();
    const department = String(template.department || "").toUpperCase();

    return (
      (name && title.includes(name)) ||
      (category && specialty.includes(category)) ||
      (category && department.includes(category.replace(/\s+/g, "_")))
    );
  });

  if (directMatch) {
    return directMatch;
  }

  return (
    templates.find(
      (template) =>
        template.id === "9c8e816b-d236-4e4c-a9de-7bddb6819354" ||
        template.templateVersionId === "a587c129-102c-4566-a452-3a7b72ba2544",
    ) ||
    templates.find((template) => {
      const consentType = template.consentType.toUpperCase();
      const specialty = template.specialty.toUpperCase();
      const department = String(template.department || "").toUpperCase();
      const title = template.titleEn.toUpperCase();

      return (
        specialty.includes("SURGERY") ||
        department.includes("GENERAL_SURGERY") ||
        title.includes("SURGICAL") ||
        consentType.includes("SURGICAL")
      );
    }) ||
    templates[0]
  );
}

export function ConsentBuilder({
  lang,
  licenseExpired = false,
  licenseExpiryDate,
}: Props) {
  const initialPatientMobile = normalizeSaudiMobileForDisplay(pilotConsentCase.mobile);
  const initialPatientEmail = pilotConsentCase.email;

  const [currentStep, setCurrentStep] = useState<ConsentStep>("patient");
  const [validation, setValidation] = useState<ValidationItem[]>(defaultValidation);
  const [completedSteps, setCompletedSteps] = useState<Set<ConsentStep>>(
    new Set<ConsentStep>(),
  );

  const [patientMobile, setPatientMobile] = useState(initialPatientMobile);
  const [patientEmail, setPatientEmail] = useState(initialPatientEmail);

  const [builderState, setBuilderState] = useState<BuilderState>({
    patient: {
      name: String(
        defaultPatientRecord.name ||
          defaultPatientRecord.fullName ||
          defaultPatientRecord.patientName ||
          pilotConsentCase.patientName ||
          "Selected patient",
      ),
      mrn: String(
        defaultPatientRecord.mrn ||
          defaultPatientRecord.MRN ||
          pilotConsentCase.medicalRecordNo ||
          "Not provided",
      ),
      dateOfBirth: String(
        defaultPatientRecord.dateOfBirth ||
          defaultPatientRecord.dob ||
          "Not provided",
      ),
      mobile: initialPatientMobile,
      email: initialPatientEmail,
    },
    procedure: {
      id: "IMC-MR-1363",
      code: criticalCareConsentTemplate.formCode,
      name: criticalCareConsentTemplate.title.en,
      nameAr: criticalCareConsentTemplate.title.ar,
      category: criticalCareConsentTemplate.specialty.en,
      categoryAr: criticalCareConsentTemplate.specialty.ar,
      description:
        "Structured bilingual ICU consent template with selectable procedures, physician notes, refusal documentation, and production PDF rendering.",
      descriptionAr:
        "قالب موافقة رقمي ثنائي اللغة للعناية الحرجة يتضمن إجراءات قابلة للاختيار، ملاحظات الطبيب، توثيق الرفض، وإصدار PDF نهائي.",
      requiresAnesthesia: false,
      digitalConsentTemplate: {
        id: criticalCareConsentTemplate.id,
        formCode: criticalCareConsentTemplate.formCode,
        version: criticalCareConsentTemplate.version,
        title: criticalCareConsentTemplate.title,
        source: criticalCareConsentTemplate.source,
        selectedIcuProcedures: criticalCareConsentTemplate.procedures
          .filter((procedure) => procedure.isDefaultSelected)
          .map((procedure) => procedure.id),
        selectedIcuProcedureDetails: criticalCareConsentTemplate.procedures.filter(
          (procedure) => procedure.isDefaultSelected,
        ),
        changePolicy: criticalCareConsentTemplate.audit.changePolicy,
      },
    },
    anesthesia: {
      applies: false,
      status: "Not required",
      typeLabel: "No separate anesthesia consent by default",
      typeLabelAr: "لا يلزم نموذج تخدير مستقل افتراضياً",
      anesthesiologistRequired: false,
    },
    disclosures: {},
    education: {},
    document: {},
  });

  const [linkedDocumentId, setLinkedDocumentId] = useState("");
  const [documentReady, setDocumentReady] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isLinkingDocument, setIsLinkingDocument] = useState(false);

  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  const markStepComplete = (
    step: ConsentStep,
    itemIds: string[],
    payload?: Record<string, unknown>,
  ) => {
    const completedIds = new Set(itemIds);

    if (step === "anesthesia" && completedIds.has("anesthesia-not-applicable")) {
      completedIds.add("v6");
      completedIds.add("v7");
      completedIds.add("v8");
    }

    if (step === "disclosures") {
      completedIds.add("v9");
      completedIds.add("v10");
      completedIds.add("v11");
      completedIds.add("v12");
    }

    if (step === "education") {
      completedIds.add("v13");
    }

    if (payload) {
      setBuilderState((prev) => ({
        ...prev,
        ...(payload as Partial<BuilderState>),
        updatedAt: new Date().toISOString(),
      }));
    }

    setValidation((prev) =>
      prev.map((item) =>
        completedIds.has(item.id) ? { ...item, complete: true } : item,
      ),
    );

    setCompletedSteps((prev) => new Set([...prev, step]));
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
    const shouldLinkDocument =
      currentStep === "preview" ||
      currentStep === "validation" ||
      currentStep === "send";

    if (!shouldLinkDocument || linkedDocumentId) {
      return;
    }

    let isCancelled = false;

    const linkConsentDocument = async () => {
      setIsLinkingDocument(true);
      setDocumentReady(false);
      setDocumentError(null);
      setTemplateError(null);

      try {
        const procedure = builderState.procedure;
        const criticalCareWorkflow = isCriticalCareProcedure(procedure);
        const templatesResponse = await fetch("/api/modules/informed-consents/templates", {
          cache: "no-store",
        });

        if (!templatesResponse.ok) {
          const responseText = await templatesResponse.text().catch(() => "");
          let responsePayload: TemplateApiErrorPayload | null = null;

          if (responseText) {
            try {
              responsePayload = JSON.parse(responseText) as TemplateApiErrorPayload;
            } catch {
              responsePayload = null;
            }
          }

          const apiErrorMessage = readTemplateApiErrorMessage(responsePayload);
          const fallbackMessage = `Failed to load consent templates: HTTP ${templatesResponse.status}${
            responseText && !apiErrorMessage ? ` - ${responseText.slice(0, 300)}` : ""
          }`;
          const nextTemplateError = apiErrorMessage || fallbackMessage;

          setTemplateError(nextTemplateError);
          throw new Error(nextTemplateError);
        }

        setTemplateError(null);

        const templates = (await templatesResponse.json()) as RuntimeConsentTemplate[];
        const selectedTemplate = selectTemplateForProcedure(
          templates,
          procedure as Record<string, unknown> | undefined,
        );

        if (!selectedTemplate?.id) {
          const selectedTemplateError = criticalCareWorkflow
            ? "No live Critical Care / IMC MR 1363 consent template is available in Preview. The workflow is blocked until the informed-consent catalog is available for this tenant."
            : "No live consent template is available";

          setTemplateError(selectedTemplateError);
          throw new Error(
            criticalCareWorkflow
              ? selectedTemplateError
              : selectedTemplateError,
          );
        }

        setTemplateError(null);

        const procedureCode = String((procedure as Record<string, unknown> | undefined)?.code || "").trim();
        const procedureName = String((procedure as Record<string, unknown> | undefined)?.name || "").trim();
        const procedureDescription = String(
          (procedure as Record<string, unknown> | undefined)?.description || "",
        ).trim();
        const procedureCategory = String(
          (procedure as Record<string, unknown> | undefined)?.category || "",
        ).trim();
        const digitalConsentTemplate =
          ((procedure as Record<string, unknown> | undefined)?.digitalConsentTemplate as
            | Record<string, unknown>
            | undefined) || undefined;
        const educationState = asRecord(builderState.education);

        const draftResponse = await fetch(
          "/api/modules/informed-consents/generate-draft",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              patientId: pilotConsentCase.medicalRecordNo,
              patientMrn: pilotConsentCase.medicalRecordNo,
              patientCaseId: pilotConsentCase.id,
              patientName: pilotConsentCase.patientName,
              patientMobile,
              patientEmail,
              encounterId: pilotConsentCase.caseNumber,
              encounterNumber: pilotConsentCase.caseNumber,
              encounterCaseNumber: pilotConsentCase.caseNumber,
              encounterDepartment: procedureCategory || defaultEncounter.department || "General Surgery",
              encounterPhysician: defaultEncounter.physician || "Dr. Khalid Al-Qahtani",
              encounterDiagnosis: procedureDescription || procedureName,
              encounterProcedure: procedureName,
              templateId: selectedTemplate.id,
              templateVersionId: selectedTemplate.templateVersionId,
              formCode: procedureCode || undefined,
              digitalConsentTemplate,
              education: educationState,
              language: selectedTemplate.language,
            }),
          },
        );

        const draftPayload = (await draftResponse.json().catch(() => null)) as
          | DraftConsentResponse
          | { message?: string; error?: string }
          | null;

        if (!draftResponse.ok) {
          throw new Error(
            (draftPayload && "message" in draftPayload && draftPayload.message) ||
              (draftPayload && "error" in draftPayload && draftPayload.error) ||
              "Failed to generate linked consent document",
          );
        }

        const linkedConsentDocumentId = extractLinkedConsentDocumentId(
          draftPayload as DraftConsentResponse | null,
        );

        if (!linkedConsentDocumentId) {
          throw new Error("Draft generation did not return a linked consent document");
        }

        const visualRequest = asRecord(educationState.visualRequest) as EducationVisualPersistPayload;
        if (visualRequest.templateId && visualRequest.formCode) {
          const persistVisualResponse = await fetch(
            "/api/modules/informed-consents/education-visual/generate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...visualRequest,
                consentDocumentId: linkedConsentDocumentId,
              }),
            },
          );

          const persistVisualPayload = (await persistVisualResponse.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;

          if (!persistVisualResponse.ok) {
            throw new Error(
              persistVisualPayload?.error
                || persistVisualPayload?.message
                || "Failed to capture Step 5 visual aid evidence for the linked consent document",
            );
          }
        }

        if (!isCancelled) {
          setLinkedDocumentId(linkedConsentDocumentId);
          setDocumentReady(true);
          setDocumentError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setLinkedDocumentId("");
          setDocumentReady(false);
          setDocumentError(
            error instanceof Error ? error.message : "Failed to link consent document",
          );
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
  }, [currentStep, linkedDocumentId, patientMobile, patientEmail, builderState.procedure, builderState.education]);

  const licenseWarning = licenseExpired ? (
    <div className="mx-6 mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {lang === "en"
        ? `Physician medical license has expired${
            licenseExpiryDate ? ` on ${licenseExpiryDate}` : ""
          }. Consent issuance is blocked until the license is renewed.`
        : `انتهت صلاحية الترخيص الطبي للطبيب${
            licenseExpiryDate ? ` بتاريخ ${licenseExpiryDate}` : ""
          }، ولا يمكن إصدار الموافقة حتى يتم تجديد الترخيص.`}
    </div>
  ) : null;

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
        documentError: templateError || documentError,
        isLinkingDocument,
      },
    };

    const props = {
      lang,
      onNext: goNext,
      onPrev: goPrev,
      onComplete: markStepComplete,
    };

    switch (currentStep) {
      case "patient":
        return (
          <StepPatient
            {...props}
            mobile={patientMobile}
            email={patientEmail}
            onMobileChange={setPatientMobile}
            onEmailChange={setPatientEmail}
          />
        );

      case "procedure":
        return <StepProcedure {...props} />;

      case "anesthesia":
        return <StepAnesthesia {...props} />;

      case "disclosures":
        return <StepDisclosures {...props} />;

      case "education":
        return <StepEducation {...props} procedure={builderState.procedure} />;

      case "preview":
        return (
          <StepPreview
            {...props}
            builderState={liveBuilderState}
            linkedDocumentId={linkedDocumentId}
            documentReady={documentReady}
            documentError={templateError || documentError}
            isLinkingDocument={isLinkingDocument}
            onGoToStep={setCurrentStep}
          />
        );

      case "validation":
        return <StepValidation {...props} validationItems={validation} />;

      case "send":
        return (
          <StepSend
            {...props}
            mobile={patientMobile}
            email={patientEmail}
            linkedDocumentId={linkedDocumentId}
            documentReady={documentReady}
            isLinkingDocument={isLinkingDocument}
            documentError={templateError || documentError}
            licenseExpired={licenseExpired}
            licenseExpiryDate={licenseExpiryDate}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {licenseWarning}

      <div className="bg-white border-b border-[#D8DCE3] px-8 py-0">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isComplete = completedSteps.has(step.key) && !isActive;
            const isPast = index < currentIndex;
            const displayLabel = getSafeConsentStepLabel(
              {
                key: step.key,
                label: step.label,
                title: step.label,
              },
              lang,
            );

            return (
              <React.Fragment key={step.key}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? "border-[#002B5C] text-[#002B5C]"
                      : isComplete || isPast
                        ? "border-transparent text-emerald-600 hover:text-[#002B5C]"
                        : "border-transparent text-[#6B7280] hover:text-[#2F2F2F]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold border shrink-0 ${
                      isActive
                        ? "bg-[#002B5C] text-white border-[#002B5C]"
                        : isComplete || isPast
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-[#6B7280] border-[#D8DCE3]"
                    }`}
                  >
                    {isComplete || isPast ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span>{lang === "en" ? step.label : displayLabel}</span>
                </button>

                {index < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#D8DCE3] mx-1 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

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