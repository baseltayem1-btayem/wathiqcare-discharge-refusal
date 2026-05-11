import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { createConsentDocument, listConsentDocuments } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");

    const url = new URL(request.url);
    const docs = await listConsentDocuments(auth, {
      caseId: url.searchParams.get("caseId") || undefined,
      status: url.searchParams.get("status") || undefined,
      limit: Number(url.searchParams.get("limit") || "50"),
    });

    return NextResponse.json(toJsonSafe(docs));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const created = await createConsentDocument(auth, (payload || {}) as Record<string, unknown>, request);

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
