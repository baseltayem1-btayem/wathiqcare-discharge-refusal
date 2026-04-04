import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
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
        console.error("OPERATIONS_NOTIFICATIONS_GET_FAILED", {
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        if (error instanceof ApiError) {
            return handleApiError(error);
        }

        return NextResponse.json({ notifications: [], unread: 0 });
    }
}
