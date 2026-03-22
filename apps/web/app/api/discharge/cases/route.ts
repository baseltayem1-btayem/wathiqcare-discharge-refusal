import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listRefusalCases } from "@/lib/server/dischargeMedicoLegal";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "200"), 1), 500);
    const cases = await listRefusalCases(auth, limit);
    return NextResponse.json(cases);
  } catch (error) {
    return handleApiError(error);
  }
}