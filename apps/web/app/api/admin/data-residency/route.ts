import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { requireAuth, requireTenantOperationalAccess } = await import("@/lib/server/auth");
    const { getDataResidencyDashboard } = await import("@/lib/server/privacy-service");
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
