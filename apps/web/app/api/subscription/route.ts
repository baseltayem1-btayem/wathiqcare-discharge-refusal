import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
    try {
        const prisma = getPrisma();

=======
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
    try {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const auth = await requireAuth(request);
        const platformAccess = hasPlatformAccess(auth);

        if (!platformAccess && !auth.tenant_id) {
            throw new ApiError(403, "Tenant context is required for subscription summary");
        }

<<<<<<< HEAD
        const baseWhere = platformAccess
            ? {}
            : { tenantId: auth.tenant_id };

        const [total, active, trialing, pastDue, canceled, seatTotals] = await Promise.all([
            getPrisma().subscription.count({
                where: baseWhere,
            }),
            getPrisma().subscription.count({
                where: { ...baseWhere, status: "ACTIVE" },
            }),
            getPrisma().subscription.count({
                where: { ...baseWhere, status: "TRIALING" },
            }),
            getPrisma().subscription.count({
                where: { ...baseWhere, status: "PAST_DUE" },
            }),
            getPrisma().subscription.count({
                where: { ...baseWhere, status: "CANCELED" },
            }),
            getPrisma().subscription.aggregate({
                where: baseWhere,
                _sum: { seatLimit: true },
            }),
=======
        const where = platformAccess ? undefined : { tenantId: auth.tenant_id };

        const [total, active, trialing, pastDue, canceled, seatTotals] = await Promise.all([
            prisma.subscription.count({ where }),
            prisma.subscription.count({ where: { ...where, status: "ACTIVE" } }),
            prisma.subscription.count({ where: { ...where, status: "TRIALING" } }),
            prisma.subscription.count({ where: { ...where, status: "PAST_DUE" } }),
            prisma.subscription.count({ where: { ...where, status: "CANCELED" } }),
            prisma.subscription.aggregate({ where, _sum: { seatLimit: true } }),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        ]);

        return NextResponse.json(
            toJsonSafe({
                total,
                active,
                trialing,
                pastDue,
                canceled,
                totalLicensedSeats: seatTotals._sum.seatLimit ?? 0,
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
