import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { upsertConsentEmrMapping } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { id } = await params;
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const mapping = await upsertConsentEmrMapping(auth, id, (payload || {}) as Record<string, unknown>, request);
    return NextResponse.json(toJsonSafe(mapping), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
