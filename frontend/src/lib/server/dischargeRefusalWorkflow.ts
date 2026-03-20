import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

// ── Types ──────────────────────────────────────────────────────────────────

export type WorkflowDocument = {
  id: string;
  template_key: string;
  document_code: string | null;
  title: string;
  file_name: string;
  generated_at: string | null;
  templateVersion: string | null;
  generationStatus: string | null;
  signedStatus: boolean;
  archivedStatus: boolean;
  createdBy: string | null;
  signedBy: string | null;
  signedAt: string | null;
};

type WorkflowSnapshotMetadata = {
  discharge_decision_at?: string | null;
  refusal_started_at?: string | null;
  initial_communication_at?: string | null;
  support_and_intervention_at?: string | null;
  social_services_referred_at?: string | null;
  refusal_form_generated_at?: string | null;
  financial_notice_generated_at?: string | null;
  escalation_due_at?: string | null;
  escalated_at?: string | null;
  current_stage?: string | null;
  workflow_type?: string | null;
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
  [key: string]: unknown;
};

function readMeta(meta: WorkflowSnapshotMetadata | null | undefined, key: string): string | null {
  if (!meta) return null;
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeMeta(raw: unknown): WorkflowSnapshotMetadata {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as WorkflowSnapshotMetadata;
  }
  return {};
}

const ACTION_STAGE_MAP: Record<string, string> = {
  record_discharge_decision: "medical_discharge_decision",
  start_refusal_workflow: "initial_communication",
  mark_patient_counseled: "initial_communication",
  refer_social_services: "support_and_intervention",
  generate_refusal_form: "refusal_form",
  generate_financial_notice: "official_notification",
  escalate_legal_compliance: "escalation",
};

const ACTION_TIMESTAMP_MAP: Record<string, string> = {
  record_discharge_decision: "discharge_decision_at",
  start_refusal_workflow: "refusal_started_at",
  mark_patient_counseled: "initial_communication_at",
  refer_social_services: "social_services_referred_at",
  generate_refusal_form: "refusal_form_generated_at",
  generate_financial_notice: "financial_notice_generated_at",
  escalate_legal_compliance: "escalated_at",
};

// ── listWorkflowAudit ──────────────────────────────────────────────────────

export async function listWorkflowAudit(
  auth: AuthContext,
  caseId: string,
): Promise<Array<{ id: string; action: string; details: string | null; created_at: string | null }>> {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const logs = await prisma.auditLog.findMany({
    where: { caseId, tenantId: auth.tenant_id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, action: true, details: true, createdAt: true },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    details: log.details ?? null,
    created_at: log.createdAt.toISOString(),
  }));
}

// ── listWorkflowDocuments ──────────────────────────────────────────────────

export async function listWorkflowDocuments(
  auth: AuthContext,
  caseId: string,
): Promise<WorkflowDocument[]> {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const documents = await prisma.document.findMany({
    where: { caseId, tenantId: auth.tenant_id },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      templateKey: true,
      documentCode: true,
      titleEn: true,
      fileName: true,
      generatedAt: true,
      versionLabel: true,
      status: true,
      generatedByUserId: true,
      signedByUserId: true,
      signedAt: true,
    },
  });

  return documents.map((doc) => ({
    id: doc.id,
    template_key: doc.templateKey,
    document_code: doc.documentCode ?? null,
    title: doc.titleEn,
    file_name: doc.fileName,
    generated_at: doc.generatedAt.toISOString(),
    templateVersion: doc.versionLabel,
    generationStatus: doc.status,
    signedStatus: doc.status === "SIGNED",
    archivedStatus: doc.status === "ARCHIVED",
    createdBy: doc.generatedByUserId ?? null,
    signedBy: doc.signedByUserId ?? null,
    signedAt: doc.signedAt?.toISOString() ?? null,
  }));
}

// ── getWorkflowSnapshot ────────────────────────────────────────────────────

export async function getWorkflowSnapshot(
  auth: AuthContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: {
      id: true,
      patientName: true,
      patientIdNumber: true,
      medicalRecordNo: true,
      roomNumber: true,
      status: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const meta = safeMeta(caseRecord.metadata);
  const statusLower = caseRecord.status?.toLowerCase() ?? "open";

  return {
    id: caseId,
    case_id: caseId,
    workflow_type: readMeta(meta, "workflow_type") ?? "discharge_refusal",
    status: statusLower === "closed" ? "closed" : statusLower === "archived" ? "closed" : "active",
    current_stage: readMeta(meta, "current_stage") ?? "medical_discharge_decision",
    discharge_decision_at: readMeta(meta, "discharge_decision_at"),
    refusal_started_at: readMeta(meta, "refusal_started_at"),
    initial_communication_at: readMeta(meta, "initial_communication_at"),
    support_and_intervention_at: readMeta(meta, "support_and_intervention_at"),
    social_services_referred_at: readMeta(meta, "social_services_referred_at"),
    refusal_form_generated_at: readMeta(meta, "refusal_form_generated_at"),
    financial_notice_generated_at: readMeta(meta, "financial_notice_generated_at"),
    escalation_due_at: readMeta(meta, "escalation_due_at"),
    escalated_at: readMeta(meta, "escalated_at"),
    patient_name: caseRecord.patientName ?? readMeta(meta, "patient_name"),
    patient_id_number: caseRecord.patientIdNumber ?? readMeta(meta, "patient_id_number"),
    medical_record_number: caseRecord.medicalRecordNo ?? readMeta(meta, "medical_record_number"),
    room_number: caseRecord.roomNumber ?? readMeta(meta, "room_number"),
    attending_physician: readMeta(meta, "attending_physician"),
    discussion_summary: readMeta(meta, "discussion_summary"),
    refusal_reason: readMeta(meta, "refusal_reason"),
    social_administrative_interventions: readMeta(meta, "social_administrative_interventions"),
    insurance_coverage_status: readMeta(meta, "insurance_coverage_status"),
    escalation_required: Boolean(meta.escalation_required),
    lifecycle_status: statusLower,
    case_status: caseRecord.status,
  };
}

// ── applyWorkflowAction ────────────────────────────────────────────────────

type ApplyWorkflowActionParams = {
  auth: AuthContext;
  caseId: string;
  action: string;
  payload: Record<string, unknown>;
  request: NextRequest;
};

export async function applyWorkflowAction(
  params: ApplyWorkflowActionParams,
): Promise<{ workflow: Record<string, unknown>; generatedDocument: Record<string, unknown> | null }> {
  const { auth, caseId, action, payload } = params;

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true, metadata: true, status: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const existingMeta = safeMeta(caseRecord.metadata);
  const timestampKey = ACTION_TIMESTAMP_MAP[action];
  const newStage = ACTION_STAGE_MAP[action];
  const now = nowIso();

  const updatedMeta: WorkflowSnapshotMetadata = { ...existingMeta };

  if (timestampKey && !updatedMeta[timestampKey]) {
    updatedMeta[timestampKey] = now;
  }
  if (newStage) {
    updatedMeta.current_stage = newStage;
  }

  // Merge any payload fields that are strings into metadata
  for (const [k, v] of Object.entries(payload)) {
    if (k !== "_actor" && typeof v === "string" && v.trim()) {
      updatedMeta[k] = v.trim();
    }
  }

  // Special handling for escalation
  if (action === "escalate_legal_compliance") {
    updatedMeta.escalation_required = true;
    if (!updatedMeta.escalation_due_at) {
      const decisionAt = updatedMeta.discharge_decision_at;
      if (decisionAt) {
        updatedMeta.escalation_due_at = new Date(
          new Date(decisionAt).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString();
      }
    }
  }

  await prisma.case.update({
    where: { id: caseId },
    data: { metadata: updatedMeta as object },
  });

  try {
    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      caseId,
      action,
      entityType: "case",
      entityId: caseId,
      metadataJson: { action, stage: newStage ?? null },
    });
  } catch (auditErr) {
    console.error("applyWorkflowAction: audit log write failed (non-fatal)", auditErr);
  }

  const workflow = await getWorkflowSnapshot(auth, caseId);
  return { workflow, generatedDocument: null };
}
