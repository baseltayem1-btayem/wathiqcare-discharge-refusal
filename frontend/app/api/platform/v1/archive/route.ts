import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { isProductionSaasUpgradeEnabled } from "@/lib/server/platform/feature-flag";
import { requireActiveSubscriptionContext } from "@/lib/server/platform/subscription-guard";
import { archiveDocumentRecord } from "@/lib/server/platform/archive-engine";

export async function GET(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    const auth = requireAuth(request);
    await requireActiveSubscriptionContext(auth.tenant_id);

    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

    const items = await prisma.document.findMany({
      where: {
        tenantId: auth.tenant_id,
        OR: query
          ? [
              { titleEn: { contains: query, mode: "insensitive" } },
              { documentCode: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isProductionSaasUpgradeEnabled()) {
      throw new ApiError(404, "Platform module is disabled");
    }

    const auth = requireAuth(request);
    await requireActiveSubscriptionContext(auth.tenant_id);

    const body = (await request.json().catch(() => null)) as {
      documentId?: string;
      metadata?: Record<string, unknown>;
    } | null;

    if (!body?.documentId) {
      throw new ApiError(400, "documentId is required");
    }

    const archived = await archiveDocumentRecord({
      tenantId: auth.tenant_id,
      documentId: body.documentId,
      actorUserId: auth.sub,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true, archived });
  } catch (error) {
    return handleApiError(error);
  }
}
