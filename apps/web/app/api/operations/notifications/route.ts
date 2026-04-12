import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError, logApiFailure } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

function resolveTraceId(request: NextRequest): string {
    return (
        request.headers.get("x-trace-id")?.trim() ||
        request.headers.get("x-request-id")?.trim() ||
        `ops-notif-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
    );
}

export async function GET(request: NextRequest) {
    const traceId = resolveTraceId(request);

    try {
        const prisma = getPrisma();
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);

        const url = new URL(request.url);
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "30"), 1), 100);

        const notifications = await prisma.operationNotification.findMany({
            where: {
                tenantId,
                recipientUserId: auth.sub,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        const unread = notifications.filter((item) => !item.readAt && item.channel === "IN_APP").length;

        return NextResponse.json({ notifications: notifications ?? [], unread: unread ?? 0 });
    } catch (error) {
        logApiFailure({
            traceId,
            status: error instanceof ApiError ? error.status : 500,
            message: error instanceof ApiError ? error.message : "Failed to load operations notifications",
            error,
            code: "OPERATIONS_NOTIFICATIONS_GET_FAILED",
        });

        if (error instanceof ApiError) {
            return handleApiError(error);
        }

        return NextResponse.json(
            { notifications: [], unread: 0, traceId },
            {
                headers: {
                    "x-trace-id": traceId,
                },
            },
        );
    }
}
