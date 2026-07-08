import { NextRequest, NextResponse } from "next/server";
import { recordPublicDecisionEvent } from "@/lib/server/public-signing-decision-service";
import { ApiError } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await recordPublicDecisionEvent({
      token,
      request,
      eventType: body.eventType,
      refusalAcknowledged: body.refusalAcknowledged,
    });
    return NextResponse.json({ ok: true, decision: result });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to record decision event" },
      { status: 500 },
    );
  }
}
