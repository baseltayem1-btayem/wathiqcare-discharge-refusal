import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getDataResidencyDashboard } from "@/lib/server/privacy-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    if (!auth.tenant_id) {
      return NextResponse.json({ message: "Tenant context is required" }, { status: 403 });
    }
    const dashboard = await getDataResidencyDashboard(auth.tenant_id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return handleApiError(error);
  }
}