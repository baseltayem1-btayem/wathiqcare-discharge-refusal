
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

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
        const prisma = getPrisma();
        await requirePlatformAccess(request);
        const subscriptions = await prisma.subscription.findMany({
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
            tenantName: sub.tenant?.name ?? "Unknown",
            planCode: sub.plan?.code ?? "UNKNOWN",
            billingInterval: sub.billingInterval,
            status: sub.status,
            seatLimit: sub.seatLimit ?? 0,
            currentSeats: sub.tenant?._count?.memberships ?? 0,
        }));
        return NextResponse.json(toJsonSafe(result));
    } catch (error) {
        return handleApiError(error);
    }
}
