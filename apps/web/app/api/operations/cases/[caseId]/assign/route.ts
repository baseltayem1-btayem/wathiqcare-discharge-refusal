import { OperationPriority } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { assignCaseOperation, parseOperationDepartment } from "@/lib/server/operations";

type RouteContext = { params: Promise<{ caseId: string }> };

function parsePriority(input: unknown): OperationPriority | undefined {
    if (typeof input !== "string" || !input.trim()) return undefined;
    const normalized = input.trim().toUpperCase();
    if ((Object.values(OperationPriority) as string[]).includes(normalized)) {
        return normalized as OperationPriority;
    }
    throw new ApiError(400, "Invalid priority");
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);
        const { caseId } = await params;

        await requireTenantPermissionForAuth(auth, tenantId, "clinical.case.assign", {
            allowPlatform: false,
        });

        const body = (await request.json().catch(() => null)) as
            | {
                toUserId?: string | null;
                toDepartment?: string;
                reason?: string;
                priority?: string;
            }
            | null;

        if (!body?.toDepartment) {
            throw new ApiError(400, "toDepartment is required");
        }

        await assignCaseOperation({
            tenantId,
            caseId,
            actorUserId: auth.sub,
            actorRole: auth.role,
            toUserId: body.toUserId ?? null,
            toDepartment: parseOperationDepartment(body.toDepartment),
            reason: body.reason?.trim() || undefined,
            priority: parsePriority(body.priority),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleApiError(error);
    }
}
