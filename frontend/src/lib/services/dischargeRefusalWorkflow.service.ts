import { apiFetch } from "@/utils/api";
import type { CaseDocument } from "@/lib/types/documents";
import type {
  DischargeRefusalWorkflow,
  WorkflowMutationResponse,
} from "@/lib/types/discharge-refusal";

type BackendWorkflowDocument = {
  id: string;
  template_key: string;
  document_code?: string | null;
  title: string;
  file_name: string;
  generated_at?: string | null;
};

type BackendCaseDocumentResponse = {
  id?: string;
  documentId?: string;
  case_id?: string;
  caseId?: string;
  workflow_id?: string | null;
  workflowId?: string | null;
  template_key?: string;
  templateKey?: string;
  document_code?: string | null;
  documentCode?: string | null;
  title?: string;
  titleEn?: string;
  file_name?: string;
  fileName?: string;
  generated_at?: string | null;
  generatedAt?: string | null;
};

type BackendWorkflowResponse = {
  id: string;
  case_id: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  discharge_decision_at?: string | null;
  refusal_started_at?: string | null;
  initial_communication_at?: string | null;
  support_and_intervention_at?: string | null;
  social_services_referred_at?: string | null;
  refusal_form_generated_at?: string | null;
  financial_notice_generated_at?: string | null;
  escalation_due_at?: string | null;
  escalated_at?: string | null;
  patient_name?: string | null;
  patient_id_number?: string | null;
  medical_record_number?: string | null;
  room_number?: string | null;
  attending_physician?: string | null;
  discussion_summary?: string | null;
  refusal_reason?: string | null;
  social_administrative_interventions?: string | null;
  insurance_coverage_status?: string | null;
  escalation_required?: boolean;
  documents?: BackendWorkflowDocument[];
};

type BackendAuditLog = {
  id: string;
  action: string;
  details?: string | null;
  created_at?: string | null;
};

function normalizeStatus(input: string | undefined): DischargeRefusalWorkflow["status"] {
  switch ((input || "").toLowerCase()) {
    case "closed":
      return "closed";
    case "escalated":
      return "escalated";
    case "escalation_required":
      return "escalation_required";
    case "pending_notification":
      return "pending_notification";
    case "active":
    case "refusal_active":
      return "active";
    default:
      return "draft";
  }
}

function normalizeStage(input: string | undefined): DischargeRefusalWorkflow["currentStage"] {
  switch (input) {
    case "medical_discharge_decision":
    case "initial_communication":
    case "support_and_intervention":
    case "refusal_form":
    case "official_notification":
    case "escalation":
    case "closed":
      return input;
    default:
      return "medical_discharge_decision";
  }
}

function mapBackendDocument(document: BackendWorkflowDocument, caseId: string): CaseDocument {
  return {
    id: document.id,
    caseId,
    workflowId: null,
    documentType:
      document.template_key === "financial_responsibility_notice"
        ? "financial_responsibility_notice"
        : "discharge_refusal_form",
    documentCode: document.document_code ?? null,
    titleEn: document.title,
    titleAr: null,
    templateKey: document.template_key,
    version: "1.0",
    fileName: document.file_name,
    mimeType: "text/html",
    storagePath: null,
    previewHtml: null,
    payloadJson: {},
    status: "generated",
    generatedBy: "system",
    generatedAt: document.generated_at || new Date().toISOString(),
    signedBy: null,
    signedAt: null,
  };
}

function mapCaseDocumentResponse(document: BackendCaseDocumentResponse, caseId: string): CaseDocument {
  const id = document.id || document.documentId || "";
  const templateKey = document.template_key || document.templateKey || "discharge_refusal_form";
  const title = document.title || document.titleEn || templateKey;
  const fileName = document.file_name || document.fileName || `${templateKey}.html`;
  const generatedAt = document.generated_at || document.generatedAt || new Date().toISOString();

  return {
    id,
    caseId: document.case_id || document.caseId || caseId,
    workflowId: document.workflow_id || document.workflowId || null,
    documentType:
      templateKey === "financial_responsibility_notice"
        ? "financial_responsibility_notice"
        : "discharge_refusal_form",
    documentCode: document.document_code ?? document.documentCode ?? null,
    titleEn: title,
    titleAr: null,
    templateKey,
    version: "1.0",
    fileName,
    mimeType: "text/html",
    storagePath: null,
    previewHtml: null,
    payloadJson: {},
    status: "generated",
    generatedBy: "system",
    generatedAt,
    signedBy: null,
    signedAt: null,
  };
}

function mapToContract(
  workflow: BackendWorkflowResponse,
  auditLogs: BackendAuditLog[],
  caseDocuments: BackendCaseDocumentResponse[],
): DischargeRefusalWorkflow {
  const caseId = workflow.case_id;

  return {
    id: workflow.id,
    caseId,
    workflowType: "discharge_refusal",
    status: normalizeStatus(workflow.status),
    currentStage: normalizeStage(workflow.current_stage),

    patientName: workflow.patient_name || "",
    legalRepresentativeName: null,
    patientIdNumber: workflow.patient_id_number || "",
    patientIdType: null,
    medicalRecordNumber: workflow.medical_record_number || "",
    roomNumber: workflow.room_number || "",

    attendingPhysicianName: workflow.attending_physician || "",
    attendingPhysicianId: null,
    caseManagerName: null,

    dischargeDecisionAt: workflow.discharge_decision_at || null,
    refusalStartedAt: workflow.refusal_started_at || null,
    initialCommunicationAt: workflow.initial_communication_at || null,
    supportInterventionAt: workflow.support_and_intervention_at || null,
    socialServicesReferredAt: workflow.social_services_referred_at || null,
    refusalFormGeneratedAt: workflow.refusal_form_generated_at || null,
    financialNoticeGeneratedAt: workflow.financial_notice_generated_at || null,
    escalationDueAt: workflow.escalation_due_at || null,
    escalatedAt: workflow.escalated_at || null,
    closedAt: workflow.status === "closed" ? workflow.escalated_at || null : null,

    dischargeDecisionSummary: null,
    discussionSummary: workflow.discussion_summary || null,
    refusalReason: workflow.refusal_reason || null,
    supportProvided: workflow.social_administrative_interventions || null,
    insuranceCoverageStatus:
      (workflow.insurance_coverage_status as DischargeRefusalWorkflow["insuranceCoverageStatus"]) ||
      "unknown",
    guarantorName: null,

    refusalPersists: Boolean(workflow.refusal_started_at && !workflow.escalated_at),
    escalationRequired: Boolean(workflow.escalation_required),
    escalatedToLegal: Boolean(workflow.escalated_at),
    escalatedToCompliance: Boolean(workflow.escalated_at),

    patientAcknowledged: Boolean(workflow.refusal_form_generated_at),
    patientSignedAt: null,

    witness1Name: null,
    witness1Title: null,
    witness1SignedAt: null,
    witness2Name: null,
    witness2Title: null,
    witness2SignedAt: null,

    patientAffairsContacted: Boolean(workflow.initial_communication_at),
    socialServicesContacted: Boolean(workflow.social_services_referred_at),
    legalSensitiveCase: Boolean(workflow.escalated_at),

    documents:
      caseDocuments.length > 0
        ? caseDocuments
          .filter((document) => Boolean(document.id || document.documentId))
          .map((document) => mapCaseDocumentResponse(document, caseId))
        : (workflow.documents || []).map((document) => mapBackendDocument(document, caseId)),
    auditTrail: auditLogs.map((item) => ({
      id: item.id,
      caseId,
      workflowId: null,
      actionName: item.action,
      actionLabel: item.action,
      actionStatus: "success",
      actorName: "System",
      actorId: null,
      actorRole: null,
      notes: item.details || null,
      documentType: null,
      metadataJson: null,
      createdAt: item.created_at || new Date().toISOString(),
    })),

    createdBy: "system",
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function fetchWorkflowContract(caseId: string): Promise<DischargeRefusalWorkflow> {
  const [workflow, auditTrail, caseDocuments] = await Promise.all([
    apiFetch<BackendWorkflowResponse>(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow`),
    apiFetch<BackendAuditLog[]>(`/api/discharge/audit/${encodeURIComponent(caseId)}`).catch(() => []),
    apiFetch<BackendCaseDocumentResponse[]>(`/api/discharge/cases/${encodeURIComponent(caseId)}/documents`).catch(
      () => []
    ),
  ]);

  return mapToContract(workflow, auditTrail, caseDocuments);
}

export interface DischargeRefusalWorkflowService {
  getByCaseId(caseId: string): Promise<DischargeRefusalWorkflow>;
  startWorkflow(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  recordDischargeDecision(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  markRefusal(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  recordInitialCommunication(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  referSocialServices(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  generateRefusalForm(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  generateFinancialNotice(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
  escalate(caseId: string, input: Record<string, unknown>, actor: Record<string, unknown>): Promise<WorkflowMutationResponse>;
}

async function postWorkflowAction(
  caseId: string,
  action: string,
  input: Record<string, unknown>
): Promise<WorkflowMutationResponse> {
  await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/workflow/actions`, {
    method: "POST",
    body: JSON.stringify({ action, payload: input }),
  });

  const workflow = await fetchWorkflowContract(caseId);
  return {
    workflow,
    generatedDocument: workflow.documents[0] ?? null,
  };
}

function withActorPayload(
  input: Record<string, unknown>,
  actor: Record<string, unknown>
): Record<string, unknown> {
  // Keep actor context available for future backend enrichment without changing method signatures.
  return {
    ...input,
    _actor: actor,
  };
}

class ApiDischargeRefusalWorkflowService implements DischargeRefusalWorkflowService {
  async getByCaseId(caseId: string): Promise<DischargeRefusalWorkflow> {
    return fetchWorkflowContract(caseId);
  }

  async startWorkflow(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "start_refusal_workflow", withActorPayload(input, actor));
  }

  async recordDischargeDecision(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "record_discharge_decision", withActorPayload(input, actor));
  }

  async markRefusal(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "mark_patient_counseled", withActorPayload(input, actor));
  }

  async recordInitialCommunication(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "mark_patient_counseled", withActorPayload(input, actor));
  }

  async referSocialServices(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "refer_social_services", withActorPayload(input, actor));
  }

  async generateRefusalForm(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "generate_refusal_form", withActorPayload(input, actor));
  }

  async generateFinancialNotice(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "generate_financial_notice", withActorPayload(input, actor));
  }

  async escalate(
    caseId: string,
    input: Record<string, unknown>,
    actor: Record<string, unknown>
  ): Promise<WorkflowMutationResponse> {
    return postWorkflowAction(caseId, "escalate_legal_compliance", withActorPayload(input, actor));
  }

  async listCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    const workflow = await fetchWorkflowContract(caseId);
    return workflow.documents;
  }

  async closeWorkflow(caseId: string, input: Record<string, unknown>): Promise<{ success: boolean; message: string; todo?: string }> {
    try {
      await postWorkflowAction(caseId, "escalate_legal_compliance", input);
      return { success: true, message: "Workflow progressed to escalation stage." };
    } catch {
      return {
        success: false,
        message: "Close workflow endpoint is not yet connected.",
        todo: "Wire backend close workflow transition.",
      };
    }
  }
}

export const dischargeRefusalWorkflowService: DischargeRefusalWorkflowService =
  new ApiDischargeRefusalWorkflowService();
