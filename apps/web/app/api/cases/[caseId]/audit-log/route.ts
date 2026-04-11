import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { requireAuth, requireTenantId, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

type RouteContext = {
    params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const prisma = getPrisma();
        const auth = await requireAuth(request);
        requireTenantOperationalAccess(auth);
        const tenantId = requireTenantId(auth);
        const { caseId } = await context.params;

        const auditLogs = await prisma.auditLog.findMany({
            where: { tenantId, caseId },
            include: {
                user: { select: { id: true, fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        }).catch((error) => {
            if (error && typeof error === "object" && ((error as { code?: unknown }).code === "P2021" || (error as { code?: unknown }).code === "P2022")) {
                console.warn("case-audit-log: audit_logs table missing; returning empty audit trail");
                return [];
            }
            throw error;
        });

        return NextResponse.json(toJsonSafe(auditLogs));
    } catch (error) {
        return handleApiError(error);
    }
}
