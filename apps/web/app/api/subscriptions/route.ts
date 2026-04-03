import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

type SubscriptionListItem = {
    id: string;
    tenantId: string;
    tenantName: string;
    planCode: string;
    billingInterval: string;
    status: string;
    seatLimit: number;
    currentSeats: number;
};

export async function GET(request: NextRequest) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma();

        await requirePlatformAccess(request);

        const subscriptions = await getPrisma().subscription.findMany({
=======
        await requirePlatformAccess(request);

        const subscriptions = await prisma.subscription.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        _count: {
                            select: {
                                memberships: true,
                            },
                        },
                    },
                },
                plan: {
                    select: {
                        code: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
        });

        const result: SubscriptionListItem[] = subscriptions.map((sub) => ({
            id: sub.id,
            tenantId: sub.tenantId,
<<<<<<< HEAD
            tenantName: sub.tenant?.name ?? "Unknown",
            planCode: sub.plan?.code ?? "UNKNOWN",
            billingInterval: sub.billingInterval,
            status: sub.status,
            seatLimit: sub.seatLimit ?? 0,
            currentSeats: sub.tenant?._count?.memberships ?? 0,
=======
            tenantName: sub.tenant?.name || "Unknown",
            planCode: sub.plan?.code || "UNKNOWN",
            billingInterval: sub.billingInterval,
            status: sub.status,
            seatLimit: sub.seatLimit,
            currentSeats: sub.tenant?._count.memberships ?? 0,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        }));

        return NextResponse.json(toJsonSafe(result));
    } catch (error) {
        return handleApiError(error);
    }
}
