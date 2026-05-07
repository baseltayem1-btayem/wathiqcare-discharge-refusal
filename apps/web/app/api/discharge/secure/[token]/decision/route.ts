import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { submitPublicSecureLinkDecision } from "@/lib/server/secure-links";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { token } = await params;
    const body = (await request.json().catch(() => null)) as {
      decision?: "accept" | "refuse";
      typed_name?: string;
      refusal_acknowledged?: boolean;
      signature_data?: string;
    } | null;

    const response = await submitPublicSecureLinkDecision(token, {
      decision: body?.decision ?? "refuse",
      typed_name: body?.typed_name ?? "",
      refusal_acknowledged: body?.refusal_acknowledged,
      signature_data: body?.signature_data,
    }, request);

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}