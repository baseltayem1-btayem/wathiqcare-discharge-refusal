import { SlaState } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { DEPARTMENT_LABELS, runSlaSweepForTenant } from "@/lib/server/operations";

function startOfDayOffset(offset: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
}

function emptyDashboardPayload() {
    return {
        generatedAt: new Date().toISOString(),
        summary: {
            totalActiveCases: 0,
            delayedCases: 0,
            atRiskCases: 0,
            withinSlaCases: 0,
            escalatedCases: 0,
            unassignedCases: 0,
            completionRate: 0,
            averageDischargeHours: 0,
        },
        pendingByDepartment: Object.entries(DEPARTMENT_LABELS).map(([department, label]) => ({
            department,
            label,
            count: 0,
            breachCount: 0,
            status: "on_track",
        })),
        averageCycleTimeByDepartment: Object.entries(DEPARTMENT_LABELS).map(([department, label]) => ({
            department,
            label,
            averageHours: 0,
        })),
        throughputTrend: [...Array(7)].map((_, index) => {
            const dayStart = startOfDayOffset(index - 6);
            return {
                day: dayStart.toISOString().slice(0, 10),
                opened: 0,
                closed: 0,
            };
        }),
        bottlenecks: [] as Array<{ stage: string; count: number }>,
        timelineAging: [
            { bucket: "0-2h", count: 0 },
            { bucket: "2-8h", count: 0 },
            { bucket: "8-24h", count: 0 },
            { bucket: ">24h", count: 0 },
        ],
    };
}

try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    await runSlaSweepForTenant(tenantId);

    const [states, cases] = await Promise.all([
        prisma.caseOperationState.findMany({
            where: { tenantId },
            select: {
                caseId: true,
                assignedDepartment: true,
                assignedToUserId: true,
                status: true,
                slaState: true,
                waitingTimeMinutes: true,
                escalationLevel: true,
                currentStage: true,
                createdAt: true,
                updatedAt: true,
                completedStepsCount: true,
                totalStepsCount: true,
            },
        }),
        prisma.case.findMany({
            where: { tenantId },
            select: { id: true, createdAt: true, closedAt: true },
        }),
    ]);

    const activeStates = states.filter((item) => item.status !== "CLOSED");
    const totalActiveCases = activeStates.length;
    const delayedCases = activeStates.filter((item) => item.slaState === SlaState.BREACHED).length;
    const atRiskCases = activeStates.filter((item) => item.slaState === SlaState.AT_RISK).length;
    const withinSlaCases = activeStates.filter((item) => item.slaState === SlaState.ON_TRACK).length;
    const escalatedCases = activeStates.filter((item) => item.escalationLevel !== "NONE").length;
    const unassignedCases = activeStates.filter((item) => !item.assignedToUserId).length;

    const pendingByDepartmentMap = new Map<string, number>();
    for (const state of activeStates) {
        pendingByDepartmentMap.set(state.assignedDepartment, (pendingByDepartmentMap.get(state.assignedDepartment) || 0) + 1);
    }

    const pendingByDepartment = Object.entries(DEPARTMENT_LABELS).map(([key, label]) => {
        const count = pendingByDepartmentMap.get(key) || 0;
        const breachCount = activeStates.filter(
            (item) => item.assignedDepartment === key && item.slaState === SlaState.BREACHED,
        ).length;
        const status = breachCount > 0 ? "breached" : count > 0 && activeStates.some((item) => item.assignedDepartment === key && item.slaState === SlaState.AT_RISK) ? "at_risk" : "on_track";
        return { department: key, label, count, breachCount, status };
    });

    const closedCases = cases.filter((item) => item.closedAt).length;
    const completionRate = cases.length ? Math.round((closedCases / cases.length) * 100) : 0;

    const dischargeTimesHours = cases
        .filter((item) => item.closedAt)
        .map((item) => ((item.closedAt!.getTime() - item.createdAt.getTime()) / 3600000));

    const averageDischargeHours = dischargeTimesHours.length
        ? Number((dischargeTimesHours.reduce((sum, value) => sum + value, 0) / dischargeTimesHours.length).toFixed(1))
        : 0;

    const averageCycleTimeByDepartment = pendingByDepartment.map((item) => {
        const statesInDept = activeStates.filter((state) => state.assignedDepartment === item.department);
        const avg = statesInDept.length
            ? Number((statesInDept.reduce((sum, state) => sum + (state.waitingTimeMinutes ?? 0), 0) / statesInDept.length / 60).toFixed(1))
            : 0;
        return { department: item.department, label: item.label, averageHours: avg };
    });

    const days = [...Array(7)].map((_, index) => {
        const dayStart = startOfDayOffset(index - 6);
        const nextDay = startOfDayOffset(index - 5);
        const opened = cases.filter((item) => item.createdAt >= dayStart && item.createdAt < nextDay).length;
        const closed = cases.filter((item) => item.closedAt && item.closedAt >= dayStart && item.closedAt < nextDay).length;
        return {
            day: dayStart.toISOString().slice(0, 10),
            opened,
            closed,
        };
    });

    const bottleneckMap = new Map<string, number>();
    for (const state of activeStates.filter((item) => item.slaState === SlaState.BREACHED)) {
        bottleneckMap.set(state.currentStage, (bottleneckMap.get(state.currentStage) || 0) + 1);
    }
    const bottlenecks = [...bottleneckMap.entries()]
        .map(([stage, count]) => ({ stage, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

    const timelineAging = [
        { bucket: "0-2h", count: activeStates.filter((item) => (item.waitingTimeMinutes ?? 0) <= 120).length },
        { bucket: "2-8h", count: activeStates.filter((item) => (item.waitingTimeMinutes ?? 0) > 120 && (item.waitingTimeMinutes ?? 0) <= 480).length },
        { bucket: "8-24h", count: activeStates.filter((item) => (item.waitingTimeMinutes ?? 0) > 480 && (item.waitingTimeMinutes ?? 0) <= 1440).length },
        { bucket: ">24h", count: activeStates.filter((item) => (item.waitingTimeMinutes ?? 0) > 1440).length },
    ];

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        summary: {
            totalActiveCases,
            delayedCases,
            atRiskCases,
            withinSlaCases,
            escalatedCases,
            unassignedCases,
            completionRate,
            averageDischargeHours,
        },
        pendingByDepartment,
        averageCycleTimeByDepartment,
        throughputTrend: days,
        bottlenecks,
        timelineAging,
    });
} catch (error) {
    console.error("OPERATIONS_DASHBOARD_GET_FAILED", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof ApiError) {
        return handleApiError(error);
    }

    return NextResponse.json(emptyDashboardPayload());
}
}
