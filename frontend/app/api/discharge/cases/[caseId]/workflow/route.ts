import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getWorkflowSnapshot } from "@/lib/server/dischargeRefusalWorkflow";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = requireAuth(request);
    const { caseId } = await params;
    const workflow = await getWorkflowSnapshot(auth, caseId);
    return NextResponse.json(workflow);
  } catch (error) {
    return handleApiError(error);
  }
}