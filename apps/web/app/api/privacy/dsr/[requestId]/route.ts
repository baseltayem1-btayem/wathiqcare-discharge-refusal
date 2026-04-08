import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { updateDataSubjectRequest } from "@/lib/server/dsr-service";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const { requestId } = await params;
    const payload = (await request.json().catch(() => ({}))) as {
      status?: string;
      extendByDays?: number;
      extensionReason?: string;
    };
    const updated = await updateDataSubjectRequest(auth, requestId, payload, request);
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}