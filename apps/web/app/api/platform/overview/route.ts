import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { getSetupStatus } from "@/lib/server/admin-bootstrap";

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

        const prisma = getPrisma();

        const [
            setupStatus,
            tenantCount,
            subscriptionCount,
            activeSubscriptionCount,
            totalSeatLimit,
            totalInvoices,
            openInvoices,
        ] = await Promise.all([
            getSetupStatus(),
            getPrisma().tenant.count(),
            getPrisma().subscription.count(),
            getPrisma().subscription.count({
                where: { status: "ACTIVE" },
            }),
            getPrisma().subscription.aggregate({
                _sum: { seatLimit: true },
            }),
            getPrisma().invoice.count(),
            getPrisma().invoice.count({
                where: { status: "OPEN" },
            }),
        ]);

        const tenants = await getPrisma().tenant.findMany({
            include: {
                _count: {
                    select: {
                        memberships: true,
                        cases: true,
                    },
                },
                subscriptions: {
                    include: {
                        plan: {
                            select: {
                                code: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        const summary = {
            setupStatus,
            metrics: {
                tenantCount,
                subscriptionCount,
                activeSubscriptionCount,
                openInvoices,
            },
            subscriptionSummary: {
                active: activeSubscriptionCount,
                total: subscriptionCount,
            },
            seatSummary: {
                totalLicensedSeats: totalSeatLimit._sum.seatLimit ?? 0,
            },
            billingSummary: {
                invoiceCount: totalInvoices,
                openInvoiceCount: openInvoices,
            },
            tenants,
        };

        return NextResponse.json(toJsonSafe(summary));
    } catch (error) {
        return handleApiError(error);
    }
}
