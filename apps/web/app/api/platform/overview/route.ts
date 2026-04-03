import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { getSetupStatus } from "@/lib/server/admin-bootstrap";

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

<<<<<<< HEAD
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
=======
        const [setupStatus, tenantCount, subscriptionCount, activeSubscriptionCount, totalSeatLimit, totalInvoices, openInvoices] = await Promise.all([
            getSetupStatus(),
            prisma.tenant.count(),
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: "ACTIVE" } }),
            prisma.subscription.aggregate({ _sum: { seatLimit: true } }),
            prisma.invoice.count(),
            prisma.invoice.count({ where: { status: "OPEN" } }),
        ]);

        const tenants = await prisma.tenant.findMany({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
