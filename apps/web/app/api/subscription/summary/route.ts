import { NextRequest, NextResponse } from "next/server";
import { hasPlatformAccess, requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError, jsonSuccess } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const platformAccess = hasPlatformAccess(auth);

        if (!platformAccess && !auth.tenant_id) {
            throw new ApiError(403, "Tenant context is required for subscription summary");
        }

        const where = platformAccess ? undefined : { tenantId: auth.tenant_id };

        const prisma = getPrisma();
        const [total, active, trialing, pastDue, canceled, seatTotals] = await Promise.all([
            prisma.subscription.count({ where }),
            prisma.subscription.count({ where: { ...where, status: "ACTIVE" } }),
            prisma.subscription.count({ where: { ...where, status: "TRIALING" } }),
            prisma.subscription.count({ where: { ...where, status: "PAST_DUE" } }),
            prisma.subscription.count({ where: { ...where, status: "CANCELED" } }),
            prisma.subscription.aggregate({ where, _sum: { seatLimit: true } }),
        ]);

        return jsonSuccess(
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
