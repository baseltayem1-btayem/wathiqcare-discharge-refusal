import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
    try {
        const prisma = getPrisma();

        const auth = await requireAuth(request);
        const platformAccess = hasPlatformAccess(auth);

        if (!platformAccess && !auth.tenant_id) {
            throw new ApiError(403, "Tenant context is required for subscription summary");
        }

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
