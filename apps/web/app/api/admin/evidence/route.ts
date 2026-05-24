import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listEvidencePackages } from "@/lib/server/evidence-package-2-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);

    const mrn = request.nextUrl.searchParams.get("mrn") || undefined;
    const consent = request.nextUrl.searchParams.get("consent") || undefined;
    const dateFrom = request.nextUrl.searchParams.get("dateFrom") || undefined;
    const dateTo = request.nextUrl.searchParams.get("dateTo") || undefined;

    const rows = await listEvidencePackages(auth, {
      mrn,
      consent,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      total: rows.length,
      items: rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
