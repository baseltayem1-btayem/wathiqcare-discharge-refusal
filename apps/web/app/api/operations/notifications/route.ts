import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
    try {
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

        return NextResponse.json({ notifications, unread });
    } catch (error) {
        return handleApiError(error);
    }
}
