"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  Download,
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
import DocumentPreviewModal from "@/components/workflow/DocumentPreviewModal";
import CaseWorkflowTree from "@/components/cases/CaseWorkflowTree";
import WorkflowDataForm, { WorkflowDraft } from "@/components/workflow/WorkflowDataForm";
import WorkflowDocumentList from "@/components/workflow/WorkflowDocumentList";
import WorkflowTimelinePanel from "@/components/workflow/WorkflowTimelinePanel";
import { useI18n } from "@/i18n/I18nProvider";
import { clearToken } from "@/utils/api";
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

type AuditItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
};

type TabKey = "overview" | "workflow" | "documents" | "audit";

const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  medical_discharge_decision: "Medical Discharge Decision",
  initial_communication: "Initial Communication",
  support_and_intervention: "Support and Intervention",
  refusal_form: "Refusal Form",
  official_notification: "Official Notification",
  escalation: "Escalation",
  closed: "Closed",
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

function buildDraft(caseDetail: CaseDetail | null, workflow: DischargeWorkflow | null): WorkflowDraft {
  return {
    patient_name: workflow?.patient_name || caseDetail?.patient_name || "",
    patient_id_number: workflow?.patient_id_number || "",
    medical_record_number: workflow?.medical_record_number || caseDetail?.patient_mrn || "",
    room_number: workflow?.room_number || "",
    attending_physician: workflow?.attending_physician || "",
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

function mapContractDocumentToUi(document: DischargeRefusalWorkflowContract["documents"][number]): WorkflowDocumentItem {
  return {
    id: document.id,
    template_key: document.templateKey,
    document_code: document.documentCode || null,
    title: document.titleEn,
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
  const { t, locale } = useI18n();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [workflow, setWorkflow] = useState<DischargeWorkflow | null>(null);

  const [draft, setDraft] = useState<WorkflowDraft>(buildDraft(null, null));

  const [activeTab, setActiveTab] = useState<TabKey>("workflow");
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<WorkflowActionKey | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [preview, setPreview] = useState<WorkflowPreviewResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadCaseData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [detail, workflowContract] = await Promise.all([
        dischargeCasesService.getCaseDetail(caseId),
        dischargeRefusalWorkflowService.getByCaseId(caseId),
      ]);

      const workflowData = mapContractWorkflowToUi(workflowContract);

      setCaseDetail(detail);
      setAuditItems(mapContractAuditToUi(workflowContract.auditTrail));
      setWorkflow(workflowData);
      setDraft(buildDraft(detail, workflowData));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.failedLoad");
      setError(message);

      if (message.includes("401") || message.includes("Invalid")) {
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
        setActiveTab("workflow");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("caseDetails.workflowActionFailed");
      setError(message);
      if (message.includes("401") || message.includes("Invalid")) {
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
              title: dischargeRefusalFormTemplate.titleEn,
              document_code: dischargeRefusalFormTemplate.documentCode,
              missing_fields: missingFields,
              can_generate: true,
              policy_validation: policyValidation,
              html_content: dischargeRefusalFormTemplate.renderHtml(toRefusalTemplatePayload(draft)),
              context: compactPayload(draft),
            }
          : {
              template_key: "financial_responsibility_notice",
              title: financialResponsibilityNoticeTemplate.titleEn,
              document_code: financialResponsibilityNoticeTemplate.documentCode,
              missing_fields: missingFields,
              can_generate: true,
              policy_validation: policyValidation,
              html_content: financialResponsibilityNoticeTemplate.renderHtml(toFinancialNoticePayload(draft)),
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
      const payload = compactPayload(draft);
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
          title: response.generatedDocument?.titleEn || preview.title,
        })
      );
      setPreviewOpen(false);
      setPreview(null);
      setActiveTab("documents");
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
      if (message.includes("401") || message.includes("Invalid") || message.includes("Not authenticated")) {
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

  return (
    <AuthGuard>
      <AppShell
        title={caseTitle}
        subtitle={t("caseDetails.subtitle")}
        actions={
          <>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.backToCases")}
            </Link>

            <button
              type="button"
              onClick={() => void runWorkflowAction("record_discharge_decision")}
              disabled={!canRecordDecision}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
            >
              <Stethoscope className="h-4 w-4" />
              {t("workflow.action.recordDischargeDecision")}
            </button>

            {!hasRefusalStarted ? (
              <button
                type="button"
                onClick={() => void runWorkflowAction("start_refusal_workflow")}
                disabled={!canStartRefusal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
              >
                <PlayCircle className="h-4 w-4" />
                {t("workflow.action.startRefusalWorkflow")}
              </button>
            ) : null}

            {hasSupportIntervention && !hasRefusalForm ? (
              <button
                type="button"
                onClick={() => void openPreview("discharge_refusal_form")}
                disabled={!canGenerateRefusalForm}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <FileBadge2 className="h-4 w-4" />
                {t("workflow.action.generateRefusalForm")}
              </button>
            ) : null}

            {hasRefusalForm && !hasOfficialNotice ? (
              <button
                type="button"
                onClick={() => void openPreview("financial_responsibility_notice")}
                disabled={!canGenerateFinancialNotice}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                {t("workflow.action.generateFinancialNotice")}
              </button>
            ) : null}

            {hasRefusalStarted && !hasInitialCommunication ? (
              <button
                type="button"
                onClick={() => void runWorkflowAction("mark_patient_counseled")}
                disabled={!canMarkCounseled}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
              >
                <MessageSquareHeart className="h-4 w-4" />
                {t("workflow.action.markPatientCounseled")}
              </button>
            ) : null}

            {hasInitialCommunication && !hasSupportIntervention ? (
              <button
                type="button"
                onClick={() => void runWorkflowAction("refer_social_services")}
                disabled={!canReferSocialServices}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
              >
                <HandHelping className="h-4 w-4" />
                {t("workflow.action.referSocialServices")}
              </button>
            ) : null}

            {hasOfficialNotice ? (
              <button
                type="button"
                onClick={() => void runWorkflowAction("escalate_legal_compliance")}
                disabled={!canEscalate}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                <Gavel className="h-4 w-4" />
                {t("workflow.action.escalate")}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setActiveTab("documents");
                setInfoMessage(t("caseDetails.useCardsDownload"));
              }}
              disabled={!hasGeneratedDocuments}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {t("workflow.action.downloadGenerated")}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("documents");
                setInfoMessage(t("caseDetails.useCardsView"));
              }}
              disabled={!hasGeneratedDocuments}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <BookOpenCheck className="h-4 w-4" />
              {t("workflow.action.viewGenerated")}
            </button>
          </>
        }
      >
        {error ? (
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
                  ["workflow", t("caseDetails.tab.workflow")],
                  ["documents", t("caseDetails.tab.documents")],
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
                <div className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-base font-semibold text-slate-900">{t("caseDetails.overview.caseProfile")}</h2>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.mrn")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.patient_mrn || t("common.na")}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t("caseDetails.overview.patient")}</dt>
                      <dd className="font-medium text-slate-900">{caseDetail?.patient_name || t("common.na")}</dd>
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

                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-slate-700">{t("caseDetails.overview.refusalReason")}</h3>
                    <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      {caseDetail?.refusal_reason || t("caseDetails.overview.noRefusalReason")}
                    </p>
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

            {activeTab === "workflow" ? (
              <section className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                  <WorkflowDataForm data={draft} onChange={setDraft} />
                  <WorkflowTimelinePanel workflow={workflow} />
                </div>
                <CaseWorkflowTree key={caseId} caseId={caseId} />
              </section>
            ) : null}

            {activeTab === "documents" ? (
              <section className="space-y-4">
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
