"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Download,
  FileCheck2,
  FileBadge2,
  FilePlus2,
  FileText,
  Gavel,
  HandHelping,
  MessageSquareHeart,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import WorkflowProgress, { type WorkflowProgressStep } from "@/components/ui/WorkflowProgress";
import DocumentPreviewModal from "@/components/workflow/DocumentPreviewModal";
import CaseWorkflowTree from "@/components/cases/CaseWorkflowTree";
import WorkflowDocumentList from "@/components/workflow/WorkflowDocumentList";
import WorkflowTimelinePanel from "@/components/workflow/WorkflowTimelinePanel";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken, isAuthenticationError } from "@/utils/api";
import { downloadProtectedDocument } from "@/utils/protectedDocuments";
import { dischargeRefusalWorkflowService } from "@/lib/services/dischargeRefusalWorkflow.service";
import {
  dischargeCasesService,
  type DischargeCaseDetail as CaseDetail,
} from "@/lib/services/dischargeCases.service";
import {
  dischargeRefusalFormTemplate,
  type DischargeRefusalTemplatePayload,
} from "@/lib/templates/dischargeRefusalForm.template";
import {
  financialResponsibilityNoticeTemplate,
  type FinancialResponsibilityNoticePayload,
} from "@/lib/templates/financialResponsibilityNotice.template";
import { validateDischargeRefusalGeneration } from "@/lib/validators/dischargeRefusal.validator";
import type {
  DischargeRefusalWorkflow as DischargeRefusalWorkflowContract,
  WorkflowMutationResponse,
} from "@/lib/types/discharge-refusal";
import {
  DischargeWorkflow,
  WorkflowDocumentItem,
  WorkflowActionKey,
  WorkflowPreviewResponse,
  WorkflowPolicyValidation,
  WorkflowPolicyRequirement,
} from "@/types/dischargeWorkflow";
import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";

type AuditItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
};

type TabKey = "overview" | "consents" | "agreements" | "roi" | "archive" | "audit";

type DocumentTemplateKey =
  | "discharge_refusal_form"
  | "informed_consent"
  | "financial_responsibility_notice"
  | "home_healthcare_agreement"
  | "equipment_liability"
  | "release_of_information";

type WorkflowDraft = {
  patient_name: string;
  patient_id_number: string;
  medical_record_number: string;
  room_number: string;
  attending_physician: string;
  refusal_reason: string;
  discussion_summary: string;
  social_administrative_interventions: string;
  forms_issued: string;
  insurance_coverage_status: string;
  discharge_decision_at: string;
};

type PolicyRefusalReasonOption = {
  value: string;
  stages: Array<DischargeWorkflow["current_stage"]>;
  labelKey: string;
};

const POLICY_REFUSAL_REASON_OPTIONS: PolicyRefusalReasonOption[] = [
  {
    value: "needs_additional_clinical_explanation",
    stages: ["medical_discharge_decision", "initial_communication"],
    labelKey: "caseDetails.refusalReasons.needsAdditionalClinicalExplanation",
  },
  {
    value: "family_or_guardian_needs_time",
    stages: ["initial_communication", "support_and_intervention"],
    labelKey: "caseDetails.refusalReasons.familyOrGuardianNeedsTime",
  },
  {
    value: "requests_extended_stay",
    stages: ["initial_communication", "support_and_intervention"],
    labelKey: "caseDetails.refusalReasons.requestsExtendedStay",
  },
  {
    value: "caregiver_or_home_support_unavailable",
    stages: ["support_and_intervention", "refusal_form", "official_notification"],
    labelKey: "caseDetails.refusalReasons.caregiverOrHomeSupportUnavailable",
  },
  {
    value: "homecare_or_equipment_not_ready",
    stages: ["support_and_intervention", "refusal_form", "official_notification"],
    labelKey: "caseDetails.refusalReasons.homecareOrEquipmentNotReady",
  },
  {
    value: "transport_or_destination_not_ready",
    stages: ["support_and_intervention", "refusal_form", "official_notification"],
    labelKey: "caseDetails.refusalReasons.transportOrDestinationNotReady",
  },
  {
    value: "refuses_to_sign_acknowledgment",
    stages: ["refusal_form", "official_notification", "escalation", "closed"],
    labelKey: "caseDetails.refusalReasons.refusesToSignAcknowledgment",
  },
  {
    value: "financial_responsibility_concern",
    stages: ["official_notification", "escalation", "closed"],
    labelKey: "caseDetails.refusalReasons.financialResponsibilityConcern",
  },
  {
    value: "continued_refusal_after_notice",
    stages: ["escalation", "closed"],
    labelKey: "caseDetails.refusalReasons.continuedRefusalAfterNotice",
  },
  {
    value: "other_documented_policy_reason",
    stages: [
      "medical_discharge_decision",
      "initial_communication",
      "support_and_intervention",
      "refusal_form",
      "official_notification",
      "escalation",
      "closed",
    ],
    labelKey: "caseDetails.refusalReasons.otherDocumentedPolicyReason",
  },
];

const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  medical_discharge_decision: "قرار الخروج الطبي",
  initial_communication: "التواصل الأولي",
  support_and_intervention: "الدعم والتدخل",
  refusal_form: "نموذج الرفض",
  official_notification: "الإشعار الرسمي",
  escalation: "التصعيد",
  closed: "مغلقة",
};

const WORKFLOW_STAGE_LABELS_EN: Record<string, string> = {
  medical_discharge_decision: "Medical Discharge Decision",
  initial_communication: "Initial Communication",
  support_and_intervention: "Support and Intervention",
  refusal_form: "Refusal Form",
  official_notification: "Official Notification",
  escalation: "Escalation Review",
  closed: "Archive",
};

const WORKFLOW_STAGE_ROUTES: Partial<Record<string, (caseId: string) => string>> = {
  initial_communication: (caseId) => `/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`,
  support_and_intervention: (caseId) => `/workflow/medical-discharge-refusal/case/${caseId}/social-services`,
  refusal_form: (caseId) => `/cases/${caseId}/refusal-form`,
  official_notification: (caseId) => `/cases/${caseId}/financial-notice`,
  escalation: (caseId) => `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`,
};

const VALIDATION_FIELD_MAP: Record<string, string> = {
  patientName: "patient_name",
  patientIdNumber: "patient_id_number",
  medicalRecordNumber: "medical_record_number",
  roomNumber: "room_number",
  attendingPhysicianName: "attending_physician",
  dischargeDecisionAt: "discharge_decision_at",
  refusalReasonOrDiscussionSummary: "refusal_reason_or_summary",
};

const MIN_REQUIRED_VALIDATION_FIELDS = [
  "patient_name",
  "patient_id_number",
  "medical_record_number",
  "room_number",
  "attending_physician",
  "discharge_decision_at",
  "refusal_reason_or_summary",
];

const ISSUANCE_DOCUMENTS: Array<{
  key: DocumentTemplateKey;
  label: string;
  supportedGeneration: boolean;
  signaturePath?: string;
}> = [
    {
      key: "discharge_refusal_form",
      label: "Refusal of Discharge",
      supportedGeneration: true,
      signaturePath: "refusal-form",
    },
    {
      key: "informed_consent",
      label: "Informed Consent",
      supportedGeneration: true,
      signaturePath: "informed-consent",
    },
    {
      key: "financial_responsibility_notice",
      label: "Financial Responsibility",
      supportedGeneration: true,
      signaturePath: "financial-notice",
    },
    {
      key: "home_healthcare_agreement",
      label: "Home Care Agreement",
      supportedGeneration: true,
      signaturePath: "home-healthcare-agreement",
    },
    {
      key: "equipment_liability",
      label: "Equipment Liability",
      supportedGeneration: false,
    },
    {
      key: "release_of_information",
      label: "Release of Information",
      supportedGeneration: false,
    },
  ];

function toDateTimeLocal(raw: string | null | undefined): string {
  if (!raw) {
    return "";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toReadable(raw: string | null | undefined, locale: string): string {
  if (!raw) {
    return "-";
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString(locale);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function cloneMetadataRecord(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
}

function refusalReasonOptionsForStage(stage: DischargeWorkflow["current_stage"] | null | undefined) {
  const currentStage = stage || "medical_discharge_decision";
  return POLICY_REFUSAL_REASON_OPTIONS.filter((option) => option.stages.includes(currentStage));
}

function refusalReasonGuidanceKey(stage: DischargeWorkflow["current_stage"] | null | undefined): string {
  switch (stage) {
    case "initial_communication":
      return "caseDetails.overview.refusalReasonHelpCommunication";
    case "support_and_intervention":
      return "caseDetails.overview.refusalReasonHelpSupport";
    case "refusal_form":
      return "caseDetails.overview.refusalReasonHelpRefusalForm";
    case "official_notification":
      return "caseDetails.overview.refusalReasonHelpOfficialNotification";
    case "escalation":
    case "closed":
      return "caseDetails.overview.refusalReasonHelpEscalation";
    case "medical_discharge_decision":
    default:
      return "caseDetails.overview.refusalReasonHelpDecision";
  }
}

function documentTemplateTitle(templateKey: DocumentTemplateKey, t: (key: string) => string): string {
  const keyMap: Record<DocumentTemplateKey, string> = {
    discharge_refusal_form: "caseDetails.documentTitles.dischargeRefusalForm",
    informed_consent: "caseDetails.documentTitles.informedConsent",
    financial_responsibility_notice: "caseDetails.documentTitles.financialResponsibilityNotice",
    home_healthcare_agreement: "caseDetails.documentTitles.homeHealthcareAgreement",
    equipment_liability: "caseDetails.documentTitles.equipmentLiability",
    release_of_information: "caseDetails.documentTitles.releaseOfInformation",
  };

  const translationKey = keyMap[templateKey];
  const translated = t(translationKey);
  return translated.startsWith("caseDetails.documentTitles.") ? templateKey : translated;
}

function buildDraft(caseDetail: CaseDetail | null, workflow: DischargeWorkflow | null): WorkflowDraft {
  return {
    patient_name: workflow?.patient_name || caseDetail?.patient_name || "",
    patient_id_number: workflow?.patient_id_number || "",
    medical_record_number: workflow?.medical_record_number || caseDetail?.patient_mrn || "",
    room_number: workflow?.room_number || "",
    attending_physician: workflow?.attending_physician || caseDetail?.attending_physician || "",
    refusal_reason: workflow?.refusal_reason || caseDetail?.refusal_reason || "",
    discussion_summary: workflow?.discussion_summary || "",
    social_administrative_interventions: workflow?.social_administrative_interventions || "",
    forms_issued: workflow?.forms_issued || "",
    insurance_coverage_status: workflow?.insurance_coverage_status || "",
    discharge_decision_at: toDateTimeLocal(workflow?.discharge_decision_at),
  };
}

function compactPayload(draft: WorkflowDraft): Record<string, string> {
  const entries = Object.entries(draft)
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0);

  return Object.fromEntries(entries);
}

function describeMissingFields(fields: string[], t: (key: string) => string): string {
  if (fields.length === 0) {
    return "";
  }

  return fields
    .map((field) => t(`preview.field.${field}`))
    .join(", ");
}

function toValidationInput(draft: WorkflowDraft) {
  return {
    patientName: draft.patient_name,
    patientIdNumber: draft.patient_id_number,
    medicalRecordNumber: draft.medical_record_number,
    roomNumber: draft.room_number,
    attendingPhysicianName: draft.attending_physician,
    dischargeDecisionAt: draft.discharge_decision_at,
    refusalReason: draft.refusal_reason,
    discussionSummary: draft.discussion_summary,
  };
}

function mapValidationFields(fields: string[]): string[] {
  return fields.map((field) => VALIDATION_FIELD_MAP[field] || field);
}

function buildPolicyValidationFromDraft(draft: WorkflowDraft): WorkflowPolicyValidation {
  const validation = validateDischargeRefusalGeneration(toValidationInput(draft));
  const missing = new Set(mapValidationFields(validation.missing));

  const requirements: WorkflowPolicyRequirement[] = MIN_REQUIRED_VALIDATION_FIELDS.map((key) => ({
    key,
    label: key,
    value_present: !missing.has(key),
    required_for_current_action: true,
  }));

  return {
    required_fields: MIN_REQUIRED_VALIDATION_FIELDS,
    missing_fields: [...missing],
    can_generate: validation.valid,
    requirements,
    validated_at: new Date().toISOString(),
  };
}

function toTimeline(workflow: DischargeRefusalWorkflowContract) {
  const timestamps: Record<string, string | null> = {
    medical_discharge_decision: workflow.dischargeDecisionAt || null,
    initial_communication: workflow.initialCommunicationAt || workflow.refusalStartedAt || null,
    support_and_intervention: workflow.supportInterventionAt || workflow.socialServicesReferredAt || null,
    refusal_form: workflow.refusalFormGeneratedAt || null,
    official_notification: workflow.financialNoticeGeneratedAt || null,
    escalation: workflow.escalatedAt || null,
    closed: workflow.closedAt || null,
  };

  const stageOrder = [
    "medical_discharge_decision",
    "initial_communication",
    "support_and_intervention",
    "refusal_form",
    "official_notification",
    "escalation",
    "closed",
  ] as const;

  return stageOrder.map((stageKey) => {
    const status: "completed" | "current" | "upcoming" = timestamps[stageKey]
      ? "completed"
      : workflow.currentStage === stageKey
        ? "current"
        : "upcoming";

    return {
      key: stageKey,
      label: WORKFLOW_STAGE_LABELS[stageKey] || stageKey,
      timestamp: timestamps[stageKey],
      status,
    };
  });
}

function toWorkflowProgressSteps(workflow: DischargeWorkflow | null, locale: string, caseId: string): WorkflowProgressStep[] {
  if (!workflow) {
    return [];
  }

  const stageTimestamps: Partial<Record<string, string | null>> = {
    medical_discharge_decision: workflow.discharge_decision_at,
    initial_communication: workflow.initial_communication_at || workflow.refusal_started_at,
    support_and_intervention: workflow.support_and_intervention_at || workflow.social_services_referred_at,
    refusal_form: workflow.refusal_form_generated_at,
    official_notification: workflow.financial_notice_generated_at,
    escalation: workflow.escalated_at || workflow.escalation_due_at,
    closed: workflow.status === "closed" ? workflow.escalated_at || workflow.financial_notice_generated_at : null,
  };

  return workflow.timeline.map((item) => {
    const hrefFactory = WORKFLOW_STAGE_ROUTES[item.key];
    const timestamp = stageTimestamps[item.key] || item.timestamp;
    const isWarning = item.key === "escalation" && workflow.escalation_required && item.status !== "completed";

    return {
      id: item.key,
      titleAr: WORKFLOW_STAGE_LABELS[item.key] || item.label,
      titleEn: WORKFLOW_STAGE_LABELS_EN[item.key] || item.key,
      subtitleAr:
        item.status === "completed" && timestamp
          ? new Date(timestamp).toLocaleString("ar-SA")
          : isWarning
            ? "يتطلب تصعيداً"
            : item.status === "current"
              ? "قيد التنفيذ"
              : undefined,
      subtitleEn:
        item.status === "completed" && timestamp
          ? new Date(timestamp).toLocaleString(locale)
          : isWarning
            ? "Escalation required"
            : item.status === "current"
              ? "In progress"
              : undefined,
      state: isWarning ? "warning" : item.status,
      clickable: Boolean(hrefFactory),
      href: hrefFactory?.(caseId),
    };
  });
}

function mapContractDocumentToUi(document: DischargeRefusalWorkflowContract["documents"][number]): WorkflowDocumentItem {
  return {
    id: document.id,
    template_key: document.templateKey,
    document_code: document.documentCode || null,
    title: document.titleEn,
    title_en: document.titleEn,
    title_ar: document.titleAr || null,
    file_name: document.fileName,
    generated_at: document.generatedAt,
    view_url: `/api/documents/${document.id}/preview`,
    download_url: `/api/documents/${document.id}/download`,
  };
}

function mapContractAuditToUi(auditTrail: DischargeRefusalWorkflowContract["auditTrail"]): AuditItem[] {
  return auditTrail.map((item) => ({
    id: item.id,
    action: item.actionLabel || item.actionName,
    details: item.notes || undefined,
    created_at: item.createdAt,
  }));
}

function mapContractWorkflowToUi(workflow: DischargeRefusalWorkflowContract): DischargeWorkflow {
  const policyValidation = buildPolicyValidationFromDraft({
    patient_name: workflow.patientName || "",
    patient_id_number: workflow.patientIdNumber || "",
    medical_record_number: workflow.medicalRecordNumber || "",
    room_number: workflow.roomNumber || "",
    attending_physician: workflow.attendingPhysicianName || "",
    refusal_reason: workflow.refusalReason || "",
    discussion_summary: workflow.discussionSummary || "",
    social_administrative_interventions: workflow.supportProvided || "",
    forms_issued: workflow.documents.map((item) => item.titleEn).join("; "),
    insurance_coverage_status: workflow.insuranceCoverageStatus || "",
    discharge_decision_at: toDateTimeLocal(workflow.dischargeDecisionAt),
  });

  return {
    id: workflow.id,
    case_id: workflow.caseId,
    workflow_type: workflow.workflowType,
    status: workflow.status,
    current_stage: workflow.currentStage,
    current_stage_label: WORKFLOW_STAGE_LABELS[workflow.currentStage] || workflow.currentStage,
    escalation_required: workflow.escalationRequired,
    discharge_decision_at: workflow.dischargeDecisionAt || null,
    refusal_started_at: workflow.refusalStartedAt || null,
    initial_communication_at: workflow.initialCommunicationAt || null,
    support_and_intervention_at: workflow.supportInterventionAt || null,
    social_services_referred_at: workflow.socialServicesReferredAt || null,
    refusal_form_generated_at: workflow.refusalFormGeneratedAt || null,
    financial_notice_generated_at: workflow.financialNoticeGeneratedAt || null,
    escalation_due_at: workflow.escalationDueAt || null,
    escalated_at: workflow.escalatedAt || null,
    patient_name: workflow.patientName || null,
    patient_id_number: workflow.patientIdNumber || null,
    medical_record_number: workflow.medicalRecordNumber || null,
    room_number: workflow.roomNumber || null,
    attending_physician: workflow.attendingPhysicianName || null,
    refusal_reason: workflow.refusalReason || null,
    discussion_summary: workflow.discussionSummary || null,
    social_administrative_interventions: workflow.supportProvided || null,
    forms_issued: workflow.documents.map((item) => item.titleEn).join("; ") || null,
    insurance_coverage_status: workflow.insuranceCoverageStatus || null,
    responsible_department: workflow.socialServicesContacted ? "Patient Affairs / Social Services" : "Attending Physician",
    responsible_person: workflow.attendingPhysicianName || null,
    next_action: workflow.status === "escalation_required" ? "Escalate to Legal & Compliance" : null,
    policy_validation: policyValidation,
    timeline: toTimeline(workflow),
    documents: workflow.documents.map(mapContractDocumentToUi),
  };
}

function toRefusalTemplatePayload(draft: WorkflowDraft): DischargeRefusalTemplatePayload {
  return {
    patientName: draft.patient_name,
    patientIdNumber: draft.patient_id_number,
    medicalRecordNumber: draft.medical_record_number,
    roomNumber: draft.room_number,
    attendingPhysicianName: draft.attending_physician,
    dischargeDecisionAt: draft.discharge_decision_at,
    discussionSummary: draft.discussion_summary,
    refusalReason: draft.refusal_reason,
    socialServicesSummary: draft.social_administrative_interventions,
  };
}

function toFinancialNoticePayload(draft: WorkflowDraft): FinancialResponsibilityNoticePayload {
  return {
    documentDate: new Date().toISOString(),
    referenceNumber: `IMC-NOT-${Date.now()}`,
    patientOrGuardianName: draft.patient_name,
    patientName: draft.patient_name,
    patientIdNumber: draft.patient_id_number,
    medicalRecordNumber: draft.medical_record_number,
    roomNumber: draft.room_number,
    dischargeDecisionAt: draft.discharge_decision_at,
    attendingPhysicianName: draft.attending_physician,
    refusalReason: draft.refusal_reason,
    discussionSummary: draft.discussion_summary,
  };
}

export default function CaseDetailsPage() {
  const params = useParams<{ id: string }>();
  const caseId = params.id;
  const router = useRouter();
  const { t, locale, lang, isRtl } = useI18n();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [workflow, setWorkflow] = useState<DischargeWorkflow | null>(null);

  const [draft, setDraft] = useState<WorkflowDraft>(buildDraft(null, null));

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<WorkflowActionKey | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [savingRefusalReason, setSavingRefusalReason] = useState(false);

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [preview, setPreview] = useState<WorkflowPreviewResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [workflowBackendUnavailable, setWorkflowBackendUnavailable] = useState(false);

  const isBackendUnavailableError = useMemo(() => {
    if (!error) {
      return false;
    }

    const normalized = error.toLowerCase();
    const has503 = normalized.includes("503");
    const hasKnownMessage =
      normalized.includes("خدمة الواجهة الخلفية غير متاحة حالياً") ||
      normalized.includes("temporarily unavailable") ||
      normalized.includes("backend workflow service is temporarily unavailable");

    return has503 && hasKnownMessage;
  }, [error]);

  useEffect(() => {
    if (isBackendUnavailableError) {
      setWorkflowBackendUnavailable(true);
    }
  }, [isBackendUnavailableError]);

  const workflowProgressSteps = useMemo(
    () => toWorkflowProgressSteps(workflow, locale, caseId),
    [workflow, locale, caseId]
  );

  const metadataWorkflowProgress = useMemo(
    () =>
      buildMetadataWorkflowProgress({
        caseId,
        status: caseDetail?.status,
        patient_name: caseDetail?.patient_name,
        signer_name: caseDetail?.signer_name,
        signer_role: caseDetail?.signer_role,
        signed_at: caseDetail?.signed_at,
        pdf_file: caseDetail?.pdf_file,
        refusal_reason: caseDetail?.refusal_reason,
        workflow_stages: caseDetail?.workflow_stages,
        metadata: caseDetail?.metadata,
        workflow,
        clickable: true,
      }),
    [caseDetail, workflow, caseId]
  );

  const visibleWorkflowProgressSteps =
    workflowProgressSteps.length > 0 ? workflowProgressSteps : metadataWorkflowProgress.steps;

  const visibleWorkflowCurrentStepId =
    workflowProgressSteps.length > 0
      ? workflow?.current_stage
      : metadataWorkflowProgress.currentStepId;

  const handleWorkflowProgressStepClick = useCallback(
    (step: WorkflowProgressStep & { href?: string }) => {
      if (step.href) {
        router.push(step.href);
      }
    },
    [router]
  );

  const loadCaseData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const detail = await dischargeCasesService.getCaseDetail(caseId);
      setCaseDetail(detail);

      try {
        const workflowContract = await dischargeRefusalWorkflowService.getByCaseId(caseId);
        const workflowData = mapContractWorkflowToUi(workflowContract);
        setAuditItems(mapContractAuditToUi(workflowContract.auditTrail));
        setWorkflow(workflowData);
        setDraft(buildDraft(detail, workflowData));
        setWorkflowBackendUnavailable(false);
      } catch {
        // Keep Case Details usable even when upstream workflow endpoints are unavailable.
        setAuditItems([]);
        setWorkflow(null);
        setDraft(buildDraft(detail, null));
        setWorkflowBackendUnavailable(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedLoad");
      setError(message);

      if (isAuthenticationError(err)) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [caseId, router, t]);

  useEffect(() => {
    if (!caseId) {
      return;
    }
    void loadCaseData();
  }, [caseId, loadCaseData]);

  const caseTitle = useMemo(() => {
    if (caseDetail?.patient_name) {
      return t("caseDetails.caseTitleWithName", { name: caseDetail.patient_name });
    }
    return t("caseDetails.caseTitle");
  }, [caseDetail?.patient_name, t]);

  const actionLabelMap: Record<WorkflowActionKey, string> = {
    record_discharge_decision: t("workflow.action.recordDischargeDecision"),
    start_refusal_workflow: t("workflow.action.startRefusalWorkflow"),
    mark_patient_counseled: t("workflow.action.markPatientCounseled"),
    refer_social_services: t("workflow.action.referSocialServices"),
    escalate_legal_compliance: t("workflow.action.escalate"),
  };

  async function runWorkflowAction(action: WorkflowActionKey) {
    setProcessingAction(action);
    setError("");
    setInfoMessage("");

    try {
      const payload = compactPayload(draft);
      if (action === "record_discharge_decision") {
        if (!payload.discharge_decision_at) {
          payload.discharge_decision_at = new Date().toISOString();
        }
        if (!payload.attending_physician && caseDetail?.attending_physician) {
          payload.attending_physician = caseDetail.attending_physician;
        }
      }
      const actor: Record<string, unknown> = {};
      let response: WorkflowMutationResponse;

      if (action === "record_discharge_decision") {
        response = await dischargeRefusalWorkflowService.recordDischargeDecision(caseId, payload, actor);
      } else if (action === "start_refusal_workflow") {
        response = await dischargeRefusalWorkflowService.startWorkflow(caseId, payload, actor);
      } else if (action === "mark_patient_counseled") {
        response = await dischargeRefusalWorkflowService.recordInitialCommunication(caseId, payload, actor);
      } else if (action === "refer_social_services") {
        response = await dischargeRefusalWorkflowService.referSocialServices(caseId, payload, actor);
      } else {
        response = await dischargeRefusalWorkflowService.escalate(caseId, payload, actor);
      }

      const nextWorkflow = mapContractWorkflowToUi(response.workflow);
      setWorkflow(nextWorkflow);
      setAuditItems(mapContractAuditToUi(response.workflow.auditTrail));
      setDraft(buildDraft(caseDetail, nextWorkflow));
      setInfoMessage(t("caseDetails.actionCompleted", { action: actionLabelMap[action] }));
      if (action === "escalate_legal_compliance") {
        setActiveTab("audit");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.workflowActionFailed");
      setError(message);
      if (isAuthenticationError(err)) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setProcessingAction(null);
    }
  }

  async function openPreview(templateKey: "discharge_refusal_form" | "financial_responsibility_notice") {
    setPreviewLoading(true);
    setError("");

    try {
      const validation = validateDischargeRefusalGeneration(toValidationInput(draft));
      const missingFields = mapValidationFields(validation.missing);
      const policyValidation = buildPolicyValidationFromDraft(draft);

      if (!validation.valid) {
        const missing = describeMissingFields(missingFields, t);
        setError(t("caseDetails.validationBlocked", { fields: missing || t("common.na") }));
        setWorkflow((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            policy_validation: policyValidation,
          };
        });
        return;
      }

      const result: WorkflowPreviewResponse =
        templateKey === "discharge_refusal_form"
          ? {
            template_key: "discharge_refusal_form",
            title: documentTemplateTitle("discharge_refusal_form", t),
            document_code: dischargeRefusalFormTemplate.documentCode,
            missing_fields: missingFields,
            can_generate: true,
            policy_validation: policyValidation,
            html_content: dischargeRefusalFormTemplate.renderHtml(toRefusalTemplatePayload(draft), { locale: lang === "ar" ? "ar" : "en" }),
            context: compactPayload(draft),
          }
          : {
            template_key: "financial_responsibility_notice",
            title: documentTemplateTitle("financial_responsibility_notice", t),
            document_code: financialResponsibilityNoticeTemplate.documentCode,
            missing_fields: missingFields,
            can_generate: true,
            policy_validation: policyValidation,
            html_content: financialResponsibilityNoticeTemplate.renderHtml(toFinancialNoticePayload(draft), { locale: lang === "ar" ? "ar" : "en" }),
            context: compactPayload(draft),
          };

      setPreview(result);
      setPreviewOpen(true);
      setWorkflow((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          policy_validation: result.policy_validation,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedBuildPreview");
      setError(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleGenerateFromPreview() {
    if (!preview) {
      return;
    }

    setGeneratingDocument(true);
    setError("");

    try {
      const payload = {
        ...compactPayload(draft),
        locale: lang === "ar" ? "ar" : "en",
      };
      const actor: Record<string, unknown> = {};
      const response =
        preview.template_key === "discharge_refusal_form"
          ? await dischargeRefusalWorkflowService.generateRefusalForm(caseId, payload, actor)
          : await dischargeRefusalWorkflowService.generateFinancialNotice(caseId, payload, actor);

      const nextWorkflow = mapContractWorkflowToUi(response.workflow);
      setWorkflow(nextWorkflow);
      setAuditItems(mapContractAuditToUi(response.workflow.auditTrail));
      setDraft(buildDraft(caseDetail, nextWorkflow));
      setInfoMessage(
        t("caseDetails.generatedSuccess", {
          title:
            (lang === "ar"
              ? response.generatedDocument?.titleAr || null
              : response.generatedDocument?.titleEn || null) || preview.title,
        })
      );
      setPreviewOpen(false);
      setPreview(null);
      setActiveTab("archive");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedGenerateDocument");
      setError(message);
    } finally {
      setGeneratingDocument(false);
    }
  }

  async function handleGenerateEvidenceBundle() {
    setError("");

    try {
      const response = await dischargeCasesService.generateEvidenceBundle(caseId);
      setInfoMessage(t("caseDetails.bundleGenerated", { file: response.bundle_file }));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedGenerateBundle");
      setError(message);
    }
  }

  async function handleSaveRefusalReason() {
    if (!caseDetail || !draft.refusal_reason.trim()) {
      return;
    }

    setSavingRefusalReason(true);
    setError("");

    try {
      const metadata = cloneMetadataRecord(caseDetail.metadata);
      const workflowMetadata = asRecord(metadata.workflow) || {};
      metadata.refusal_reason = draft.refusal_reason.trim();
      metadata.workflow = {
        ...workflowMetadata,
        refusal_reason: draft.refusal_reason.trim(),
      };

      await apiFetch(`/api/cases/${encodeURIComponent(caseId)}`, {
        method: "PATCH",
        body: JSON.stringify({ metadata }),
      });

      setCaseDetail((previous) =>
        previous
          ? {
            ...previous,
            metadata,
            refusal_reason: draft.refusal_reason.trim(),
          }
          : previous
      );
      setWorkflow((previous) =>
        previous
          ? {
            ...previous,
            refusal_reason: draft.refusal_reason.trim(),
          }
          : previous
      );
      setInfoMessage(t("caseDetails.overview.refusalReasonSaved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.overview.refusalReasonSaveFailed");
      setError(message);
    } finally {
      setSavingRefusalReason(false);
    }
  }

  async function handleOpenRefusalPdf() {
    if (!caseDetail?.pdf_file) {
      return;
    }

    setError("");
    try {
      await dischargeCasesService.openRefusalPdf(caseDetail.pdf_file);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedOpenPdf");
      setError(message);
      if (isAuthenticationError(err)) {
        clearToken();
        router.push("/login");
      }
    }
  }

  async function handleDownloadGeneratedDocument() {
    if (!workflow?.documents || workflow.documents.length === 0) {
      setInfoMessage(t("documents.none"));
      return;
    }

    setError("");
    setInfoMessage("");

    const latestDocument = [...workflow.documents].sort((left, right) => {
      const leftTime = new Date(left.generated_at).getTime();
      const rightTime = new Date(right.generated_at).getTime();
      return rightTime - leftTime;
    })[0];

    try {
      await downloadProtectedDocument(
        latestDocument.download_url,
        latestDocument.file_name || `${latestDocument.template_key}.html`
      );
      setInfoMessage(
        t("caseDetails.actionCompleted", { action: t("workflow.action.downloadGenerated") })
      );
      setActiveTab("archive");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("documents.failedDownload");
      setError(message);
      if (isAuthenticationError(err)) {
        clearToken();
        router.push("/login");
      }
    }
  }

  const hasDecision = Boolean(workflow?.discharge_decision_at);
  const hasRefusalStarted = Boolean(workflow?.refusal_started_at);
  const hasInitialCommunication = Boolean(workflow?.initial_communication_at);
  const hasSupportIntervention = Boolean(workflow?.support_and_intervention_at);
  const hasRefusalForm = Boolean(workflow?.refusal_form_generated_at);
  const hasOfficialNotice = Boolean(workflow?.financial_notice_generated_at);

  const canRecordDecision = processingAction === null;
  const canStartRefusal = hasDecision && !hasRefusalStarted && processingAction === null;
  const canMarkCounseled = hasRefusalStarted && !hasInitialCommunication && processingAction === null;
  const canReferSocialServices = hasInitialCommunication && !hasSupportIntervention && processingAction === null;
  const canGenerateRefusalForm = hasSupportIntervention && !hasRefusalForm && !previewLoading;
  const canGenerateFinancialNotice = hasRefusalForm && !hasOfficialNotice && !previewLoading;
  const canEscalate = Boolean(workflow?.escalation_required && hasOfficialNotice && processingAction === null);

  const hasGeneratedDocuments = (workflow?.documents?.length || 0) > 0;
  const workflowActionsEnabled = !workflowBackendUnavailable;
  const consentDocuments = (workflow?.documents || []).filter((item) =>
    item.template_key.toLowerCase().includes("consent") || item.title.toLowerCase().includes("consent")
  );
  const agreementDocuments = (workflow?.documents || []).filter((item) =>
    item.template_key.toLowerCase().includes("agreement") || item.title.toLowerCase().includes("agreement")
  );
  const roiDocuments = (workflow?.documents || []).filter((item) =>
    item.template_key.toLowerCase().includes("roi") || item.title.toLowerCase().includes("release")
  );

  const roiStatus =
    caseDetail?.status === "ESCALATED"
      ? t("caseDetails.roi.pendingLegalReview")
      : t("caseDetails.roi.noOpenEscalation");

  const availableTemplateKeys = new Set((workflow?.documents || []).map((item) => item.template_key));

  const isGenerated = (key: DocumentTemplateKey) => {
    if (key === "home_healthcare_agreement") {
      return availableTemplateKeys.has(key) || Boolean(caseDetail?.pdf_file);
    }
    if (key === "informed_consent") {
      return Boolean(caseDetail?.signed_at);
    }
    return availableTemplateKeys.has(key);
  };

  const refusalReasonBaseValue = workflow?.refusal_reason || caseDetail?.refusal_reason || "";
  const refusalReasonOptions = useMemo(() => {
    const options = refusalReasonOptionsForStage(workflow?.current_stage);
    if (!draft.refusal_reason || options.some((option) => option.value === draft.refusal_reason)) {
      return options;
    }

    return [
      {
        value: draft.refusal_reason,
        stages: [workflow?.current_stage || "medical_discharge_decision"],
        labelKey: "",
      },
      ...options,
    ];
  }, [draft.refusal_reason, workflow?.current_stage]);
  const refusalReasonDirty = draft.refusal_reason !== refusalReasonBaseValue;
  const refusalReasonGuidance = t(refusalReasonGuidanceKey(workflow?.current_stage));

  const headerActions = [
    {
      key: "back",
      order: 0,
      visible: true,
      element: (
        <Link
          key="back"
          href="/cases"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.backToCases")}
        </Link>
      ),
    },
    {
      key: "record-decision",
      order: 10,
      visible: !hasDecision,
      element: (
        <button
          key="record-decision"
          type="button"
          onClick={() => void runWorkflowAction("record_discharge_decision")}
          disabled={!canRecordDecision || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <Stethoscope className="h-4 w-4" />
          {t("workflow.action.recordDischargeDecision")}
        </button>
      ),
    },
    {
      key: "start-refusal",
      order: 20,
      visible: !hasRefusalStarted,
      element: (
        <button
          key="start-refusal"
          type="button"
          onClick={() => void runWorkflowAction("start_refusal_workflow")}
          disabled={!canStartRefusal || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <PlayCircle className="h-4 w-4" />
          {t("workflow.action.startRefusalWorkflow")}
        </button>
      ),
    },
    {
      key: "mark-counseled",
      order: 30,
      visible: hasRefusalStarted && !hasInitialCommunication,
      element: (
        <button
          key="mark-counseled"
          type="button"
          onClick={() => void runWorkflowAction("mark_patient_counseled")}
          disabled={!canMarkCounseled || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <MessageSquareHeart className="h-4 w-4" />
          {t("workflow.action.markPatientCounseled")}
        </button>
      ),
    },
    {
      key: "social-services",
      order: 40,
      visible: hasInitialCommunication && !hasSupportIntervention,
      element: (
        <button
          key="social-services"
          type="button"
          onClick={() => void runWorkflowAction("refer_social_services")}
          disabled={!canReferSocialServices || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <HandHelping className="h-4 w-4" />
          {t("workflow.action.referSocialServices")}
        </button>
      ),
    },
    {
      key: "homecare-agreement",
      order: 45,
      visible: true,
      element: (
        <Link
          key="homecare-agreement"
          href={`/cases/${caseId}/home-healthcare-agreement`}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          <FileText className="h-4 w-4" />
          {t("workflow.action.homeHealthcareAgreement")}
        </Link>
      ),
    },
    {
      key: "generate-refusal-form",
      order: 50,
      visible: hasSupportIntervention && !hasRefusalForm,
      element: (
        <button
          key="generate-refusal-form"
          type="button"
          onClick={() => void openPreview("discharge_refusal_form")}
          disabled={!canGenerateRefusalForm || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <FileBadge2 className="h-4 w-4" />
          {t("workflow.action.generateRefusalForm")}
        </button>
      ),
    },
    {
      key: "generate-financial-notice",
      order: 60,
      visible: hasRefusalForm && !hasOfficialNotice,
      element: (
        <button
          key="generate-financial-notice"
          type="button"
          onClick={() => void openPreview("financial_responsibility_notice")}
          disabled={!canGenerateFinancialNotice || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          {t("workflow.action.generateFinancialNotice")}
        </button>
      ),
    },
    {
      key: "send-email",
      order: 70,
      visible: hasRefusalForm || hasOfficialNotice || Boolean(workflow?.escalation_required),
      element: (
        <button
          key="send-email"
          type="button"
          onClick={() => {
            void handleSendWorkflowEmailNotification();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100"
        >
          <FileText className="h-4 w-4" />
          {t("workflow.action.sendEmailNotice")}
        </button>
      ),
    },
    {
      key: "escalate",
      order: 80,
      visible: hasOfficialNotice,
      element: (
        <button
          key="escalate"
          type="button"
          onClick={() => void runWorkflowAction("escalate_legal_compliance")}
          disabled={!canEscalate || !workflowActionsEnabled}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          <Gavel className="h-4 w-4" />
          {t("workflow.action.escalate")}
        </button>
      ),
    },
    {
      key: "view-generated",
      order: 90,
      visible: hasGeneratedDocuments,
      element: (
        <button
          key="view-generated"
          type="button"
          onClick={() => {
            setActiveTab("archive");
            setInfoMessage(t("caseDetails.useCardsView"));
          }}
          disabled={!hasGeneratedDocuments}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
        >
          <BookOpenCheck className="h-4 w-4" />
          {t("workflow.action.viewGenerated")}
        </button>
      ),
    },
    {
      key: "download-generated",
      order: 100,
      visible: hasGeneratedDocuments,
      element: (
        <button
          key="download-generated"
          type="button"
          onClick={() => {
            void handleDownloadGeneratedDocument();
          }}
          disabled={!hasGeneratedDocuments}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {t("workflow.action.downloadGenerated")}
        </button>
      ),
    },
  ]
    .filter((item) => item.visible)
    .sort((left, right) => left.order - right.order)
    .map((item) => item.element);

  const handleGenerateDocument = (key: DocumentTemplateKey) => {
    if (key === "discharge_refusal_form") {
      void openPreview("discharge_refusal_form");
      return;
    }

    if (key === "financial_responsibility_notice") {
      void openPreview("financial_responsibility_notice");
      return;
    }

    if (key === "home_healthcare_agreement") {
      router.push(`/cases/${caseId}/home-healthcare-agreement`);
      return;
    }

    if (key === "informed_consent") {
      router.push(`/cases/${caseId}/informed-consent`);
      return;
    }

    setInfoMessage(t("caseDetails.messages.templateComingSoon", { template: documentTemplateTitle(key, t) }));
  };

  const handleSendForSignature = (path?: string) => {
    if (!path) {
      setInfoMessage(t("caseDetails.messages.noSignaturePath"));
      return;
    }
    router.push(`/cases/${caseId}/${path}`);
  };

  const handleOpenTabletMobileSignature = (path = "refusal-form") => {
    const signaturePathByTemplate: Record<string, string> = {
      discharge_refusal_form: "refusal-form",
      informed_consent: "informed-consent",
      financial_responsibility_notice: "financial-notice",
      home_healthcare_agreement: "home-healthcare-agreement",
    };

    const latestDoc = [...(workflow?.documents || [])].sort((left, right) => {
      const leftTime = new Date(left.generated_at).getTime();
      const rightTime = new Date(right.generated_at).getTime();
      return rightTime - leftTime;
    })[0];

    const resolvedPath = latestDoc
      ? signaturePathByTemplate[latestDoc.template_key] || path
      : path;

    router.push(`/cases/${caseId}/${resolvedPath}?method=TABLET_SIGNATURE&mobile_link=1`);
  };

  const handleVerifySignature = () => {
    if (caseDetail?.signed_at) {
      setInfoMessage(t("caseDetails.messages.signatureVerifiedAt", { date: toReadable(caseDetail.signed_at, locale) }));
      return;
    }
    setInfoMessage(t("caseDetails.messages.noVerifiedSignature"));
  };

  const handleIssueFinalPdf = async () => {
    if (caseDetail?.pdf_file) {
      await handleOpenRefusalPdf();
      return;
    }
    setInfoMessage(t("caseDetails.messages.finalPdfAfterSignature"));
  };

  const handleArchiveDocument = async () => {
    await handleGenerateEvidenceBundle();
    setInfoMessage(t("caseDetails.messages.archiveCompleted"));
    setActiveTab("archive");
  };

  const handleSendWorkflowEmailNotification = async () => {
    const recipient = window.prompt(t("caseDetails.messages.emailPrompt"), "");
    if (!recipient || !recipient.trim()) {
      return;
    }

    const templateName = workflow?.escalation_required
      ? "legal_escalation_notice"
      : "discharge_refusal_follow_up";

    try {
      const response = await apiFetch<{ status: string }>("/api/emails/send-workflow-notification", {
        method: "POST",
        body: JSON.stringify({
          case_id: caseId,
          to: [recipient.trim()],
          template_name: templateName,
          include_latest_case_documents: true,
          template_vars: {
            case_id: caseId,
            patient_name: caseDetail?.patient_name || workflow?.patient_name || "",
          },
        }),
      });

      setInfoMessage(response.status === "sent" ? t("caseDetails.messages.emailSent") : t("caseDetails.messages.emailRecorded"));
    } catch (error) {
      setInfoMessage(error instanceof Error ? error.message : t("caseDetails.messages.emailFailed"));
    }
  };

  return (
    <AuthGuard>
      <AppShell
        title={caseTitle}
        subtitle={t("caseDetails.subtitle")}
        workflowCaseNav={{
          caseId,
          currentStage: workflow?.current_stage || null,
          escalationRequired: workflow?.escalation_required || false,
        }}
        actions={<>{headerActions}</>}
      >
        {error && !isBackendUnavailableError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {infoMessage ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {infoMessage}
          </div>
        ) : null}

        {workflow?.escalation_required ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              {t("caseDetails.escalationRequired")}
            </p>
            <p className="mt-1 text-xs text-rose-700">
              {t("caseDetails.escalationBody")}
            </p>
          </div>
        ) : null}

        {workflowBackendUnavailable || isBackendUnavailableError ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("caseDetails.messages.workflowServiceUnavailable")}
          </div>
        ) : null}

        {workflow?.policy_validation ? (
          <section className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">{t("caseDetails.policyChecklist.title")}</h2>
              <span
                className={
                  workflow.policy_validation.can_generate
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                }
              >
                {workflow.policy_validation.can_generate
                  ? t("caseDetails.policyChecklist.ready")
                  : t("caseDetails.policyChecklist.missing")}
              </span>
            </div>

            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {workflow.policy_validation.requirements.map((item) => (
                <li
                  key={item.key}
                  className={
                    item.value_present
                      ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                      : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                  }
                >
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-0.5">
                    {item.value_present
                      ? t("caseDetails.policyChecklist.completed")
                      : t("caseDetails.policyChecklist.pending")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("caseDetails.loadingWorkflow")}
          </div>
        ) : (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 p-2">
              <div className="flex flex-wrap gap-2">
                {([
                  ["overview", t("caseDetails.tab.overview")],
                  ["consents", t("caseDetails.tab.consents")],
                  ["agreements", t("caseDetails.tab.agreements")],
                  ["roi", t("caseDetails.tab.roi")],
                  ["archive", t("caseDetails.tab.archive")],
                  ["audit", t("caseDetails.tab.audit")],
                ] as Array<[TabKey, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={
                      key === activeTab
                        ? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                        : "rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "overview" ? (
              <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="min-w-0 rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.overview.workspaceTitle")}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t("caseDetails.overview.workspaceSubtitle")}</p>

                  {visibleWorkflowProgressSteps.length > 0 ? (
                    <div className="mt-5">
                      <h3 className="text-sm font-semibold text-slate-900">{t("caseDetails.overview.progressTitle")}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {workflowProgressSteps.length > 0
                          ? t("caseDetails.overview.progressCurrentDescription")
                          : t("caseDetails.overview.progressPlannedDescription")}
                      </p>
                      <WorkflowProgress
                        className="mt-3"
                        layout="wrapped"
                        steps={visibleWorkflowProgressSteps}
                        language={lang}
                        direction={isRtl ? "rtl" : "ltr"}
                        currentStepId={visibleWorkflowCurrentStepId}
                        onStepClick={handleWorkflowProgressStepClick}
                      />
                    </div>
                  ) : null}

                  <h3 className="mt-5 text-sm font-semibold text-slate-900">{t("caseDetails.overview.patientInfoTitle")}</h3>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.mrn")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.patient_mrn || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.patientName")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.patient_name || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.idIqama")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.patient_id_number || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.dateOfBirth")}</dt>
                      <dd className="font-medium text-slate-900">{toReadable(caseDetail?.date_of_birth, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("newCase.placeholders.gender")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.gender || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.mobileNumber")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.mobile_number || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.guardianName")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.guardian_name || t("common.na")}</dd>
                    </div>
                  </dl>

                  <h3 className="mt-5 text-sm font-semibold text-slate-900">{t("caseDetails.overview.additionalInfoTitle")}</h3>
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">{t("field.attendingPhysician")}</dt>
                      <dd className="font-medium text-slate-900">
                        {workflow?.attending_physician || caseDetail?.attending_physician || t("common.na")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.department")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.department || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("field.roomNumber")}</dt>
                      <dd className="font-medium text-slate-900">
                        {workflow?.room_number || caseDetail?.room_number || t("common.na")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.status")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.status || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.created")}</dt>
                      <dd className="font-medium text-slate-900">{toReadable(caseDetail?.created_at, locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.signer")}</dt>
                      <dd className="font-medium text-slate-900">
                        {caseDetail?.signer_name || t("common.na")} {caseDetail?.signer_role ? `(${caseDetail.signer_role})` : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.signedAt")}</dt>
                      <dd className="font-medium text-slate-900">{toReadable(caseDetail?.signed_at, locale)}</dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-900">{t("caseDetails.overview.caseSummaryTitle")}</h3>
                    <h3 className="text-sm font-medium text-slate-700">{t("caseDetails.overview.refusalReason")}</h3>
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-start">
                      <select
                        value={draft.refusal_reason}
                        onChange={(event) => {
                          setDraft((previous) => ({
                            ...previous,
                            refusal_reason: event.target.value,
                          }));
                        }}
                        disabled={savingRefusalReason}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 md:max-w-xl"
                      >
                        <option value="">{t("caseDetails.overview.selectRefusalReason")}</option>
                        {refusalReasonOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.labelKey ? t(option.labelKey) : option.value}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSaveRefusalReason();
                        }}
                        disabled={!draft.refusal_reason || !refusalReasonDirty || savingRefusalReason}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {savingRefusalReason ? t("common.submitting") : t("caseDetails.overview.saveRefusalReason")}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{refusalReasonGuidance}</p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h3 className="text-sm font-medium text-slate-700">{t("field.socialAdministrativeInterventions")}</h3>
                      <p className="mt-1 text-sm text-slate-700">{workflow?.social_administrative_interventions || t("common.na")}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h3 className="text-sm font-medium text-slate-700">{t("field.formsIssued")}</h3>
                      <p className="mt-1 text-sm text-slate-700">{workflow?.forms_issued || t("common.na")}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/cases/${caseId}/home-healthcare-agreement`}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <FileText className="h-4 w-4" />
                      {t("workflow.action.homeHealthcareAgreement")}
                    </Link>

                    {caseDetail?.pdf_file ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleOpenRefusalPdf();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="h-4 w-4" />
                        {t("workflow.action.openRefusalPdf")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleGenerateEvidenceBundle()}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FilePlus2 className="h-4 w-4" />
                      {t("workflow.action.generateBundle")}
                    </button>
                  </div>
                </div>

                <WorkflowTimelinePanel workflow={workflow} />
              </section>
            ) : null}

            {activeTab === "consents" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.consents.title")}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t("caseDetails.consents.subtitle")}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/cases/${caseId}/informed-consent`}
                      className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      {t("caseDetails.consents.openInformedConsent")}
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="text-slate-500">{t("caseDetails.consents.signerName")}</p>
                      <p className="font-medium text-slate-900">{caseDetail?.signer_name || t("common.na")}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="text-slate-500">{t("caseDetails.consents.signedAt")}</p>
                      <p className="font-medium text-slate-900">{toReadable(caseDetail?.signed_at, locale)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {consentDocuments.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        {t("caseDetails.consents.noDocuments")}
                      </div>
                    ) : (
                      <WorkflowDocumentList documents={consentDocuments} />
                    )}
                  </div>
                </div>

                <CaseWorkflowTree key={caseId} caseId={caseId} />
              </section>
            ) : null}

            {activeTab === "agreements" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.agreements.title")}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t("caseDetails.agreements.subtitle")}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/cases/${caseId}/home-healthcare-agreement`}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <FileText className="h-4 w-4" />
                      {t("workflow.action.homeHealthcareAgreement")}
                    </Link>
                  </div>

                  <div className="mt-4">
                    {agreementDocuments.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        {t("caseDetails.agreements.noDocuments")}
                      </div>
                    ) : (
                      <WorkflowDocumentList documents={agreementDocuments} />
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "roi" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.roi.title")}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t("caseDetails.roi.subtitle")}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="text-slate-500">{t("caseDetails.roi.statusLabel")}</p>
                      <p className="font-medium text-slate-900">{roiStatus}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="text-slate-500">{t("caseDetails.roi.responsibleDepartmentLabel")}</p>
                      <p className="font-medium text-slate-900">{t("caseDetails.roi.responsibleDepartmentValue")}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {roiDocuments.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        {t("caseDetails.roi.noDocuments")}
                      </div>
                    ) : (
                      <WorkflowDocumentList documents={roiDocuments} />
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "archive" ? (
              <section className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.archive.title")}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t("caseDetails.archive.subtitle")}</p>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left">{t("caseDetails.archive.document")}</th>
                          <th className="px-3 py-2 text-left">{t("caseDetails.archive.generation")}</th>
                          <th className="px-3 py-2 text-left">{t("caseDetails.archive.signature")}</th>
                          <th className="px-3 py-2 text-left">{t("caseDetails.archive.finalPdf")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ISSUANCE_DOCUMENTS.map((doc) => {
                          const generated = isGenerated(doc.key);
                          return (
                            <tr key={doc.key} className="border-t border-slate-100">
                              <td className="px-3 py-2 font-medium text-slate-900">{documentTemplateTitle(doc.key, t)}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={
                                    generated
                                      ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                                      : "rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700"
                                  }
                                >
                                  {generated
                                    ? t("caseDetails.archive.generated")
                                    : doc.supportedGeneration
                                      ? t("caseDetails.archive.readyToGenerate")
                                      : t("caseDetails.archive.planned")}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={
                                    doc.signaturePath
                                      ? "rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700"
                                      : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                  }
                                >
                                  {doc.signaturePath
                                    ? t("caseDetails.archive.signatureEnabled")
                                    : t("caseDetails.archive.notWired")}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={
                                    caseDetail?.pdf_file
                                      ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                                      : "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                                  }
                                >
                                  {caseDetail?.pdf_file ? t("caseDetails.archive.issued") : t("caseDetails.archive.pendingSignature")}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    <button
                      type="button"
                      onClick={() => handleGenerateDocument("discharge_refusal_form")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      <FilePlus2 className="h-4 w-4" />
                      {t("caseDetails.archive.generateDocument")}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendForSignature("refusal-form")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <MessageSquareHeart className="h-4 w-4" />
                      {t("caseDetails.archive.sendForSignature")}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenTabletMobileSignature()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-100"
                    >
                      <MessageSquareHeart className="h-4 w-4" />
                      {t("caseDetails.archive.tabletMobileLink")}
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifySignature}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      {t("caseDetails.archive.verifySignature")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleIssueFinalPdf();
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      <FileBadge2 className="h-4 w-4" />
                      {t("caseDetails.archive.issueFinalPdf")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        void handleArchiveDocument();
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
                    >
                      <Download className="h-4 w-4" />
                      {t("caseDetails.archive.archiveDocument")}
                    </button>
                  </div>
                </div>

                <WorkflowDocumentList documents={workflow?.documents || []} />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => void loadCaseData()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t("workflow.action.refreshDocuments")}
                  </button>
                </div>
              </section>
            ) : null}

            {activeTab === "audit" ? (
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.audit.title")}</h2>
                  <button
                    type="button"
                    onClick={() => void loadCaseData()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t("common.refresh")}
                  </button>
                </div>

                {auditItems.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    {t("caseDetails.audit.noRecords")}
                  </div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {auditItems.map((item) => (
                      <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="font-medium text-slate-900">{item.action}</p>
                        <p className="mt-1 text-slate-700">{item.details || t("common.na")}</p>
                        <p className="mt-1 text-xs text-slate-500">{toReadable(item.created_at, locale)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </div>
        )}
      </AppShell>

      <DocumentPreviewModal
        open={previewOpen}
        preview={preview}
        generating={generatingDocument}
        onClose={() => {
          setPreviewOpen(false);
          setPreview(null);
        }}
        onGenerate={() => {
          void handleGenerateFromPreview();
        }}
      />

      {previewLoading ? (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-lg">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("caseDetails.previewBuilding")}
        </div>
      ) : null}
    </AuthGuard>
  );
}
