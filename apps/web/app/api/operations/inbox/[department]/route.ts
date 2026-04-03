import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
    DEPARTMENT_LABELS,
    departmentForRole,
    parseOperationDepartment,
    roleHasCrossDepartmentVisibility,
    runSlaSweepForTenant,
} from "@/lib/server/operations";

type RouteContext = { params: Promise<{ department: string }> };

function startOfDayOffset(offset: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

export async function GET(request: NextRequest, { params }: RouteContext) {
try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { department: departmentParam } = await params;
    const requestedDepartment = parseOperationDepartment(departmentParam);

    const canAccessAllDepartments = hasPlatformAccess(auth) || roleHasCrossDepartmentVisibility(auth.role);
    const ownDepartment = departmentForRole(auth.role);
    const effectiveDepartment = canAccessAllDepartments ? requestedDepartment : ownDepartment;

    await runSlaSweepForTenant(tenantId);

    const url = new URL(request.url);
    const assigned = url.searchParams.get("assigned");
    const status = url.searchParams.get("status")?.trim();
    const priority = url.searchParams.get("priority")?.trim();
    const sla = url.searchParams.get("sla")?.trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "200"), 1), 500);

    const caseStates = await prisma.caseOperationState.findMany({
        where: {
            tenantId,
            assignedDepartment: effectiveDepartment,
            ...(assigned === "assigned" ? { assignedToUserId: { not: null } } : {}),
            ...(assigned === "unassigned" ? { assignedToUserId: null } : {}),
            ...(status ? { status } : {}),
            ...(priority ? { priority: priority as never } : {}),
            ...(sla ? { slaState: sla as never } : {}),
        },
        include: {
            case: {
                select: {
                    id: true,
                    caseNumber: true,
                    title: true,
                    patientName: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                },
            },
        },
        orderBy: [
            { slaDeadline: "asc" },
            { priority: "desc" },
            { updatedAt: "desc" },
        ],
        take: limit,
    });

    const breachEvents = await prisma.caseStepEvent.findMany({
        where: {
            tenantId,
            actorDepartment: effectiveDepartment,
            action: { in: ["sla_breached", "escalation_triggered"] },
            createdAt: { gte: startOfDayOffset(-6) },
        },
        select: {
            action: true,
            createdAt: true,
        },
    });

    const now = Date.now();
    const items = caseStates.map((item) => ({
        caseId: item.caseId,
        caseNumber: item.case.caseNumber,
        title: item.case.title,
        patientName: item.case.patientName,
        currentStage: item.currentStage,
        currentStep: item.currentStep,
        assignedDepartment: item.assignedDepartment,
        assignedDepartmentLabel: DEPARTMENT_LABELS[item.assignedDepartment],
        status: item.status,
        priority: item.priority,
        slaState: item.slaState,
        escalationLevel: item.escalationLevel,
        waitingTimeMinutes: item.waitingTimeMinutes,
        assignedAt: item.assignmentTimestamp,
        lastActionAt: item.lastActionAt,
        assignedTo: item.assignedTo,
        timeToSlaMinutes: item.slaDeadline ? Math.floor((item.slaDeadline.getTime() - now) / 60000) : null,
    }));

    const agingBuckets = [
        { bucket: "0-2h", count: items.filter((item) => item.waitingTimeMinutes <= 120).length },
        { bucket: "2-8h", count: items.filter((item) => item.waitingTimeMinutes > 120 && item.waitingTimeMinutes <= 480).length },
        { bucket: "8-24h", count: items.filter((item) => item.waitingTimeMinutes > 480 && item.waitingTimeMinutes <= 1440).length },
        { bucket: ">24h", count: items.filter((item) => item.waitingTimeMinutes > 1440).length },
    ];

    const breachTrend = [...Array(7)].map((_, index) => {
        const dayStart = startOfDayOffset(index - 6);
        const nextDay = startOfDayOffset(index - 5);
        const dayEvents = breachEvents.filter((event) => event.createdAt >= dayStart && event.createdAt < nextDay);

        return {
            day: dayStart.toISOString().slice(0, 10),
            breaches: dayEvents.filter((event) => event.action === "sla_breached").length,
            escalations: dayEvents.filter((event) => event.action === "escalation_triggered").length,
        };
    });

    return NextResponse.json({
        department: effectiveDepartment,
        label: DEPARTMENT_LABELS[effectiveDepartment],
        canAccessAllDepartments,
        items,
        analytics: {
            agingBuckets,
            breachTrend,
        },
        summary: {
            total: items.length,
            overdue: items.filter((item) => item.slaState === "BREACHED").length,
            atRisk: items.filter((item) => item.slaState === "AT_RISK").length,
            unassigned: items.filter((item) => !item.assignedTo).length,
        },
    });
} catch (error) {
    return handleApiError(error);
}
}
