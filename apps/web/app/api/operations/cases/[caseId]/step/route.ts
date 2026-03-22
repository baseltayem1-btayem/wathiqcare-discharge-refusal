import { NextRequest, NextResponse } from "next/server";
import {
    hasOperationsEscalationPermission,
    hasOperationsStepPermission,
} from "@/lib/operations/permissions";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { parseOperationDepartment, recordCaseStepAction } from "@/lib/server/operations";

type RouteContext = { params: Promise<{ caseId: string }> };

type StepAction =
    | "step_completed"
    | "step_returned"
    | "delay_detected"
    | "sla_breached"
    | "escalation_triggered"
    | "case_closed";

const ALLOWED_ACTIONS = new Set<StepAction>([
    "step_completed",
    "step_returned",
    "delay_detected",
    "sla_breached",
    "escalation_triggered",
    "case_closed",
]);

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);
        const { caseId } = await params;

        const body = (await request.json().catch(() => null)) as
            | {
                action?: StepAction;
                stageCode?: string;
                stepCode?: string;
                reason?: string;
                nextDepartment?: string;
            }
            | null;

        if (!body?.action || !ALLOWED_ACTIONS.has(body.action)) {
            throw new ApiError(400, "Invalid action");
        }
        if (!body.stageCode || !body.stepCode) {
            throw new ApiError(400, "stageCode and stepCode are required");
        }

        const canRunAction = body.action === "escalation_triggered"
            ? hasOperationsEscalationPermission(auth.role, auth.platform_role)
            : hasOperationsStepPermission(auth.role, auth.platform_role);

        if (!canRunAction) {
            throw new ApiError(403, "Insufficient role permissions for this operation step action");
        }

        await recordCaseStepAction({
            tenantId,
            caseId,
            actorUserId: auth.sub,
            actorRole: auth.role,
            action: body.action,
            stageCode: body.stageCode,
            stepCode: body.stepCode,
            nextDepartment: body.nextDepartment ? parseOperationDepartment(body.nextDepartment) : undefined,
            reason: body.reason,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleApiError(error);
    }
}
