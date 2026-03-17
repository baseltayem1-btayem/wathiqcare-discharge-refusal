import { CaseStatus, DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const WORKFLOW_TEMPLATE_KEYS = [
    "discharge_refusal_form",
    "financial_responsibility_notice",
    "informed_consent",
    "home_healthcare_agreement",
] as const;

const DEFAULT_METADATA_WORKFLOW_STAGES = [
    "medical_assessment",
    "legal_capacity_check",
    "authorized_signatory_identification",
    "discharge_plan_preparation",
    "forms_and_consent_presentation",
    "approval_or_refusal_path",
    "legal_escalation_if_needed",
    "final_verification",
    "execute_discharge_or_hold",
] as const;

type WorkflowStage =
    | "medical_discharge_decision"
    | "initial_communication"
    | "support_and_intervention"
    | "refusal_form"
    | "official_notification"
    | "escalation"
    | "closed";

type WorkflowStatus =
    | "draft"
    | "active"
    | "pending_notification"
    | "escalation_required"
    | "escalated"
    | "closed";

type WorkflowDocumentSummary = {
    id: string;
    template_key: string;
    document_code: string | null;
    title: string;
    file_name: string;
    generated_at: string;
    templateVersion: string;
    generationStatus: string;
    signedStatus: boolean;
    archivedStatus: boolean;
    createdBy: string | null;
    signedBy: string | null;
    signedAt: string | null;
};

type WorkflowAuditSummary = {
    id: string;
    action: string;
    details: string | null;
    created_at: string;
};

export type WorkflowSnapshot = {
    id: string;
    case_id: string;
    workflow_type: string;
    status: WorkflowStatus;
    current_stage: WorkflowStage;
    discharge_decision_at: string | null;
    refusal_started_at: string | null;
    initial_communication_at: string | null;
    support_and_intervention_at: string | null;
    social_services_referred_at: string | null;
    refusal_form_generated_at: string | null;
    financial_notice_generated_at: string | null;
    escalation_due_at: string | null;
    escalated_at: string | null;
    patient_name: string | null;
    patient_id_number: string | null;
    medical_record_number: string | null;
    room_number: string | null;
    attending_physician: string | null;
    discussion_summary: string | null;
    refusal_reason: string | null;
    social_administrative_interventions: string | null;
    insurance_coverage_status: string | null;
    escalation_required: boolean;
    lifecycle_status: string;
    case_status: string;
    documents: WorkflowDocumentSummary[];
    created_at: string;
    updated_at: string;
};

type WorkflowActionName =
    | "record_discharge_decision"
    | "start_refusal_workflow"
    | "mark_patient_counseled"
    | "refer_social_services"
    | "generate_refusal_form"
    | "generate_financial_notice"
    | "escalate_legal_compliance"
    | "close_workflow";

async function findCaseWithWorkflow(caseId: string) {
    return prisma.case.findUnique({
        where: { id: caseId },
    });
}

type AuthorizedCaseRecord = NonNullable<Awaited<ReturnType<typeof findCaseWithWorkflow>>>;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function readString(value: Record<string, unknown> | null, ...keys: string[]): string | null {
    if (!value) {
        return null;
    }

    for (const key of keys) {
        const entry = value[key];
        if (typeof entry === "string" && entry.trim()) {
            return entry.trim();
        }
    }

    return null;
}

function readBoolean(value: Record<string, unknown> | null, key: string): boolean | null {
    if (!value) {
        return null;
    }

    const entry = value[key];
    return typeof entry === "boolean" ? entry : null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function firstIsoString(...values: Array<Date | string | null | undefined>): string | null {
    for (const value of values) {
        const normalized = toIsoString(value);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

function nowIso(): string {
    return new Date().toISOString();
}

function asStage(value: string | null): WorkflowStage | null {
    switch (value) {
        case "medical_discharge_decision":
        case "initial_communication":
        case "support_and_intervention":
        case "refusal_form":
        case "official_notification":
        case "escalation":
        case "closed":
            return value;
        default:
            return null;
    }
}

function inferCurrentStage(workflow: Omit<WorkflowSnapshot, "documents">): WorkflowStage {
    if (workflow.lifecycle_status === "closed" || workflow.case_status.toLowerCase() === "closed") {
        return "closed";
    }

    return (
        (workflow.escalated_at ? "escalation" : null) ||
        (workflow.financial_notice_generated_at ? "escalation" : null) ||
        (workflow.refusal_form_generated_at ? "official_notification" : null) ||
        (workflow.support_and_intervention_at || workflow.social_services_referred_at ? "refusal_form" : null) ||
        (workflow.initial_communication_at ? "support_and_intervention" : null) ||
        (workflow.refusal_started_at ? "initial_communication" : null) ||
        "medical_discharge_decision"
    );
}

function inferStatus(workflow: Omit<WorkflowSnapshot, "documents">): WorkflowStatus {
    if (workflow.lifecycle_status === "closed" || workflow.case_status.toLowerCase() === "closed") {
        return "closed";
    }

    if (workflow.escalated_at) {
        return "escalated";
    }

    if (workflow.financial_notice_generated_at && workflow.escalation_required) {
        return "escalation_required";
    }

    if (workflow.refusal_form_generated_at) {
        return "pending_notification";
    }

    if (
        workflow.discharge_decision_at ||
        workflow.refusal_started_at ||
        workflow.initial_communication_at ||
        workflow.support_and_intervention_at
    ) {
        return "active";
    }

    return "draft";
}

function escapeHtml(value: string | null | undefined): string {
    const input = value ?? "";
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatDateOnly(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function formatTimeOnly(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(11, 16);
}

function buildRefusalFormHtml(workflow: WorkflowSnapshot, payload: Record<string, unknown>, generatedAt: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Medical Discharge Refusal Form</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }
    h1, h2, h3 { margin: 0; }
    .mt { margin-top: 14px; }
  </style>
</head>
<body>
  <p>Form Code: IMC-PAT-DIS-REF-01</p>
  <p>International Medical Center - Jeddah</p>
  <h1>Medical Discharge Refusal Form</h1>

  <div class="mt">Patient Name: ${escapeHtml(workflow.patient_name)}</div>
  <div>Medical Record Number (MRN): ${escapeHtml(workflow.medical_record_number)}</div>
  <div>National ID / Iqama Number: ${escapeHtml(workflow.patient_id_number)}</div>
  <div>Room Number: ${escapeHtml(workflow.room_number)}</div>
  <div>Date of Medical Discharge Decision: ${escapeHtml(formatDateOnly(workflow.discharge_decision_at))}</div>
  <div>Attending Physician: ${escapeHtml(workflow.attending_physician)}</div>

  <h2 class="mt">Declaration of Medical Discharge Refusal</h2>
  <p>I acknowledge that I have received and understood the medical discharge decision.</p>
  <p>${escapeHtml(workflow.discussion_summary || workflow.refusal_reason || "Patient elected to remain admitted after medical discharge decision.")}</p>

  <div class="mt">Patient / Legal Representative Name: ${escapeHtml(workflow.patient_name)}</div>
  <div>Relationship to Patient (if applicable): ${escapeHtml(typeof payload.relationship === "string" ? payload.relationship : "")}</div>
  <div>Signature: ${escapeHtml(typeof payload.patient_signature === "string" ? payload.patient_signature : "")}</div>
  <div>Date: ${escapeHtml(formatDateOnly(generatedAt))}</div>
  <div>Time: ${escapeHtml(formatTimeOnly(generatedAt))}</div>

  <h3 class="mt">Witnesses</h3>
  <div>Witness 1 Name: ${escapeHtml(typeof payload.witness_1_name === "string" ? payload.witness_1_name : "")}</div>
  <div>Witness 2 Name: ${escapeHtml(typeof payload.witness_2_name === "string" ? payload.witness_2_name : "")}</div>
</body>
</html>`;
}

function buildFinancialNoticeHtml(workflow: WorkflowSnapshot, payload: Record<string, unknown>, generatedAt: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Financial Responsibility Notice</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; margin: 20px; }
    h1 { margin: 0; }
  </style>
</head>
<body>
  <p>International Medical Center - Jeddah</p>
  <h1>Notification and Acknowledgment of Financial Responsibility</h1>

  <p>Date: ${escapeHtml(formatDateOnly(generatedAt))}</p>
  <p>To: ${escapeHtml(workflow.patient_name)}</p>
  <p>National ID Number: ${escapeHtml(workflow.patient_id_number)}</p>
  <p>Medical Record Number: ${escapeHtml(workflow.medical_record_number)}</p>
  <p>Room Number: ${escapeHtml(workflow.room_number)}</p>
  <p>Discharge decision date: ${escapeHtml(formatDateOnly(workflow.discharge_decision_at))}</p>
  <p>Insurance coverage status: ${escapeHtml(workflow.insurance_coverage_status || "unknown")}</p>
  <p>${escapeHtml(workflow.discussion_summary || workflow.refusal_reason || "Patient remained admitted after clearance for discharge.")}</p>

  <p>Representative Name: ${escapeHtml(typeof payload.representative_name === "string" ? payload.representative_name : "")}</p>
  <p>Representative Signature: ${escapeHtml(typeof payload.representative_signature === "string" ? payload.representative_signature : "")}</p>
</body>
</html>`;
}

function mapWorkflowDocument(document: {
    id: string;
    templateKey: string;
    documentCode: string | null;
    titleEn: string;
    fileName: string;
    generatedAt: Date;
    versionLabel: string;
    status: DocumentStatus;
    generatedBy?: { fullName: string } | null;
    signedBy?: { fullName: string } | null;
    signedAt: Date | null;
}): WorkflowDocumentSummary {
    return {
        id: document.id,
        template_key: document.templateKey,
        document_code: document.documentCode,
        title: document.titleEn,
        file_name: document.fileName,
        generated_at: document.generatedAt.toISOString(),
        templateVersion: document.versionLabel,
        generationStatus: document.status.toLowerCase(),
        signedStatus: Boolean(document.signedAt || document.status === DocumentStatus.SIGNED),
        archivedStatus: document.status === DocumentStatus.ARCHIVED,
        createdBy: document.generatedBy?.fullName ?? null,
        signedBy: document.signedBy?.fullName ?? null,
        signedAt: toIsoString(document.signedAt),
    };
}

async function getAuthorizedCase(auth: AuthContext, caseId: string): Promise<AuthorizedCaseRecord> {
    const caseRecord = await findCaseWithWorkflow(caseId);

    if (!caseRecord) {
        throw new ApiError(404, "Case not found");
    }

    if (caseRecord.tenantId !== auth.tenant_id) {
        throw new ApiError(403, "Tenant access denied");
    }

    return caseRecord;
}

async function listWorkflowDocumentsInternal(tenantId: string, caseId: string): Promise<WorkflowDocumentSummary[]> {
    const documents = await prisma.document.findMany({
        where: {
            tenantId,
            caseId,
            templateKey: { in: [...WORKFLOW_TEMPLATE_KEYS] },
        },
        include: {
            generatedBy: { select: { fullName: true } },
            signedBy: { select: { fullName: true } },
        },
        orderBy: { generatedAt: "desc" },
    });

    return documents.map((document) => mapWorkflowDocument(document));
}

function buildWorkflowState(caseRecord: AuthorizedCaseRecord): Omit<WorkflowSnapshot, "documents"> {
    const metadata = asRecord(caseRecord.metadata);
    const storedWorkflow = asRecord(metadata?.workflow);

    const baseWorkflow: Omit<WorkflowSnapshot, "documents"> = {
        id: readString(storedWorkflow, "id") || caseRecord.id,
        case_id: caseRecord.id,
        workflow_type: readString(storedWorkflow, "workflow_type") || caseRecord.workflowType || "discharge_refusal",
        status: "draft",
        current_stage: "medical_discharge_decision",
        discharge_decision_at:
            readString(storedWorkflow, "discharge_decision_at") || readString(metadata, "discharge_decision_at"),
        refusal_started_at:
            readString(storedWorkflow, "refusal_started_at") || readString(metadata, "refusal_started_at"),
        initial_communication_at:
            readString(storedWorkflow, "initial_communication_at") || readString(metadata, "initial_communication_at"),
        support_and_intervention_at:
            readString(storedWorkflow, "support_and_intervention_at") ||
            readString(metadata, "support_and_intervention_at"),
        social_services_referred_at:
            readString(storedWorkflow, "social_services_referred_at") ||
            readString(metadata, "social_services_referred_at"),
        refusal_form_generated_at:
            readString(storedWorkflow, "refusal_form_generated_at") ||
            readString(metadata, "refusal_form_generated_at"),
        financial_notice_generated_at:
            readString(storedWorkflow, "financial_notice_generated_at") ||
            readString(metadata, "financial_notice_generated_at"),
        escalation_due_at:
            readString(storedWorkflow, "escalation_due_at") || readString(metadata, "escalation_due_at"),
        escalated_at: readString(storedWorkflow, "escalated_at") || readString(metadata, "escalated_at"),
        patient_name:
            readString(storedWorkflow, "patient_name") || readString(metadata, "patient_name") || caseRecord.patientName,
        patient_id_number:
            readString(storedWorkflow, "patient_id_number") ||
            readString(metadata, "patient_id_number") ||
            caseRecord.patientIdNumber,
        medical_record_number:
            readString(storedWorkflow, "medical_record_number") ||
            readString(metadata, "medical_record_number") ||
            caseRecord.medicalRecordNo,
        room_number:
            readString(storedWorkflow, "room_number") || readString(metadata, "room_number") || caseRecord.roomNumber,
        attending_physician:
            readString(storedWorkflow, "attending_physician") || readString(metadata, "attending_physician"),
        discussion_summary:
            readString(storedWorkflow, "discussion_summary") || readString(metadata, "discussion_summary"),
        refusal_reason:
            readString(storedWorkflow, "refusal_reason") ||
            readString(metadata, "refusal_reason") ||
            null,
        social_administrative_interventions:
            readString(storedWorkflow, "social_administrative_interventions") ||
            readString(metadata, "social_administrative_interventions"),
        insurance_coverage_status:
            readString(storedWorkflow, "insurance_coverage_status") ||
            readString(metadata, "insurance_coverage_status") ||
            "unknown",
        escalation_required:
            readBoolean(storedWorkflow, "escalation_required") ??
            readBoolean(metadata, "escalation_required") ??
            false,
        lifecycle_status:
            readString(storedWorkflow, "lifecycle_status") ||
            (caseRecord.status === CaseStatus.CLOSED ? "closed" : "active"),
        case_status:
            readString(storedWorkflow, "case_status") ||
            readString(metadata, "case_status") ||
            caseRecord.status.toLowerCase(),
        created_at:
            readString(storedWorkflow, "created_at") ||
            caseRecord.createdAt.toISOString(),
        updated_at:
            readString(storedWorkflow, "updated_at") ||
            caseRecord.updatedAt.toISOString(),
    };

    baseWorkflow.current_stage =
        asStage(readString(storedWorkflow, "current_stage") || readString(metadata, "current_stage")) ||
        inferCurrentStage(baseWorkflow);
    baseWorkflow.status =
        (readString(storedWorkflow, "status") as WorkflowStatus | null) || inferStatus(baseWorkflow);

    if (!baseWorkflow.escalation_required && baseWorkflow.financial_notice_generated_at && !baseWorkflow.escalated_at) {
        baseWorkflow.escalation_required = true;
    }

    if (!baseWorkflow.discharge_decision_at) {
        const progressedBeyondDecision = Boolean(
            baseWorkflow.refusal_started_at ||
            baseWorkflow.initial_communication_at ||
            baseWorkflow.support_and_intervention_at ||
            baseWorkflow.refusal_form_generated_at ||
            baseWorkflow.financial_notice_generated_at ||
            baseWorkflow.escalated_at,
        );

        if (progressedBeyondDecision) {
            baseWorkflow.discharge_decision_at = firstIsoString(
                baseWorkflow.refusal_started_at,
                baseWorkflow.initial_communication_at,
                baseWorkflow.support_and_intervention_at,
                baseWorkflow.refusal_form_generated_at,
                baseWorkflow.financial_notice_generated_at,
                baseWorkflow.escalated_at,
            );
        }
    }

    return baseWorkflow;
}

function buildMetadata(baseMetadata: Record<string, unknown> | null, workflow: Omit<WorkflowSnapshot, "documents">): Prisma.InputJsonObject {
    return {
        ...(baseMetadata ?? {}),
        workflow_stages:
            Array.isArray(baseMetadata?.workflow_stages) && baseMetadata?.workflow_stages.length > 0
                ? baseMetadata.workflow_stages
                : [...DEFAULT_METADATA_WORKFLOW_STAGES],
        workflow: {
            id: workflow.id,
            workflow_type: workflow.workflow_type,
            status: workflow.status,
            current_stage: workflow.current_stage,
            discharge_decision_at: workflow.discharge_decision_at,
            refusal_started_at: workflow.refusal_started_at,
            initial_communication_at: workflow.initial_communication_at,
            support_and_intervention_at: workflow.support_and_intervention_at,
            social_services_referred_at: workflow.social_services_referred_at,
            refusal_form_generated_at: workflow.refusal_form_generated_at,
            financial_notice_generated_at: workflow.financial_notice_generated_at,
            escalation_due_at: workflow.escalation_due_at,
            escalated_at: workflow.escalated_at,
            patient_name: workflow.patient_name,
            patient_id_number: workflow.patient_id_number,
            medical_record_number: workflow.medical_record_number,
            room_number: workflow.room_number,
            attending_physician: workflow.attending_physician,
            discussion_summary: workflow.discussion_summary,
            refusal_reason: workflow.refusal_reason,
            social_administrative_interventions: workflow.social_administrative_interventions,
            insurance_coverage_status: workflow.insurance_coverage_status,
            escalation_required: workflow.escalation_required,
            lifecycle_status: workflow.lifecycle_status,
            case_status: workflow.case_status,
            created_at: workflow.created_at,
            updated_at: workflow.updated_at,
        },
        current_stage: workflow.current_stage,
        discharge_decision_at: workflow.discharge_decision_at,
        refusal_started_at: workflow.refusal_started_at,
        initial_communication_at: workflow.initial_communication_at,
        support_and_intervention_at: workflow.support_and_intervention_at,
        social_services_referred_at: workflow.social_services_referred_at,
        refusal_form_generated_at: workflow.refusal_form_generated_at,
        financial_notice_generated_at: workflow.financial_notice_generated_at,
        escalation_due_at: workflow.escalation_due_at,
        escalated_at: workflow.escalated_at,
        escalation_required: workflow.escalation_required,
        patient_name: workflow.patient_name,
        patient_id_number: workflow.patient_id_number,
        medical_record_number: workflow.medical_record_number,
        room_number: workflow.room_number,
        attending_physician: workflow.attending_physician,
        discussion_summary: workflow.discussion_summary,
        refusal_reason: workflow.refusal_reason,
        social_administrative_interventions: workflow.social_administrative_interventions,
        insurance_coverage_status: workflow.insurance_coverage_status,
        case_status: workflow.case_status,
    } satisfies Prisma.InputJsonObject;
}

async function persistWorkflowState(
    auth: AuthContext,
    caseRecord: AuthorizedCaseRecord,
    workflow: Omit<WorkflowSnapshot, "documents">,
): Promise<void> {
    const metadata = buildMetadata(asRecord(caseRecord.metadata), workflow);

    await prisma.case.update({
        where: { id: caseRecord.id },
        data: {
            workflowType: "discharge_refusal",
            status: workflow.status === "closed" ? CaseStatus.CLOSED : CaseStatus.IN_PROGRESS,
            metadata,
            updatedByUserId: auth.sub,
            version: { increment: 1 },
        },
    });
}

async function createGeneratedDocument(
    auth: AuthContext,
    workflow: Omit<WorkflowSnapshot, "documents">,
    payload: Record<string, unknown>,
    templateKey: "discharge_refusal_form" | "financial_responsibility_notice",
): Promise<WorkflowDocumentSummary> {
    const generatedAt = nowIso();
    const html =
        templateKey === "discharge_refusal_form"
            ? buildRefusalFormHtml(workflow as WorkflowSnapshot, payload, generatedAt)
            : buildFinancialNoticeHtml(workflow as WorkflowSnapshot, payload, generatedAt);

    const document = await prisma.document.create({
        data: {
            tenantId: auth.tenant_id,
            caseId: workflow.case_id,
            documentType:
                templateKey === "financial_responsibility_notice"
                    ? DocumentType.FINANCIAL_RESPONSIBILITY_NOTICE
                    : DocumentType.DISCHARGE_REFUSAL_FORM,
            status: DocumentStatus.GENERATED,
            documentCode:
                templateKey === "financial_responsibility_notice" ? "IMC-PAT-DIS-NOT-01" : "IMC-PAT-DIS-REF-01",
            titleEn:
                templateKey === "financial_responsibility_notice"
                    ? "Notification and Acknowledgment of Financial Responsibility"
                    : "Medical Discharge Refusal Form",
            titleAr:
                templateKey === "financial_responsibility_notice"
                    ? "إشعار وإقرار بالمسؤولية المالية"
                    : "نموذج رفض الخروج الطبي",
            templateKey,
            versionLabel: "1.0",
            fileName: `${templateKey}-${workflow.case_id.slice(0, 8)}.html`,
            mimeType: "text/html",
            previewHtml: html,
            payloadJson: payload as Prisma.InputJsonValue,
            sizeBytes: BigInt(Buffer.byteLength(html, "utf8")),
            generatedByUserId: auth.sub,
            metadata: {
                source: "frontend-local-workflow-fallback",
            } as Prisma.InputJsonObject,
        },
        include: {
            generatedBy: { select: { fullName: true } },
            signedBy: { select: { fullName: true } },
        },
    });

    return mapWorkflowDocument(document);
}

export async function getWorkflowSnapshot(auth: AuthContext, caseId: string): Promise<WorkflowSnapshot> {
    const caseRecord = await getAuthorizedCase(auth, caseId);
    const workflow = buildWorkflowState(caseRecord);
    const documents = await listWorkflowDocumentsInternal(auth.tenant_id, caseId);
    return { ...workflow, documents };
}

export async function listWorkflowDocuments(auth: AuthContext, caseId: string): Promise<WorkflowDocumentSummary[]> {
    await getAuthorizedCase(auth, caseId);
    return listWorkflowDocumentsInternal(auth.tenant_id, caseId);
}

export async function listWorkflowAudit(auth: AuthContext, caseId: string): Promise<WorkflowAuditSummary[]> {
    await getAuthorizedCase(auth, caseId);

    const logs = await prisma.auditLog.findMany({
        where: {
            tenantId: auth.tenant_id,
            caseId,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    return logs.map((item) => ({
        id: item.id,
        action: item.action,
        details: item.details,
        created_at: item.createdAt.toISOString(),
    }));
}

export async function applyWorkflowAction(args: {
    auth: AuthContext;
    caseId: string;
    action: WorkflowActionName;
    payload: Record<string, unknown>;
    request: NextRequest;
}): Promise<{ workflow: WorkflowSnapshot; generatedDocument: WorkflowDocumentSummary | null }> {
    const { auth, caseId, action, payload, request } = args;
    const caseRecord = await getAuthorizedCase(auth, caseId);
    const workflow = buildWorkflowState(caseRecord);
    const timestamp =
        (typeof payload.timestamp === "string" && toIsoString(payload.timestamp)) ||
        (typeof payload.generated_at === "string" && toIsoString(payload.generated_at)) ||
        nowIso();

    const explicitDischargeDecisionAt =
        typeof payload.discharge_decision_at === "string"
            ? toIsoString(payload.discharge_decision_at)
            : null;
    if (explicitDischargeDecisionAt) {
        workflow.discharge_decision_at = explicitDischargeDecisionAt;
    }

    workflow.patient_name = workflow.patient_name || caseRecord.patientName;
    workflow.patient_id_number = workflow.patient_id_number || caseRecord.patientIdNumber;
    workflow.medical_record_number = workflow.medical_record_number || caseRecord.medicalRecordNo;
    workflow.room_number = workflow.room_number || caseRecord.roomNumber;
    workflow.attending_physician =
        (typeof payload.attending_physician === "string" && payload.attending_physician.trim()) ||
        workflow.attending_physician;

    if (typeof payload.discussion_summary === "string" && payload.discussion_summary.trim()) {
        workflow.discussion_summary = payload.discussion_summary.trim();
    }
    if (typeof payload.refusal_reason === "string" && payload.refusal_reason.trim()) {
        workflow.refusal_reason = payload.refusal_reason.trim();
    }
    if (
        typeof payload.social_administrative_interventions === "string" &&
        payload.social_administrative_interventions.trim()
    ) {
        workflow.social_administrative_interventions = payload.social_administrative_interventions.trim();
    }
    if (typeof payload.insurance_coverage_status === "string" && payload.insurance_coverage_status.trim()) {
        workflow.insurance_coverage_status = payload.insurance_coverage_status.trim();
    }

    let generatedDocument: WorkflowDocumentSummary | null = null;

    switch (action) {
        case "record_discharge_decision":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.current_stage = "medical_discharge_decision";
            workflow.status = "active";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "decision_recorded";
            break;
        case "start_refusal_workflow":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.refusal_started_at = workflow.refusal_started_at || timestamp;
            workflow.current_stage = "initial_communication";
            workflow.status = "active";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "refusal_started";
            break;
        case "mark_patient_counseled":
            workflow.refusal_started_at = workflow.refusal_started_at || timestamp;
            workflow.initial_communication_at = workflow.initial_communication_at || timestamp;
            workflow.current_stage = "support_and_intervention";
            workflow.status = "active";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "patient_counseled";
            break;
        case "refer_social_services":
            workflow.refusal_started_at = workflow.refusal_started_at || timestamp;
            workflow.initial_communication_at = workflow.initial_communication_at || timestamp;
            workflow.support_and_intervention_at = workflow.support_and_intervention_at || timestamp;
            workflow.social_services_referred_at = workflow.social_services_referred_at || timestamp;
            workflow.current_stage = "refusal_form";
            workflow.status = "active";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "social_services_referred";
            break;
        case "generate_refusal_form":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.support_and_intervention_at = workflow.support_and_intervention_at || timestamp;
            workflow.social_services_referred_at = workflow.social_services_referred_at || workflow.support_and_intervention_at;
            workflow.refusal_form_generated_at = timestamp;
            workflow.current_stage = "official_notification";
            workflow.status = "pending_notification";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "refusal_form_generated";
            generatedDocument = await createGeneratedDocument(auth, workflow, payload, "discharge_refusal_form");
            break;
        case "generate_financial_notice":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.refusal_form_generated_at = workflow.refusal_form_generated_at || timestamp;
            workflow.financial_notice_generated_at = timestamp;
            workflow.escalation_due_at = workflow.escalation_due_at || timestamp;
            workflow.escalation_required =
                typeof payload.escalation_required === "boolean" ? payload.escalation_required : true;
            workflow.current_stage = "escalation";
            workflow.status = workflow.escalation_required ? "escalation_required" : "active";
            workflow.lifecycle_status = "in_progress";
            workflow.case_status = "financial_notice_generated";
            generatedDocument = await createGeneratedDocument(auth, workflow, payload, "financial_responsibility_notice");
            break;
        case "escalate_legal_compliance":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.financial_notice_generated_at = workflow.financial_notice_generated_at || timestamp;
            workflow.escalation_due_at = workflow.escalation_due_at || timestamp;
            workflow.escalation_required = true;
            workflow.escalated_at = workflow.escalated_at || timestamp;
            workflow.current_stage = "escalation";
            workflow.status = "escalated";
            workflow.lifecycle_status = "escalated";
            workflow.case_status = "escalated";
            break;
        case "close_workflow":
            workflow.discharge_decision_at = workflow.discharge_decision_at || timestamp;
            workflow.current_stage = "closed";
            workflow.status = "closed";
            workflow.lifecycle_status = "closed";
            workflow.case_status = "closed";
            break;
        default:
            throw new ApiError(400, "Unsupported workflow action");
    }

    workflow.updated_at = timestamp;

    await persistWorkflowState(auth, caseRecord, workflow);

    await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: generatedDocument ? "document" : "case",
        entityId: generatedDocument?.id ?? caseId,
        action,
        details: `Workflow action completed: ${action}`,
        caseId,
        documentId: generatedDocument?.id ?? null,
        metadataJson: {
            current_stage: workflow.current_stage,
            status: workflow.status,
            generated_document_id: generatedDocument?.id ?? null,
        } as Prisma.InputJsonObject,
        request,
    });

    const nextWorkflow = await getWorkflowSnapshot(auth, caseId);
    return { workflow: nextWorkflow, generatedDocument };
}