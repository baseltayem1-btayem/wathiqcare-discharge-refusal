import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { applyWorkflowAction } from "@/lib/server/dischargeRefusalWorkflow";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as
      | { action?: string; payload?: Record<string, unknown> }
      | null;

    if (!body?.action || typeof body.action !== "string") {
      throw new ApiError(400, "Workflow action is required");
    }

    const result = await applyWorkflowAction({
      auth,
      caseId,
      action: body.action as Parameters<typeof applyWorkflowAction>[0]["action"],
      payload: body.payload ?? {},
      request,
    });

    return NextResponse.json({
      workflow: result.workflow,
      generatedDocument: result.generatedDocument,
      generated_document: result.generatedDocument,
    });
  } catch (error) {
    return handleApiError(error);
  }
}