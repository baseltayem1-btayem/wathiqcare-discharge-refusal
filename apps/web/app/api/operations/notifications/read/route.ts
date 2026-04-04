import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma();
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);

        const body = (await request.json().catch(() => ({}))) as { notificationIds?: string[]; all?: boolean };
        const now = new Date();

        if (body.all) {
            await prisma.operationNotification.updateMany({
                where: {
                    tenantId,
                    recipientUserId: auth.sub,
                    channel: "IN_APP",
                    readAt: null,
                },
                data: { readAt: now },
            });
            return NextResponse.json({ ok: true });
        }

        if (!Array.isArray(body.notificationIds) || body.notificationIds.length === 0) {
            throw new ApiError(400, "notificationIds is required when all=false");
        }

        await prisma.operationNotification.updateMany({
            where: {
                tenantId,
                recipientUserId: auth.sub,
                id: { in: body.notificationIds },
            },
            data: { readAt: now },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleApiError(error);
    }
}
