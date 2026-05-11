import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { listConsentLibrary, upsertProcedureCatalog } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const result = await listConsentLibrary(auth);
    return NextResponse.json(toJsonSafe(result.procedures || []));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const record = await upsertProcedureCatalog(auth, (payload || {}) as Record<string, unknown>, request);
    return NextResponse.json(toJsonSafe(record), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
