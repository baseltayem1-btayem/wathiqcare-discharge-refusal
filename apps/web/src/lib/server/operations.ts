import {
    EscalationLevel,
    NotificationChannel,
    NotificationStatus,
    OperationDepartment,
    OperationPriority,
    Prisma,
    SlaState,
} from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

export const DEPARTMENT_LABELS: Record<OperationDepartment, string> = {
    PHARMACY: "Pharmacy",
    NURSING: "Nursing",
    LEGAL: "Legal",
    LABORATORY: "Laboratory",
    RADIOLOGY: "Radiology",
    CASE_MANAGEMENT: "Case Management",
    PATIENT_RELATIONS: "Patient Relations",
    BILLING_INSURANCE: "Billing & Insurance",
    ADMIN_MEDICAL_DIRECTOR: "Admin / Medical Director",
};

const ALL_DEPARTMENTS = Object.values(OperationDepartment);

export function parseOperationDepartment(input: string | null | undefined): OperationDepartment {
    const normalized = (input || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if ((ALL_DEPARTMENTS as string[]).includes(normalized)) {
        return normalized as OperationDepartment;
    }
    throw new ApiError(400, `Invalid department: ${input || "unknown"}`);
}

export function roleHasCrossDepartmentVisibility(role: string | null | undefined): boolean {
    const normalized = (role || "").toLowerCase();
    return ["platform_superadmin", "platform_admin", "tenant_owner", "tenant_admin", "medical_director"].includes(normalized);
}

const WORKFLOW_STEPS = [
    "case_created",
    "clinical_review",
    "communication",
    "social_support",
    "form_generation",
    "financial_notice",
    "closure",
] as const;

export function departmentForRole(role: string | null | undefined): OperationDepartment {
    const normalized = (role || "").toLowerCase();
    if (normalized.includes("pharmacy")) return OperationDepartment.PHARMACY;
    if (normalized.includes("nurs")) return OperationDepartment.NURSING;
    if (normalized.includes("legal")) return OperationDepartment.LEGAL;
    if (normalized.includes("lab")) return OperationDepartment.LABORATORY;
    if (normalized.includes("radio")) return OperationDepartment.RADIOLOGY;
    if (normalized.includes("patient_affairs") || normalized.includes("relations")) return OperationDepartment.PATIENT_RELATIONS;
    if (normalized.includes("billing") || normalized.includes("insurance")) return OperationDepartment.BILLING_INSURANCE;
    if (normalized.includes("platform") || normalized.includes("director") || normalized.includes("admin")) {
        return OperationDepartment.ADMIN_MEDICAL_DIRECTOR;
    }
    return OperationDepartment.CASE_MANAGEMENT;
}

function minutesBetween(from: Date, to: Date): number {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function slaStateFromDeadline(deadline: Date | null, now = new Date()): SlaState {
    if (!deadline) return SlaState.ON_TRACK;
    const minutesLeft = minutesBetween(now, deadline);
    if (minutesLeft <= 0) return SlaState.BREACHED;
    if (minutesLeft <= 60) return SlaState.AT_RISK;
    return SlaState.ON_TRACK;
}

async function resolveSlaDeadline(args: {
    tenantId: string;
    department: OperationDepartment;
    stepCode: string;
    now: Date;
}): Promise<Date> {
    const config = await getPrisma().departmentSlaConfig.findUnique({
        where: {
            tenantId_department_stepCode: {
                tenantId: args.tenantId,
                department: args.department,
                stepCode: args.stepCode,
            },
        },
    });

    const targetMinutes = config?.targetMinutes ?? 240;
    return new Date(args.now.getTime() + targetMinutes * 60000);
}

export async function ensureOperationStateForCase(args: {
    tenantId: string;
    caseId: string;
    actorUserId: string;
    actorRole?: string | null;
    priority?: OperationPriority;
}): Promise<void> {
    const now = new Date();
    const assignedDepartment = departmentForRole(args.actorRole);
    const slaDeadline = await resolveSlaDeadline({
        tenantId: args.tenantId,
        department: assignedDepartment,
        stepCode: "case_created",
        now,
    });

    await getPrisma().caseOperationState.upsert({
        where: { caseId: args.caseId },
        update: {
            lastActionAt: now,
            lastActionByUserId: args.actorUserId,
        },
        create: {
            tenantId: args.tenantId,
            caseId: args.caseId,
            currentStage: "CASE_CREATED",
            currentStep: "case_created",
            assignedToUserId: args.actorUserId,
            assignedDepartment,
            assignmentTimestamp: now,
            waitingTimeMinutes: 0,
            priority: args.priority ?? OperationPriority.NORMAL,
            slaDeadline,
            slaState: slaStateFromDeadline(slaDeadline),
            escalationLevel: EscalationLevel.NONE,
            lastActionAt: now,
            lastActionByUserId: args.actorUserId,
            completedStepsCount: 1,
            totalStepsCount: WORKFLOW_STEPS.length,
            status: "OPEN",
        },
    });
}

export async function createOperationNotification(args: {
    tenantId: string;
    caseId?: string | null;
    recipientUserId: string;
    triggeredByUserId?: string | null;
    eventType: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    sendEmail?: boolean;
}): Promise<void> {
    const now = new Date();

    await getPrisma().operationNotification.createMany({
        data: [
            {
                tenantId: args.tenantId,
                caseId: args.caseId,
                recipientUserId: args.recipientUserId,
                triggeredByUserId: args.triggeredByUserId ?? null,
                channel: NotificationChannel.IN_APP,
                eventType: args.eventType,
                title: args.title,
                message: args.message,
                status: NotificationStatus.SENT,
                sentAt: now,
                metadata: args.metadata as Prisma.InputJsonValue | undefined,
            },
            ...(args.sendEmail
                ? [
                    {
                        tenantId: args.tenantId,
                        caseId: args.caseId,
                        recipientUserId: args.recipientUserId,
                        triggeredByUserId: args.triggeredByUserId ?? null,
                        channel: NotificationChannel.EMAIL,
                        eventType: args.eventType,
                        title: args.title,
                        message: args.message,
                        status: NotificationStatus.SENT,
                        sentAt: now,
                        metadata: args.metadata as Prisma.InputJsonValue | undefined,
                    },
                ]
                : []),
        ],
    });
}

export async function assignCaseOperation(args: {
    tenantId: string;
    caseId: string;
    actorUserId: string;
    actorRole?: string | null;
    toUserId?: string | null;
    toDepartment: OperationDepartment;
    reason?: string;
    priority?: OperationPriority;
}): Promise<void> {
    const now = new Date();

    const currentState = await getPrisma().caseOperationState.findUnique({ where: { caseId: args.caseId } });
    if (!currentState) {
        throw new ApiError(404, "Operational state not initialized for this case");
    }

    const slaDeadline = await resolveSlaDeadline({
        tenantId: args.tenantId,
        department: args.toDepartment,
        stepCode: currentState.currentStep,
        now,
    });

    const nextState = await getPrisma().caseOperationState.update({
        where: { caseId: args.caseId },
        data: {
            assignedToUserId: args.toUserId ?? null,
            assignedDepartment: args.toDepartment,
            assignmentTimestamp: now,
            waitingTimeMinutes: 0,
            priority: args.priority ?? currentState.priority,
            slaDeadline,
            slaState: slaStateFromDeadline(slaDeadline, now),
            lastActionAt: now,
            lastActionByUserId: args.actorUserId,
        },
    });

    await getPrisma().caseAssignmentHistory.create({
        data: {
            tenantId: args.tenantId,
            caseId: args.caseId,
            fromUserId: currentState.assignedToUserId,
            toUserId: args.toUserId ?? null,
            fromDepartment: currentState.assignedDepartment,
            toDepartment: args.toDepartment,
            reason: args.reason ?? null,
            reassignedByUserId: args.actorUserId,
            reassignedAt: now,
        },
    });

    await writeAuditLog({
        tenantId: args.tenantId,
        userId: args.actorUserId,
        entityType: "case_operation",
        entityId: args.caseId,
        caseId: args.caseId,
        action: currentState.assignedToUserId ? "case_reassigned" : "case_assigned",
        details: `Assignment moved from ${currentState.assignedDepartment} to ${args.toDepartment}`,
        metadataJson: {
            reason: args.reason,
            old: {
                assigned_to: currentState.assignedToUserId,
                assigned_department: currentState.assignedDepartment,
            },
            next: {
                assigned_to: nextState.assignedToUserId,
                assigned_department: nextState.assignedDepartment,
            },
        },
    });

    if (args.toUserId) {
        await createOperationNotification({
            tenantId: args.tenantId,
            caseId: args.caseId,
            recipientUserId: args.toUserId,
            triggeredByUserId: args.actorUserId,
            eventType: currentState.assignedToUserId ? "case_reassigned" : "case_assigned",
            title: currentState.assignedToUserId ? "Case reassigned" : "Case assigned",
            message: `Case was assigned to ${DEPARTMENT_LABELS[args.toDepartment]}`,
            metadata: { caseId: args.caseId, toDepartment: args.toDepartment },
            sendEmail: true,
        });
    }
}

export async function recordCaseStepAction(args: {
    tenantId: string;
    caseId: string;
    actorUserId: string;
    actorRole?: string | null;
    action: "step_completed" | "step_returned" | "delay_detected" | "sla_breached" | "escalation_triggered" | "case_closed";
    stageCode: string;
    stepCode: string;
    nextDepartment?: OperationDepartment;
    reason?: string;
}): Promise<void> {
    const now = new Date();
    const state = await getPrisma().caseOperationState.findUnique({ where: { caseId: args.caseId } });
    if (!state) {
        throw new ApiError(404, "Operational state not found");
    }

    const completedSteps = args.action === "step_completed"
        ? Math.min(state.completedStepsCount + 1, state.totalStepsCount)
        : state.completedStepsCount;

    const escalationLevel = args.action === "escalation_triggered"
        ? state.escalationLevel === EscalationLevel.NONE
            ? EscalationLevel.SUPERVISOR
            : state.escalationLevel === EscalationLevel.SUPERVISOR
                ? EscalationLevel.MANAGER
                : EscalationLevel.DIRECTOR
        : state.escalationLevel;

    const assignedDepartment = args.nextDepartment ?? state.assignedDepartment;
    const slaDeadline = await resolveSlaDeadline({
        tenantId: args.tenantId,
        department: assignedDepartment,
        stepCode: args.stepCode,
        now,
    });

    const nextSlaState = args.action === "sla_breached"
        ? SlaState.BREACHED
        : args.action === "delay_detected"
            ? SlaState.AT_RISK
            : slaStateFromDeadline(slaDeadline, now);

    await getPrisma().caseOperationState.update({
        where: { caseId: args.caseId },
        data: {
            currentStage: args.stageCode,
            currentStep: args.stepCode,
            assignedDepartment,
            waitingTimeMinutes: 0,
            slaDeadline,
            slaState: nextSlaState,
            escalationLevel,
            lastActionAt: now,
            lastActionByUserId: args.actorUserId,
            completedStepsCount: completedSteps,
            status: args.action === "case_closed" ? "CLOSED" : state.status,
        },
    });

    await getPrisma().caseStepEvent.create({
        data: {
            tenantId: args.tenantId,
            caseId: args.caseId,
            stepCode: args.stepCode,
            stageCode: args.stageCode,
            action: args.action,
            oldValue: {
                current_stage: state.currentStage,
                current_step: state.currentStep,
                assigned_department: state.assignedDepartment,
                sla_state: state.slaState,
                escalation_level: state.escalationLevel,
            },
            newValue: {
                current_stage: args.stageCode,
                current_step: args.stepCode,
                assigned_department: assignedDepartment,
                sla_state: nextSlaState,
                escalation_level: escalationLevel,
            },
            actorUserId: args.actorUserId,
            actorDepartment: departmentForRole(args.actorRole),
            createdAt: now,
        },
    });

    await writeAuditLog({
        tenantId: args.tenantId,
        userId: args.actorUserId,
        entityType: "case_operation",
        entityId: args.caseId,
        caseId: args.caseId,
        action: args.action,
        details: args.reason || `Action ${args.action} on step ${args.stepCode}`,
        metadataJson: {
            stageCode: args.stageCode,
            stepCode: args.stepCode,
            assignedDepartment,
            escalationLevel,
            slaState: nextSlaState,
        },
    });

    if (args.action === "sla_breached" || args.action === "escalation_triggered") {
        const recipients = await getPrisma().user.findMany({
            where: {
                tenantId: args.tenantId,
                isActive: true,
                role: { in: ["platform_superadmin", "platform_admin", "tenant_owner", "tenant_admin"] },
            },
            select: { id: true },
            take: 20,
        });

        await Promise.all(
            recipients.map((recipient) =>
                createOperationNotification({
                    tenantId: args.tenantId,
                    caseId: args.caseId,
                    recipientUserId: recipient.id,
                    triggeredByUserId: args.actorUserId,
                    eventType: args.action,
                    title: args.action === "sla_breached" ? "SLA breached" : "Escalation triggered",
                    message: `Case ${args.caseId} requires immediate managerial attention`,
                    metadata: { stageCode: args.stageCode, stepCode: args.stepCode },
                    sendEmail: true,
                }),
            ),
        );
    }
}

export async function runSlaSweepForTenant(tenantId: string): Promise<{ atRisk: number; breached: number }> {
    const now = new Date();
    const states = await getPrisma().caseOperationState.findMany({
        where: {
            tenantId,
            status: { not: "CLOSED" },
            slaDeadline: { not: null },
        },
        select: {
            caseId: true,
            slaDeadline: true,
            slaState: true,
            assignedToUserId: true,
            currentStage: true,
            currentStep: true,
        },
        take: 500,
    });

    let atRisk = 0;
    let breached = 0;

    for (const state of states) {
        const nextState = slaStateFromDeadline(state.slaDeadline, now);
        if (nextState === state.slaState) {
            if (nextState === SlaState.AT_RISK) atRisk += 1;
            if (nextState === SlaState.BREACHED) breached += 1;
            continue;
        }

        await getPrisma().caseOperationState.update({
            where: { caseId: state.caseId },
            data: { slaState: nextState, waitingTimeMinutes: minutesBetween(state.slaDeadline ?? now, now) },
        });

        if (nextState === SlaState.AT_RISK) {
            atRisk += 1;
        }
        if (nextState === SlaState.BREACHED) {
            breached += 1;
            if (state.assignedToUserId) {
                await createOperationNotification({
                    tenantId,
                    caseId: state.caseId,
                    recipientUserId: state.assignedToUserId,
                    eventType: "sla_breached",
                    title: "SLA breached",
                    message: `Case ${state.caseId} breached SLA at stage ${state.currentStage}`,
                    metadata: { currentStep: state.currentStep },
                    sendEmail: true,
                });
            }
        }
    }

    return { atRisk, breached };
}
