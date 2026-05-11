import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { handleApiError } from "@/lib/server/http";
import { getIntegrationStatus } from "@/lib/server/trakcare/service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "audit:view");

    const status = getIntegrationStatus();
    return NextResponse.json(status);
  } catch (error) {
    return handleApiError(error);
  }
}
