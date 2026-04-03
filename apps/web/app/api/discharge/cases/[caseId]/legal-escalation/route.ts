import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getLegalEscalation } from "@/lib/server/dischargeMedicoLegal";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const escalation = await getLegalEscalation(auth, caseId);
    return NextResponse.json(escalation);
  } catch (error) {
    return handleApiError(error);
  }
}