import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { revokeSecureLink } from "@/lib/server/secure-links";

type RouteContext = { params: Promise<{ caseId: string; linkId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId, linkId } = await params;

    await revokeSecureLink({
      tenantId,
      caseId,
      linkId,
      userId: auth.sub,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}