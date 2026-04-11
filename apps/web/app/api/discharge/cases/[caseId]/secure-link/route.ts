import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { createSecureLink } from "@/lib/server/secure-links";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as { recipient_email?: string } | null;
    const result = await createSecureLink({
      tenantId,
      userId: auth.sub,
      caseId,
      recipientEmail: body?.recipient_email ?? "",
      request,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}