// apps/web/app/api/operations/dashboard/route.ts

import { SlaState } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { DEPARTMENT_LABELS, runSlaSweepForTenant } from "@/lib/server/operations";

type DepartmentStatus = "on_track" | "at_risk" | "breached";

type PendingDepartmentItem = {
  department: string;
  label: string;
  count: number;
  breachCount: number;
  status: DepartmentStatus;
};

type AverageCycleTimeDepartmentItem = {
  department: string;
  label: string;
  averageHours: number;
};

type ThroughputTrendItem = {
  day: string;
  opened: number;
  closed: number;
};

type BottleneckItem = {
  stage: string;
  count: number;
};

type TimelineAgingItem = {
  bucket: "0-2h" | "2-8h" | "8-24h" | ">24h";
  count: number;
};

type DashboardPayload = {
  generatedAt: string;
  summary: {
    totalActiveCases: number;
    delayedCases: number;
    atRiskCases: number;
    withinSlaCases: number;
    escalatedCases: number;
    unassignedCases: number;
    completionRate: number;
    averageDischargeHours: number;
  };
  pendingByDepartment: PendingDepartmentItem[];
  averageCycleTimeByDepartment: AverageCycleTimeDepartmentItem[];
  throughputTrend: ThroughputTrendItem[];
  bottlenecks: BottleneckItem[];
  timelineAging: TimelineAgingItem[];
};

function startOfDayOffset(offset: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offset,
      0,
      0,
      0,
      0,
    ),
  );
}

function roundToOneDecimal(value: number): number {
  return Number(value.toFixed(1));
}

function getDepartmentStatus(
  count: number,
  breachCount: number,
  hasAtRisk: boolean,
): DepartmentStatus {
  if (breachCount > 0) return "breached";
  if (count > 0 && hasAtRisk) return "at_risk";
  return "on_track";
}

function emptyDashboardPayload(): DashboardPayload {
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
    pendingByDepartment: Object.entries(DEPARTMENT_LABELS).map(
      ([department, label]) => ({
        department,
        label,
        count: 0,
        breachCount: 0,
        status: "on_track",
      }),
    ),
    averageCycleTimeByDepartment: Object.entries(DEPARTMENT_LABELS).map(
      ([department, label]) => ({
        department,
        label,
        averageHours: 0,
      }),
    ),
    throughputTrend: [...Array(7)].map((_, index) => {
      const dayStart = startOfDayOffset(index - 6);
      return {
        day: dayStart.toISOString().slice(0, 10),
        opened: 0,
        closed: 0,
      };
    }),
    bottlenecks: [],
    timelineAging: [
      { bucket: "0-2h", count: 0 },
      { bucket: "2-8h", count: 0 },
      { bucket: "8-24h", count: 0 },
      { bucket: ">24h", count: 0 },
    ],
  };
}

export async function GET(_request: NextRequest) {
  try {
    const prisma = getPrisma();
    const auth = await requireAuth(_request);
    const tenantId = requireTenantId(auth);

    await runSlaSweepForTenant(tenantId);

    const [states, cases] = await Promise.all([
      getPrisma().caseOperationState.findMany({
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
      getPrisma().case.findMany({
        where: { tenantId },
        select: {
          id: true,
          createdAt: true,
          closedAt: true,
        },
      }),
    ]);

    const activeStates = states.filter((item) => item.status !== "CLOSED");

    const totalActiveCases = activeStates.length;
    const delayedCases = activeStates.filter(
      (item) => item.slaState === SlaState.BREACHED,
    ).length;
    const atRiskCases = activeStates.filter(
      (item) => item.slaState === SlaState.AT_RISK,
    ).length;
    const withinSlaCases = activeStates.filter(
      (item) => item.slaState === SlaState.ON_TRACK,
    ).length;
    const escalatedCases = activeStates.filter(
      (item) => item.escalationLevel !== "NONE",
    ).length;
    const unassignedCases = activeStates.filter(
      (item) => !item.assignedToUserId,
    ).length;

    const pendingByDepartmentMap = new Map<string, number>();
    for (const state of activeStates) {
      pendingByDepartmentMap.set(
        state.assignedDepartment,
        (pendingByDepartmentMap.get(state.assignedDepartment) ?? 0) + 1,
      );
    }

    const pendingByDepartment: PendingDepartmentItem[] = Object.entries(
      DEPARTMENT_LABELS,
    ).map(([department, label]) => {
      const departmentStates = activeStates.filter(
        (item) => item.assignedDepartment === department,
      );

      const count = pendingByDepartmentMap.get(department) ?? 0;
      const breachCount = departmentStates.filter(
        (item) => item.slaState === SlaState.BREACHED,
      ).length;
      const hasAtRisk = departmentStates.some(
        (item) => item.slaState === SlaState.AT_RISK,
      );

      return {
        department,
        label,
        count,
        breachCount,
        status: getDepartmentStatus(count, breachCount, hasAtRisk),
      };
    });

    const closedCases = cases.filter((item) => item.closedAt).length;
    const completionRate = cases.length
      ? Math.round((closedCases / cases.length) * 100)
      : 0;

    const dischargeTimesHours = cases
      .filter((item) => item.closedAt)
      .map(
        (item) =>
          (item.closedAt!.getTime() - item.createdAt.getTime()) / 3_600_000,
      );

    const averageDischargeHours = dischargeTimesHours.length
      ? roundToOneDecimal(
          dischargeTimesHours.reduce((sum, value) => sum + value, 0) /
            dischargeTimesHours.length,
        )
      : 0;

    const averageCycleTimeByDepartment: AverageCycleTimeDepartmentItem[] =
      pendingByDepartment.map((item) => {
        const statesInDept = activeStates.filter(
          (state) => state.assignedDepartment === item.department,
        );

        const averageHours = statesInDept.length
          ? roundToOneDecimal(
              statesInDept.reduce(
                (sum, state) => sum + (state.waitingTimeMinutes ?? 0),
                0,
              ) /
                statesInDept.length /
                60,
            )
          : 0;

        return {
          department: item.department,
          label: item.label,
          averageHours,
        };
      });

    const throughputTrend: ThroughputTrendItem[] = [...Array(7)].map(
      (_, index) => {
        const dayStart = startOfDayOffset(index - 6);
        const nextDay = startOfDayOffset(index - 5);

        const opened = cases.filter(
          (item) => item.createdAt >= dayStart && item.createdAt < nextDay,
        ).length;

        const closed = cases.filter(
          (item) =>
            item.closedAt &&
            item.closedAt >= dayStart &&
            item.closedAt < nextDay,
        ).length;

        return {
          day: dayStart.toISOString().slice(0, 10),
          opened,
          closed,
        };
      },
    );

    const bottleneckMap = new Map<string, number>();
    for (const state of activeStates.filter(
      (item) => item.slaState === SlaState.BREACHED,
    )) {
      bottleneckMap.set(
        state.currentStage,
        (bottleneckMap.get(state.currentStage) ?? 0) + 1,
      );
    }

    const bottlenecks: BottleneckItem[] = [...bottleneckMap.entries()]
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const timelineAging: TimelineAgingItem[] = [
      {
        bucket: "0-2h",
        count: activeStates.filter(
          (item) => (item.waitingTimeMinutes ?? 0) <= 120,
        ).length,
      },
      {
        bucket: "2-8h",
        count: activeStates.filter((item) => {
          const minutes = item.waitingTimeMinutes ?? 0;
          return minutes > 120 && minutes <= 480;
        }).length,
      },
      {
        bucket: "8-24h",
        count: activeStates.filter((item) => {
          const minutes = item.waitingTimeMinutes ?? 0;
          return minutes > 480 && minutes <= 1440;
        }).length,
      },
      {
        bucket: ">24h",
        count: activeStates.filter(
          (item) => (item.waitingTimeMinutes ?? 0) > 1440,
        ).length,
      },
    ];

    const payload: DashboardPayload = {
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
      throughputTrend,
      bottlenecks,
      timelineAging,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("OPERATIONS_DASHBOARD_GET_FAILED", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof ApiError) {
      return handleApiError(error);
    }

    return NextResponse.json(emptyDashboardPayload(), { status: 200 });
  }
}
