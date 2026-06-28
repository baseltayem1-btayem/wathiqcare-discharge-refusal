import { NextRequest, NextResponse } from "next/server";
import { recordPublicEducationEvent } from "@/lib/server/public-signing-service";
import { ApiError } from "@/lib/server/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const result = await recordPublicEducationEvent({
      token,
      request,
      eventType: body.eventType,
      language: body.language,
      durationSeconds: body.durationSeconds,
      scrollCompletion: body.scrollCompletion,
      assetViews: body.assetViews,
      acknowledgement: body.acknowledgement,
    });
    return NextResponse.json({ ok: true, education: result });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to record education event" },
      { status: 500 },
    );
  }
}
