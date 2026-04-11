import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listSecureLinks } from "@/lib/server/secure-links";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;
    const links = await listSecureLinks(tenantId, caseId);
    return NextResponse.json(links);
  } catch (error) {
    return handleApiError(error);
  }
}