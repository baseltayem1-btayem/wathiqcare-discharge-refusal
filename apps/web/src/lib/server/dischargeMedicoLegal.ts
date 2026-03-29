import { CaseStatus, CaseType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { requireTenantId, type AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RefusalCaseListItem = {
    id: string;
    case_number: string | null;
    patient_name: string | null;
    status: string;
    refusal_reason: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
};

type RefusalQualityMetrics = {
    total_refusal_cases: number;
    active_refusal_cases: number;
    cases_escalated_after_24_hours: number;
    average_resolution_time_hours: number;
    refusal_reasons_distribution: Record<string, number>;
    cases_by_department: Record<string, number>;
    monthly_review_reports: Record<string, number>;
    quarterly_reports: Record<string, number>;
};

type LegalEscalationPriority = "low" | "medium" | "high" | "critical";
type LegalEscalationStatus = "active" | "under-review" | "resolved" | "high-risk";

type LegalEscalationNote = {
    id: string;
    caseId: string;
    note: string;
    author: string;
    authorRole?: string;
    createdAt: string;
};

type LegalEscalationCase = {
    id: string;
    caseId: string;
    caseNumber: string;
    patientName: string;
    status: LegalEscalationStatus;
    priority: LegalEscalationPriority;
    escalatedAt: string;
    assignedCounsel?: string | null;
    reason: string;
    riskLevel?: string | null;
    followUpDate?: string | null;
    resolvedAt?: string | null;
    resolutionNotes?: string | null;
    notes: LegalEscalationNote[];
    auditTrail?: Array<{
        action: string;
        details?: string;
        timestamp: string;
        actor?: string;
    }>;
};

type RefusalCaseRecord = Awaited<ReturnType<typeof findRefusalCases>>[number];

const LEGAL_AUDIT_ACTIONS = new Set([
    "escalate_legal_compliance",
    "legal_escalation_assigned",
    "legal_escalation_note_added",
    "legal_escalation_priority_updated",
    "legal_escalation_resolved",
]);

const MEDICAL_LEGAL_TEMPLATES = [
    {
        key: "discharge_refusal_form",
        title: "Medical Discharge Refusal Form",
        code: "IMC-PAT-DIS-REF-01",
        version: "1.0",
        locked_template: true,
        digitally_signable: true,
        pdf_exportable: true,
        case_attachable: true,
        bilingual: true,
    },
    {
        key: "financial_responsibility_notice",
        title: "Notification and Acknowledgment of Financial Responsibility",
        code: "IMC-PAT-DIS-NOT-01",
        version: "1.0",
        locked_template: true,
        digitally_signable: true,
        pdf_exportable: true,
        case_attachable: true,
        bilingual: true,
    },
    {
        key: "informed_consent",
        title: "Acknowledgment and Informed Consent",
        code: "IMC-PAT-CONS-01",
        version: "1.0",
        locked_template: true,
        digitally_signable: true,
        pdf_exportable: true,
        case_attachable: true,
        bilingual: true,
    },
    {
        key: "home_healthcare_agreement",
        title: "Home Healthcare Agreement",
        code: "IMC-HHC-AGR-01",
        version: "1.0",
        locked_template: true,
        digitally_signable: true,
        pdf_exportable: true,
        case_attachable: true,
        bilingual: true,
    },
] as const;

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

function toPriority(value: string | null | undefined): LegalEscalationPriority {
    switch ((value || "").toLowerCase()) {
        case "low":
        case "medium":
        case "high":
        case "critical":
            return value!.toLowerCase() as LegalEscalationPriority;
        default:
            return "high";
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function toTitleCaseStatus(status: string): string {
    switch (status) {
        case "resolved":
            return "resolved";
        case "high-risk":
            return "high-risk";
        case "under-review":
            return "under-review";
        default:
            return "active";
    }
}

function getWorkflowRecord(metadata: Record<string, unknown> | null): Record<string, unknown> | null {
    return asRecord(metadata?.workflow);
}

function getLegalRecord(metadata: Record<string, unknown> | null): Record<string, unknown> | null {
    return asRecord(metadata?.legal_escalation);
}

function isRefusalCase(caseRecord: { workflowType: string | null; caseType: CaseType; metadata: Prisma.JsonValue | null }): boolean {
    const metadata = asRecord(caseRecord.metadata);
    return (
        caseRecord.workflowType === "discharge_refusal" ||
        caseRecord.caseType === CaseType.DISCHARGE_REFUSAL ||
        Boolean(getWorkflowRecord(metadata))
    );
}

async function findRefusalCases(tenantId: string, limit = 200) {
    const prisma = getPrisma();
    const cases = await prisma.case.findMany({
        where: { tenantId },
        include: {
            auditLogs: {
                orderBy: { createdAt: "desc" },
                take: 100,
            },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
    });

    return cases.filter((caseRecord) => isRefusalCase(caseRecord));
}

function mapRefusalCase(caseRecord: RefusalCaseRecord): RefusalCaseListItem {
    const metadata = asRecord(caseRecord.metadata);
    const workflow = getWorkflowRecord(metadata);
    const caseStatus =
        readString(workflow, "status") ||
        readString(metadata, "case_status") ||
        caseRecord.status.toLowerCase();

    return {
        id: caseRecord.id,
        case_number: caseRecord.caseNumber,
        patient_name: readString(workflow, "patient_name") || caseRecord.patientName,
        status: caseStatus,
        refusal_reason:
            readString(workflow, "refusal_reason") || readString(metadata, "refusal_reason") || caseRecord.title,
        created_at: caseRecord.createdAt.toISOString(),
        metadata,
    };
}

export async function listRefusalCases(auth: AuthContext, limit = 200): Promise<RefusalCaseListItem[]> {
    const tenantId = requireTenantId(auth);
    const cases = await findRefusalCases(tenantId, limit);
    return cases.map((caseRecord) => mapRefusalCase(caseRecord));
}

export async function getRefusalQualityMetrics(auth: AuthContext): Promise<RefusalQualityMetrics> {
    const tenantId = requireTenantId(auth);
    const cases = await findRefusalCases(tenantId, 500);

    const reasons: Record<string, number> = {};
    const departments: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    const quarterly: Record<string, number> = {};

    let active = 0;
    let escalatedAfter24h = 0;
    let totalResolutionHours = 0;
    let resolvedCount = 0;

    for (const caseRecord of cases) {
        const metadata = asRecord(caseRecord.metadata);
        const workflow = getWorkflowRecord(metadata);
        const status = (readString(workflow, "status") || caseRecord.status.toLowerCase()).toLowerCase();
        const reason = readString(workflow, "refusal_reason") || readString(metadata, "refusal_reason") || "Unknown";
        const department = readString(metadata, "department") || readString(workflow, "responsible_department") || "Unassigned";
        const updatedAt = caseRecord.updatedAt;

        reasons[reason] = (reasons[reason] || 0) + 1;
        departments[department] = (departments[department] || 0) + 1;

        const monthKey = updatedAt.toISOString().slice(0, 7);
        const quarterKey = `${updatedAt.getUTCFullYear()}-Q${Math.floor(updatedAt.getUTCMonth() / 3) + 1}`;
        monthly[monthKey] = (monthly[monthKey] || 0) + 1;
        quarterly[quarterKey] = (quarterly[quarterKey] || 0) + 1;

        if (["active", "refusal_active", "escalation_required", "pending_notification"].includes(status)) {
            active += 1;
        }

        const decisionAt = toIsoString(readString(workflow, "discharge_decision_at"));
        const escalatedAt = toIsoString(readString(workflow, "escalated_at"));
        if (decisionAt && escalatedAt) {
            const diff = new Date(escalatedAt).getTime() - new Date(decisionAt).getTime();
            if (diff >= 24 * 60 * 60 * 1000) {
                escalatedAfter24h += 1;
            }
        }

        const refusalStartedAt = toIsoString(readString(workflow, "refusal_started_at"));
        const closedAt = caseRecord.closedAt?.toISOString() || toIsoString(readString(workflow, "closed_at"));
        if (refusalStartedAt && closedAt) {
            const diff = new Date(closedAt).getTime() - new Date(refusalStartedAt).getTime();
            if (diff >= 0) {
                totalResolutionHours += diff / (60 * 60 * 1000);
                resolvedCount += 1;
            }
        }
    }

    return {
        total_refusal_cases: cases.length,
        active_refusal_cases: active,
        cases_escalated_after_24_hours: escalatedAfter24h,
        average_resolution_time_hours: resolvedCount > 0 ? Number((totalResolutionHours / resolvedCount).toFixed(2)) : 0,
        refusal_reasons_distribution: reasons,
        cases_by_department: departments,
        monthly_review_reports: monthly,
        quarterly_reports: quarterly,
    };
}

export function listMedicalLegalTemplates() {
    return {
        library: "Forms Library - Medical Legal Forms",
        templates: MEDICAL_LEGAL_TEMPLATES,
    };
}

function deriveLegalStatus(legalRecord: Record<string, unknown> | null, priority: LegalEscalationPriority): LegalEscalationStatus {
    const stored = toTitleCaseStatus(readString(legalRecord, "status") || "");
    if (stored !== "active") {
        return stored as LegalEscalationStatus;
    }
    if (readString(legalRecord, "resolved_at")) {
        return "resolved";
    }
    if (priority === "critical") {
        return "high-risk";
    }
    if (readString(legalRecord, "assigned_counsel")) {
        return "under-review";
    }
    return "active";
}

function mapLegalEscalationCase(caseRecord: RefusalCaseRecord): LegalEscalationCase | null {
    const metadata = asRecord(caseRecord.metadata);
    const workflow = getWorkflowRecord(metadata);
    const legalRecord = getLegalRecord(metadata);
    const escalatedAt =
        readString(legalRecord, "escalated_at") ||
        readString(workflow, "escalated_at") ||
        readString(metadata, "escalated_at");

    if (!escalatedAt && (readString(workflow, "status") || "").toLowerCase() !== "escalated") {
        return null;
    }

    const priority = toPriority(readString(legalRecord, "priority"));
    const status = deriveLegalStatus(legalRecord, priority);
    const notes = caseRecord.auditLogs
        .filter((item) => item.action === "legal_escalation_note_added")
        .map((item) => {
            const meta = asRecord(item.metadataJson);
            return {
                id: item.id,
                caseId: caseRecord.id,
                note: item.details || readString(meta, "note") || "",
                author: readString(meta, "author") || "System",
                authorRole: readString(meta, "author_role") || undefined,
                createdAt: item.createdAt.toISOString(),
            } satisfies LegalEscalationNote;
        });

    const auditTrail = caseRecord.auditLogs
        .filter((item) => LEGAL_AUDIT_ACTIONS.has(item.action))
        .map((item) => ({
            action: item.action,
            details: item.details || undefined,
            timestamp: item.createdAt.toISOString(),
            actor: undefined,
        }));

    return {
        id: caseRecord.id,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber || caseRecord.id.slice(0, 8),
        patientName: readString(workflow, "patient_name") || caseRecord.patientName || "-",
        status,
        priority,
        escalatedAt: toIsoString(escalatedAt) || caseRecord.updatedAt.toISOString(),
        assignedCounsel: readString(legalRecord, "assigned_counsel"),
        reason:
            readString(workflow, "refusal_reason") || readString(metadata, "refusal_reason") || caseRecord.title || "-",
        riskLevel: readString(legalRecord, "risk_level") || (priority === "critical" ? "Critical" : null),
        followUpDate: readString(legalRecord, "follow_up_date"),
        resolvedAt: readString(legalRecord, "resolved_at"),
        resolutionNotes: readString(legalRecord, "resolution_notes"),
        notes,
        auditTrail,
    };
}

async function getAuthorizedRefusalCase(auth: AuthContext, caseId: string): Promise<RefusalCaseRecord> {
    const prisma = getPrisma();
    const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        include: {
            auditLogs: {
                orderBy: { createdAt: "desc" },
                take: 100,
            },
        },
    });

    if (!caseRecord) {
        throw new ApiError(404, "Case not found");
    }
    if (caseRecord.tenantId !== auth.tenant_id) {
        throw new ApiError(403, "Tenant access denied");
    }
    if (!isRefusalCase(caseRecord)) {
        throw new ApiError(404, "Discharge refusal case not found");
    }

    return caseRecord;
}

function buildLegalMetadata(
    baseMetadata: Record<string, unknown> | null,
    updates: Record<string, unknown>,
): Prisma.InputJsonObject {
    const legalRecord = getLegalRecord(baseMetadata);
    const nextLegalRecord = {
        ...(legalRecord ?? {}),
        ...updates,
    } as Prisma.InputJsonObject;

    return {
        ...(baseMetadata ?? {}),
        legal_escalation: nextLegalRecord,
    } satisfies Prisma.InputJsonObject;
}

export async function listLegalEscalations(auth: AuthContext): Promise<LegalEscalationCase[]> {
    const tenantId = requireTenantId(auth);
    const cases = await findRefusalCases(tenantId, 500);
    return cases
        .map((caseRecord) => mapLegalEscalationCase(caseRecord))
        .filter((item): item is LegalEscalationCase => Boolean(item));
}

export async function getLegalEscalation(auth: AuthContext, caseId: string): Promise<LegalEscalationCase> {
    const caseRecord = await getAuthorizedRefusalCase(auth, caseId);
    const item = mapLegalEscalationCase(caseRecord);
    if (!item) {
        throw new ApiError(404, "Case is not escalated");
    }
    return item;
}

export async function addLegalEscalationNote(args: {
    auth: AuthContext;
    caseId: string;
    note: string;
    noteType?: string | null;
    author?: string | null;
    request: NextRequest;
}): Promise<LegalEscalationNote> {
    const caseRecord = await getAuthorizedRefusalCase(args.auth, args.caseId);
    const note = args.note.trim();
    if (!note) {
        throw new ApiError(400, "note is required");
    }

    const metadata = asRecord(caseRecord.metadata);
    await prisma.case.update({
        where: { id: caseRecord.id },
        data: {
            metadata: buildLegalMetadata(metadata, { updated_at: nowIso() }),
            updatedByUserId: args.auth.sub,
            version: { increment: 1 },
        },
    });

    await writeAuditLog({
        tenantId: requireTenantId(args.auth),
        userId: args.auth.sub,
        entityType: "case",
        entityId: caseRecord.id,
        action: "legal_escalation_note_added",
        details: note,
        caseId: caseRecord.id,
        metadataJson: {
            note,
            note_type: args.noteType || "legal",
            author: args.author || "Current User",
            author_role: args.auth.role || null,
        } as Prisma.InputJsonObject,
        request: args.request,
    });

    const createdAt = nowIso();
    return {
        id: `${caseRecord.id}:${createdAt}`,
        caseId: caseRecord.id,
        note,
        author: args.author || "Current User",
        authorRole: args.auth.role,
        createdAt,
    };
}

export async function updateLegalEscalationPriority(args: {
    auth: AuthContext;
    caseId: string;
    priority: string;
    request: NextRequest;
}): Promise<LegalEscalationCase> {
    const caseRecord = await getAuthorizedRefusalCase(args.auth, args.caseId);
    const priority = toPriority(args.priority);
    const metadata = asRecord(caseRecord.metadata);

    await prisma.case.update({
        where: { id: caseRecord.id },
        data: {
            metadata: buildLegalMetadata(metadata, {
                priority,
                status: priority === "critical" ? "high-risk" : undefined,
                updated_at: nowIso(),
            }),
            updatedByUserId: args.auth.sub,
            version: { increment: 1 },
        },
    });

    await writeAuditLog({
        tenantId: requireTenantId(args.auth),
        userId: args.auth.sub,
        entityType: "case",
        entityId: caseRecord.id,
        action: "legal_escalation_priority_updated",
        details: `Priority updated to ${priority}`,
        caseId: caseRecord.id,
        metadataJson: { priority } as Prisma.InputJsonObject,
        request: args.request,
    });

    return getLegalEscalation(args.auth, args.caseId);
}

export async function resolveLegalEscalation(args: {
    auth: AuthContext;
    caseId: string;
    resolutionNotes: string;
    closeCase: boolean;
    request: NextRequest;
}): Promise<LegalEscalationCase> {
    const caseRecord = await getAuthorizedRefusalCase(args.auth, args.caseId);
    const resolutionNotes = args.resolutionNotes.trim();
    if (!resolutionNotes) {
        throw new ApiError(400, "resolution_notes is required");
    }

    const metadata = asRecord(caseRecord.metadata);
    await prisma.case.update({
        where: { id: caseRecord.id },
        data: {
            status: args.closeCase ? CaseStatus.CLOSED : caseRecord.status,
            closedAt: args.closeCase ? new Date() : caseRecord.closedAt,
            metadata: buildLegalMetadata(metadata, {
                status: "resolved",
                resolved_at: nowIso(),
                resolution_notes: resolutionNotes,
                updated_at: nowIso(),
            }),
            updatedByUserId: args.auth.sub,
            version: { increment: 1 },
        },
    });

    await writeAuditLog({
        tenantId: requireTenantId(args.auth),
        userId: args.auth.sub,
        entityType: "case",
        entityId: caseRecord.id,
        action: "legal_escalation_resolved",
        details: resolutionNotes,
        caseId: caseRecord.id,
        metadataJson: {
            close_case: args.closeCase,
            resolution_notes: resolutionNotes,
        } as Prisma.InputJsonObject,
        request: args.request,
    });

    return getLegalEscalation(args.auth, args.caseId);
}