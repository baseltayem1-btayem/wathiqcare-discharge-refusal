import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getWorkflowSnapshot } from "@/lib/server/dischargeRefusalWorkflow";
import { getLegalReadiness } from "@/lib/server/legal-readiness-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

type ReadinessResponse = {
  ready_for_legal: boolean;
  reason?: string;
};

function toWorkflowReadiness(workflow: Awaited<ReturnType<typeof getWorkflowSnapshot>>): ReadinessResponse {
  const hasRequiredEvidence = Boolean(
    workflow.refusal_form_generated_at ||
      workflow.financial_notice_generated_at ||
      workflow.documents?.length,
  );

  if (workflow.escalation_required) {
    return {
      ready_for_legal: false,
      reason: "Legal escalation is still required before closure.",
    };
  }

  return {
    ready_for_legal: hasRequiredEvidence,
    reason: hasRequiredEvidence
      ? undefined
      : "Generate the refusal form or legal package to complete the case evidence.",
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;

    const [workflow, legalReadiness] = await Promise.all([
      getWorkflowSnapshot(auth, caseId),
      getLegalReadiness(auth, caseId).catch(() => null),
    ]);

    if (legalReadiness) {
      return NextResponse.json({
        ready_for_legal: legalReadiness.readyForLegal,
        reason: legalReadiness.blockers[0],
      } satisfies ReadinessResponse);
    }

    return NextResponse.json(toWorkflowReadiness(workflow));
  } catch (error) {
    return handleApiError(error);
  }
}
