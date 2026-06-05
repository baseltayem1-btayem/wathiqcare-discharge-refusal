import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { appendConsentTimelineEvent, listConsentTimeline } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { id } = await params;
    const payload = await request.json();
    const timeline = await appendConsentTimelineEvent(auth, id, payload, request);
    return NextResponse.json(toJsonSafe(timeline), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

