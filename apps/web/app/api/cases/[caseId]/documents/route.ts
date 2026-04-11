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

        const documents = await prisma.document.findMany({
            where: { tenantId, caseId },
            include: {
                generatedBy: { select: { fullName: true } },
                signedBy: { select: { fullName: true } },
            },
            orderBy: { generatedAt: "desc" },
        });

        return NextResponse.json(toJsonSafe(documents));
    } catch (error) {
        return handleApiError(error);
    }
}
