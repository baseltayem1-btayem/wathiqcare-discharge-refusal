import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { DEPARTMENT_LABELS } from "@/lib/server/operations";
import { getPrisma } from "@/lib/server/prisma";

type RouteContext = { params: Promise<{ caseId: string }> };

<<<<<<< HEAD
export async function GET(request: NextRequest, { params }: RouteContext) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;

    const [state, steps, assignments] = await Promise.all([
        prisma.caseOperationState.findFirst({
            where: { tenantId, caseId },
        }),
        prisma.caseStepEvent.findMany({
            where: { tenantId, caseId },
            include: {
                actor: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        }),
        prisma.caseAssignmentHistory.findMany({
            where: { tenantId, caseId },
            include: {
                reassignedBy: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { reassignedAt: "asc" },
        }),
    ]);

    return NextResponse.json({
        state: state
            ? {
                ...state,
                assignedDepartmentLabel: DEPARTMENT_LABELS[state.assignedDepartment],
            }
            : null,
        steps: steps.map((step) => ({
            id: step.id,
            stageCode: step.stageCode,
            stepCode: step.stepCode,
            action: step.action,
            createdAt: step.createdAt,
            actor: step.actor,
            actorDepartment: step.actorDepartment,
            actorDepartmentLabel: step.actorDepartment ? DEPARTMENT_LABELS[step.actorDepartment] : null,
            oldValue: step.oldValue,
            newValue: step.newValue,
        })),
        assignments: assignments.map((entry) => ({
            id: entry.id,
            fromUserId: entry.fromUserId,
            toUserId: entry.toUserId,
            fromDepartment: entry.fromDepartment,
            toDepartment: entry.toDepartment,
            fromDepartmentLabel: entry.fromDepartment ? DEPARTMENT_LABELS[entry.fromDepartment] : null,
            toDepartmentLabel: DEPARTMENT_LABELS[entry.toDepartment],
            reason: entry.reason,
            reassignedAt: entry.reassignedAt,
            reassignedBy: entry.reassignedBy,
        })),
    });
} catch (error) {
    return handleApiError(error);
}
}
