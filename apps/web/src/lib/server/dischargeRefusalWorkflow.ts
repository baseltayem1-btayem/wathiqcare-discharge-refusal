import { CaseStatus, DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import {
    requireTenantId,
    requireTenantOperationalAccess,
    requireTenantPermissionForAuth,
    type AuthContext,
} from "@/lib/server/auth";
import { checkAttendingPhysicianAuthority } from "@/lib/server/clinical-authority";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { getTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";
import { buildTenantReferenceNumber } from "@/lib/server/tenantBranding";
import { writeAuditLog } from "@/lib/server/saas-services";
import { dischargeRefusalFormTemplate } from "@/lib/templates/dischargeRefusalForm.template";
import { financialResponsibilityNoticeTemplate } from "@/lib/templates/financialResponsibilityNotice.template";

type DocumentLocale = "ar" | "en";

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
    tenant_name: string | null;
    tenant_code: string | null;
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
    attending_physician_id: string | null;
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

async function findCaseWithWorkflow(caseId: string, tenantId: string) {
<<<<<<< HEAD
    return getPrisma().case.findFirst({
=======
    return prisma.case.findFirst({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: { id: caseId, tenantId },
        include: {
            tenant: {
                select: {
                    name: true,
                    code: true,
                },
            },
        },
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

function formatDateOnly(value: string | null | undefined): string {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function normalizeDocumentLocale(value: unknown): DocumentLocale {
    return value === "ar" ? "ar" : "en";
}

function buildRefusalFormHtml(
    workflow: WorkflowSnapshot,
    payload: Record<string, unknown>,
    generatedAt: string,
    locale: DocumentLocale,
    tenantIdentity?: {
        displayName: string;
        legalName: string | null;
        licenseNumber: string | null;
        commercialRegistrationNumber: string | null;
        taxNumber: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        websiteUrl: string | null;
        logoUrl: string | null;
        documentHeaderText: string | null;
        documentFooterText: string | null;
        legalDisclaimer: string | null;
    },
    documentCode?: string,
): string {
    return dischargeRefusalFormTemplate.renderHtml(
        {
            patientName: workflow.patient_name ?? undefined,
            patientIdNumber: workflow.patient_id_number ?? undefined,
            medicalRecordNumber: workflow.medical_record_number ?? undefined,
            roomNumber: workflow.room_number ?? undefined,
            attendingPhysicianName: workflow.attending_physician ?? undefined,
            dischargeDecisionAt: formatDateOnly(workflow.discharge_decision_at),
            discussionSummary: workflow.discussion_summary || workflow.refusal_reason || undefined,
            refusalReason: workflow.refusal_reason ?? undefined,
            socialServicesSummary:
                typeof payload.social_administrative_interventions === "string"
                    ? payload.social_administrative_interventions
                    : workflow.social_administrative_interventions ?? undefined,
        },
        {
            locale,
            tenantName: workflow.tenant_name ?? null,
            tenantIdentity: tenantIdentity ?? null,
            documentCode: documentCode ?? null,
        },
    );
}

function buildFinancialNoticeHtml(
    workflow: WorkflowSnapshot,
    payload: Record<string, unknown>,
    generatedAt: string,
    locale: DocumentLocale,
    tenantIdentity?: {
        displayName: string;
        legalName: string | null;
        licenseNumber: string | null;
        commercialRegistrationNumber: string | null;
        taxNumber: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        country: string | null;
        postalCode: string | null;
        websiteUrl: string | null;
        logoUrl: string | null;
        documentHeaderText: string | null;
        documentFooterText: string | null;
        legalDisclaimer: string | null;
    },
    documentCode?: string,
): string {
    return financialResponsibilityNoticeTemplate.renderHtml(
        {
            documentDate: formatDateOnly(generatedAt),
            referenceNumber: buildTenantReferenceNumber({
                tenantCode: workflow.tenant_code,
                caseId: workflow.case_id,
                suffix: "REF",
            }),
            patientOrGuardianName:
                typeof payload.patient_name_or_guardian === "string"
                    ? payload.patient_name_or_guardian
                    : workflow.patient_name ?? undefined,
            patientName: workflow.patient_name ?? undefined,
            patientIdNumber: workflow.patient_id_number ?? undefined,
            medicalRecordNumber: workflow.medical_record_number ?? undefined,
            roomNumber: workflow.room_number ?? undefined,
            dischargeDecisionAt: formatDateOnly(workflow.discharge_decision_at),
            attendingPhysicianName: workflow.attending_physician ?? undefined,
            refusalReason: workflow.refusal_reason ?? undefined,
            discussionSummary: workflow.discussion_summary || workflow.refusal_reason || undefined,
        },
        {
            locale,
            tenantName: workflow.tenant_name ?? null,
            tenantIdentity: tenantIdentity ?? null,
            documentCode: documentCode ?? null,
        },
    );
}

function buildWorkflowDocumentCode(args: {
    tenantCode: string | null | undefined;
    templateKey: "discharge_refusal_form" | "financial_responsibility_notice";
}): string {
    const prefix = (args.tenantCode || "TEN")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "TEN";

    if (args.templateKey === "financial_responsibility_notice") {
        return `${prefix}-PAT-DIS-NOT-01`;
    }

    return `${prefix}-PAT-DIS-REF-01`;
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
    const tenantId = requireTenantId(auth);
    const caseRecord = await findCaseWithWorkflow(caseId, tenantId);

    if (!caseRecord) {
        throw new ApiError(404, "Case not found");
    }

    return caseRecord;
}

async function listWorkflowDocumentsInternal(tenantId: string, caseId: string): Promise<WorkflowDocumentSummary[]> {
<<<<<<< HEAD
    const documents = await getPrisma().document.findMany({
=======
    const documents = await prisma.document.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
        tenant_name: caseRecord.tenant?.name ?? null,
        tenant_code: caseRecord.tenant?.code ?? null,
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
        attending_physician_id:
            readString(storedWorkflow, "attending_physician_id") || readString(metadata, "attending_physician_id"),
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
            attending_physician_id: workflow.attending_physician_id,
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
        attending_physician_id: workflow.attending_physician_id,
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

<<<<<<< HEAD
    await getPrisma().case.update({
=======
    await prisma.case.update({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
    const tenantId = requireTenantId(auth);
    const generatedAt = nowIso();
    const locale = normalizeDocumentLocale(payload.locale);
    const brandingProfile = await getTenantBrandingProfile(tenantId);
    const tenantIdentity = {
        displayName: brandingProfile?.displayName || workflow.tenant_name || "Healthcare Provider",
        legalName: brandingProfile?.legalName ?? null,
        licenseNumber: brandingProfile?.licenseNumber ?? null,
        commercialRegistrationNumber: brandingProfile?.commercialRegistrationNumber ?? null,
        taxNumber: brandingProfile?.taxNumber ?? null,
        contactEmail: brandingProfile?.contactEmail ?? null,
        contactPhone: brandingProfile?.contactPhone ?? null,
        addressLine1: brandingProfile?.addressLine1 ?? null,
        addressLine2: brandingProfile?.addressLine2 ?? null,
        city: brandingProfile?.city ?? null,
        country: brandingProfile?.country ?? null,
        postalCode: brandingProfile?.postalCode ?? null,
        websiteUrl: brandingProfile?.websiteUrl ?? null,
        logoUrl: brandingProfile?.logoUrl ?? null,
        documentHeaderText: brandingProfile?.documentHeaderText ?? null,
        documentFooterText: brandingProfile?.documentFooterText ?? null,
        legalDisclaimer: brandingProfile?.legalDisclaimer ?? null,
    };
    const documentCode = buildWorkflowDocumentCode({ tenantCode: workflow.tenant_code, templateKey });
    const html =
        templateKey === "discharge_refusal_form"
            ? buildRefusalFormHtml(workflow as WorkflowSnapshot, payload, generatedAt, locale, tenantIdentity, documentCode)
            : buildFinancialNoticeHtml(
                workflow as WorkflowSnapshot,
                payload,
                generatedAt,
                locale,
                tenantIdentity,
                documentCode,
            );

<<<<<<< HEAD
    const document = await getPrisma().document.create({
=======
    const document = await prisma.document.create({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        data: {
            tenantId,
            caseId: workflow.case_id,
            documentType:
                templateKey === "financial_responsibility_notice"
                    ? DocumentType.FINANCIAL_RESPONSIBILITY_NOTICE
                    : DocumentType.DISCHARGE_REFUSAL_FORM,
            status: DocumentStatus.GENERATED,
            documentCode,
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
                locale,
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
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    const caseRecord = await getAuthorizedCase(auth, caseId);
    const workflow = buildWorkflowState(caseRecord);
    const documents = await listWorkflowDocumentsInternal(tenantId, caseId);
    return { ...workflow, documents };
}

export async function listWorkflowDocuments(auth: AuthContext, caseId: string): Promise<WorkflowDocumentSummary[]> {
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    await getAuthorizedCase(auth, caseId);
    return listWorkflowDocumentsInternal(tenantId, caseId);
}

export async function listWorkflowAudit(auth: AuthContext, caseId: string): Promise<WorkflowAuditSummary[]> {
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
    await getAuthorizedCase(auth, caseId);

<<<<<<< HEAD
    const logs = await getPrisma().auditLog.findMany({
=======
    const logs = await prisma.auditLog.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: {
            tenantId,
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
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);
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
    workflow.attending_physician_id =
        (typeof payload.attending_physician_id === "string" && payload.attending_physician_id.trim()) ||
        workflow.attending_physician_id;

    const actionRequiresAttendingAuthority = action === "record_discharge_decision" || action === "close_workflow";
    if (actionRequiresAttendingAuthority) {
        const permissionContext = await requireTenantPermissionForAuth(auth, tenantId, "discharge.approve", {
            allowPlatform: false,
        });
        const hasApprovePermission =
            permissionContext.permissionKeys.has("*") ||
            permissionContext.permissionKeys.has("discharge.approve");
        const authority = checkAttendingPhysicianAuthority({
            userId: auth.sub,
            attendingPhysicianId: workflow.attending_physician_id,
            hasDischargeApprovePermission: hasApprovePermission,
        });

        if (!authority.allowed) {
            if (authority.reason === "missing_attending_physician") {
                throw new ApiError(403, "Case attending physician is not assigned");
            }
            if (authority.reason === "not_attending_physician") {
                throw new ApiError(403, "Only the attending physician can approve this decision");
            }
            throw new ApiError(403, "Missing discharge approval permission");
        }
    }

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
        tenantId: requireTenantId(auth),
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
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
