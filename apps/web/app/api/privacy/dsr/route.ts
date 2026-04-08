import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { createDataSubjectRequest, listDataSubjectRequests } from "@/lib/server/dsr-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = auth.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }
    const items = await listDataSubjectRequests(tenantId);
    return NextResponse.json(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const payload = (await request.json().catch(() => ({}))) as {
      caseId?: string | null;
      requestType?: string;
      requesterName?: string;
      requesterIdNumber?: string;
      requestReason?: string;
    };
    const created = await createDataSubjectRequest(auth, payload, request);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}