import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

<<<<<<< HEAD
export async function POST(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    const body = (await request.json().catch(() => ({}))) as { notificationIds?: string[]; all?: boolean };
    const now = new Date();

    if (body.all) {
<<<<<<< HEAD
        await getPrisma().operationNotification.updateMany({
=======
        await prisma.operationNotification.updateMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
    await getPrisma().operationNotification.updateMany({
=======
    await prisma.operationNotification.updateMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
