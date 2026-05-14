import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = await getSigningTokenContext(token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
