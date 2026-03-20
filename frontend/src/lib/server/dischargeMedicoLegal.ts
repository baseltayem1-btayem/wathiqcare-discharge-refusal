import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

// ── Types ──────────────────────────────────────────────────────────────────

type CaseMetadata = {
  discharge_decision_at?: string | null;
  escalated_at?: string | null;
  escalation_due_at?: string | null;
  escalation_priority?: string | null;
  escalation_resolved_at?: string | null;
  escalation_resolution_notes?: string | null;
  escalation_required?: boolean;
  current_stage?: string | null;
  [key: string]: unknown;
};

function safeMeta(raw: unknown): CaseMetadata {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as CaseMetadata;
  }
  return {};
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── listRefusalCases ───────────────────────────────────────────────────────

export async function listRefusalCases(
  auth: AuthContext,
  limit: number,
): Promise<Array<Record<string, unknown>>> {
  const cases = await prisma.case.findMany({
    where: { tenantId: auth.tenant_id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      caseNumber: true,
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

  return cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber ?? null,
    patientName: c.patientName ?? null,
    patientIdNumber: c.patientIdNumber ?? null,
    medicalRecordNo: c.medicalRecordNo ?? null,
    roomNumber: c.roomNumber ?? null,
    status: c.status,
    metadata: c.metadata ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

// ── listLegalEscalations ───────────────────────────────────────────────────

export async function listLegalEscalations(
  auth: AuthContext,
): Promise<Array<Record<string, unknown>>> {
  const cases = await prisma.case.findMany({
    where: { tenantId: auth.tenant_id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      status: true,
      metadata: true,
      createdAt: true,
    },
  });

  return cases
    .filter((c) => {
      const meta = safeMeta(c.metadata);
      return Boolean(meta.escalation_required) || Boolean(meta.escalated_at);
    })
    .map((c) => {
      const meta = safeMeta(c.metadata);
      return {
        id: c.id,
        caseNumber: c.caseNumber ?? null,
        patientName: c.patientName ?? null,
        status: c.status,
        escalation_required: Boolean(meta.escalation_required),
        escalated_at: meta.escalated_at ?? null,
        escalation_due_at: meta.escalation_due_at ?? null,
        escalation_priority: meta.escalation_priority ?? "medium",
        escalation_resolved_at: meta.escalation_resolved_at ?? null,
        metadata: c.metadata ?? null,
        createdAt: c.createdAt.toISOString(),
      };
    });
}

// ── getLegalEscalation ─────────────────────────────────────────────────────

export async function getLegalEscalation(
  auth: AuthContext,
  caseId: string,
): Promise<Record<string, unknown>> {
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      status: true,
      metadata: true,
      createdAt: true,
    },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const meta = safeMeta(caseRecord.metadata);

  const notes = await prisma.auditLog.findMany({
    where: {
      caseId,
      tenantId: auth.tenant_id,
      action: { in: ["legal_escalation_note", "escalation_note"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, action: true, details: true, metadataJson: true, createdAt: true },
  });

  return {
    id: caseId,
    caseNumber: caseRecord.caseNumber ?? null,
    patientName: caseRecord.patientName ?? null,
    status: caseRecord.status,
    escalation_required: Boolean(meta.escalation_required),
    escalated_at: meta.escalated_at ?? null,
    escalation_due_at: meta.escalation_due_at ?? null,
    escalation_priority: meta.escalation_priority ?? "medium",
    escalation_resolved_at: meta.escalation_resolved_at ?? null,
    escalation_resolution_notes: meta.escalation_resolution_notes ?? null,
    notes: notes.map((n) => ({
      id: n.id,
      note: n.details ?? "",
      note_type: (n.metadataJson && typeof n.metadataJson === "object" && !Array.isArray(n.metadataJson))
        ? ((n.metadataJson as Record<string, unknown>).note_type as string | null) ?? "legal"
        : "legal",
      author: (n.metadataJson && typeof n.metadataJson === "object" && !Array.isArray(n.metadataJson))
        ? ((n.metadataJson as Record<string, unknown>).author as string | null) ?? null
        : null,
      created_at: n.createdAt.toISOString(),
    })),
    metadata: caseRecord.metadata ?? null,
    created_at: caseRecord.createdAt.toISOString(),
  };
}

// ── addLegalEscalationNote ─────────────────────────────────────────────────

type AddNoteParams = {
  auth: AuthContext;
  caseId: string;
  note: string;
  noteType?: string;
  author?: string;
  request: NextRequest;
};

export async function addLegalEscalationNote(
  params: AddNoteParams,
): Promise<Record<string, unknown>> {
  const { auth, caseId, note, noteType = "legal", author, request } = params;

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    caseId,
    action: "legal_escalation_note",
    entityType: "case",
    entityId: caseId,
    details: note,
    metadataJson: { note_type: noteType, author: author ?? auth.sub },
    request,
  });

  return {
    id: `note-${Date.now()}`,
    caseId,
    note,
    note_type: noteType,
    author: author ?? auth.sub,
    created_at: nowIso(),
  };
}

// ── updateLegalEscalationPriority ──────────────────────────────────────────

type UpdatePriorityParams = {
  auth: AuthContext;
  caseId: string;
  priority: string;
  request: NextRequest;
};

export async function updateLegalEscalationPriority(
  params: UpdatePriorityParams,
): Promise<Record<string, unknown>> {
  const { auth, caseId, priority, request } = params;

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true, metadata: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const meta = safeMeta(caseRecord.metadata);
  await prisma.case.update({
    where: { id: caseId },
    data: { metadata: { ...meta, escalation_priority: priority } },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    caseId,
    action: "escalation_priority_updated",
    entityType: "case",
    entityId: caseId,
    metadataJson: { priority },
    request,
  });

  return {
    id: caseId,
    caseId,
    escalation_priority: priority,
    updated_at: nowIso(),
  };
}

// ── resolveLegalEscalation ─────────────────────────────────────────────────

type ResolveParams = {
  auth: AuthContext;
  caseId: string;
  resolutionNotes: string;
  closeCase: boolean;
  request: NextRequest;
};

export async function resolveLegalEscalation(
  params: ResolveParams,
): Promise<Record<string, unknown>> {
  const { auth, caseId, resolutionNotes, closeCase, request } = params;

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    select: { id: true, metadata: true },
  });
  if (!caseRecord) throw new ApiError(404, "Case not found");

  const now = nowIso();
  const meta = safeMeta(caseRecord.metadata);
  const updatedMeta: CaseMetadata = {
    ...meta,
    escalation_resolved_at: now,
    escalation_resolution_notes: resolutionNotes,
    escalation_required: false,
    current_stage: "closed",
  };

  await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: updatedMeta as object,
      ...(closeCase ? { status: "CLOSED", closedAt: new Date() } : {}),
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id,
    userId: auth.sub,
    caseId,
    action: "escalation_resolved",
    entityType: "case",
    entityId: caseId,
    details: resolutionNotes,
    metadataJson: { close_case: closeCase },
    request,
  });

  return {
    id: caseId,
    caseId,
    escalation_resolved_at: now,
    escalation_resolution_notes: resolutionNotes,
    escalation_required: false,
    closed: closeCase,
  };
}

// ── listMedicalLegalTemplates ──────────────────────────────────────────────

type TemplateInfo = {
  key: string;
  title_en: string;
  title_ar: string;
  document_code: string;
  required_fields: string[];
  description_en: string;
  description_ar: string;
};

const MEDICAL_LEGAL_TEMPLATES: TemplateInfo[] = [
  {
    key: "discharge_refusal_form",
    title_en: "Discharge Refusal Form",
    title_ar: "نموذج رفض الخروج",
    document_code: "IMC-PAT-DIS-REF-01",
    required_fields: ["patient_name", "patient_id_number", "discharge_decision_at", "refusal_reason"],
    description_en: "Documents patient refusal of medically advised discharge.",
    description_ar: "يوثق رفض المريض للخروج الطبي الموصى به.",
  },
  {
    key: "financial_responsibility_notice",
    title_en: "Financial Responsibility Notice",
    title_ar: "إشعار المسؤولية المالية",
    document_code: "IMC-PAT-DIS-NOT-01",
    required_fields: ["patient_name", "patient_id_number", "discharge_decision_at"],
    description_en: "Notifies patient of financial responsibility upon refusal of discharge.",
    description_ar: "يخطر المريض بالمسؤولية المالية عند رفض الخروج.",
  },
  {
    key: "informed_consent",
    title_en: "Acknowledgment and Informed Consent",
    title_ar: "الموافقة المستنيرة والإقرار",
    document_code: "IMC-PAT-CONS-01",
    required_fields: ["patient_name"],
    description_en: "Records patient acknowledgment of medical advice and informed consent.",
    description_ar: "يسجل إقرار المريض بالنصيحة الطبية والموافقة المستنيرة.",
  },
  {
    key: "home_healthcare_agreement",
    title_en: "Home Healthcare Agreement",
    title_ar: "اتفاقية الرعاية الصحية المنزلية",
    document_code: "IMC-HHC-AGR-01",
    required_fields: ["patient_name", "patient_id_number"],
    description_en: "Agreement for home healthcare services as an alternative to hospital discharge.",
    description_ar: "اتفاقية خدمات الرعاية الصحية المنزلية كبديل للخروج من المستشفى.",
  },
];

export function listMedicalLegalTemplates(): {
  library: string;
  templates: TemplateInfo[];
} {
  return {
    library: "medical_legal_forms",
    templates: MEDICAL_LEGAL_TEMPLATES,
  };
}

// ── getRefusalQualityMetrics ───────────────────────────────────────────────

export async function getRefusalQualityMetrics(
  auth: AuthContext,
): Promise<Record<string, unknown>> {
  const [totalCases, activeCases] = await Promise.all([
    prisma.case.count({ where: { tenantId: auth.tenant_id } }),
    prisma.case.count({
      where: { tenantId: auth.tenant_id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  const cases = await prisma.case.findMany({
    where: { tenantId: auth.tenant_id },
    select: { metadata: true, createdAt: true, closedAt: true },
    take: 500,
  });

  let escalatedAfter24h = 0;
  let totalResolutionHours = 0;
  let resolvedCount = 0;
  const refusalReasons: Record<string, number> = {};

  for (const c of cases) {
    const meta = safeMeta(c.metadata);
    if (meta.escalated_at && meta.discharge_decision_at) {
      const diff =
        new Date(meta.escalated_at as string).getTime() -
        new Date(meta.discharge_decision_at as string).getTime();
      if (diff > 24 * 60 * 60 * 1000) escalatedAfter24h++;
    }
    if (c.closedAt && c.createdAt) {
      const diff = c.closedAt.getTime() - c.createdAt.getTime();
      totalResolutionHours += diff / (1000 * 60 * 60);
      resolvedCount++;
    }
    if (meta.refusal_reason && typeof meta.refusal_reason === "string") {
      const r = meta.refusal_reason;
      refusalReasons[r] = (refusalReasons[r] ?? 0) + 1;
    }
  }

  return {
    total_refusal_cases: totalCases,
    active_refusal_cases: activeCases,
    cases_escalated_after_24_hours: escalatedAfter24h,
    average_resolution_time_hours:
      resolvedCount > 0
        ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10
        : 0,
    refusal_reasons_distribution: refusalReasons,
    cases_by_department: {},
    monthly_review_reports: {},
    quarterly_reports: {},
  };
}
