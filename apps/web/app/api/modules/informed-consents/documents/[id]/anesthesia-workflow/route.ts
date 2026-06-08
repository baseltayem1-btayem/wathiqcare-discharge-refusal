import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

type AnesthesiaWorkflowAction =
  | "REQUEST_ANESTHESIA_REVIEW"
  | "START_ANESTHESIA_REVIEW"
  | "APPROVE_ANESTHESIA"
  | "CONFIRM_NURSING_READY";

const statusByAction: Record<AnesthesiaWorkflowAction, string> = {
  REQUEST_ANESTHESIA_REVIEW: "PENDING_ANESTHESIA_REVIEW",
  START_ANESTHESIA_REVIEW: "ANESTHESIA_IN_REVIEW",
  APPROVE_ANESTHESIA: "NURSING_PREPARATION_REQUIRED",
  CONFIRM_NURSING_READY: "NURSING_READY",
};

const summaryByAction: Record<AnesthesiaWorkflowAction, string> = {
  REQUEST_ANESTHESIA_REVIEW: "Anesthesia review requested",
  START_ANESTHESIA_REVIEW: "Anesthesia review started",
  APPROVE_ANESTHESIA: "Anesthesia section approved and nursing preparation requested",
  CONFIRM_NURSING_READY: "Nursing readiness confirmed",
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  const tenantId = requireTenantId(auth);
  const prisma = getPrisma();
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as {
    action?: AnesthesiaWorkflowAction;
    metadata?: Record<string, unknown>;
  };

  if (!body.action || !(body.action in statusByAction)) {
    return NextResponse.json(
      { ok: false, error: "Invalid anesthesia workflow action" },
      { status: 400 },
    );
  }

  const nextStatus = statusByAction[body.action];

  await prisma.informedConsentTimelineEvent.create({
    data: {
      tenantId,
      documentId: id,
      action: body.action,
      actorUserId: auth.sub,
      actorRole: "PHYSICIAN",
      source: "physician-portal",
      metadata: {
        summary: summaryByAction[body.action],
        statusAfterAction: nextStatus,
        ...(body.metadata || {}),
      },
    },
  });

  return NextResponse.json({
    ok: true,
    documentId: id,
    action: body.action,
    status: nextStatus,
    summary: summaryByAction[body.action],
  });
}