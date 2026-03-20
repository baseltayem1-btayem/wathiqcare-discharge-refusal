import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { resolveLegalEscalation } from "@/lib/server/dischargeMedicoLegal";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = requireAuth(request);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { resolution_notes?: string; close_case?: boolean }
      | null;

    if (!body?.resolution_notes || typeof body.resolution_notes !== "string") {
      throw new ApiError(400, "resolution_notes is required");
    }

    const escalation = await resolveLegalEscalation({
      auth,
      caseId,
      resolutionNotes: body.resolution_notes,
      closeCase: body.close_case === true,
      request,
    });

    return NextResponse.json(escalation);
  } catch (error) {
    return handleApiError(error);
  }
}