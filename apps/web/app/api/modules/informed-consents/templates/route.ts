import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { listRuntimeConsentTemplates } from "@/lib/server/informed-consents-template-catalog";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/modules/informed-consents/templates
 * Get available consent templates filtered by type and specialty
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    const templates = await listRuntimeConsentTemplates(auth, {
      consentType: searchParams.get("type") || undefined,
      specialty: searchParams.get("specialty") || undefined,
      department: searchParams.get("department") || undefined,
    });

    return NextResponse.json(toJsonSafe(templates));
  } catch (error) {
    return handleApiError(error);
  }
}
