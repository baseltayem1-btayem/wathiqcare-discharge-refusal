import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { updateLegalEscalationPriority } from "@/lib/server/dischargeMedicoLegal";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = requireAuth(request);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as { priority?: string } | null;

    if (!body?.priority || typeof body.priority !== "string") {
      throw new ApiError(400, "priority is required");
    }

    const escalation = await updateLegalEscalationPriority({
      auth,
      caseId,
      priority: body.priority,
      request,
    });

    return NextResponse.json(escalation);
  } catch (error) {
    return handleApiError(error);
  }
}