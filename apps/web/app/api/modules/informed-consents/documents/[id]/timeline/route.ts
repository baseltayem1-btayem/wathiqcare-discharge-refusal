import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { listConsentTimeline } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { id } = await params;
    const timeline = await listConsentTimeline(auth, id);
    return NextResponse.json(toJsonSafe(timeline));
  } catch (error) {
    return handleApiError(error);
  }
}
