import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { getPublicSigningDocument } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = await getPublicSigningDocument({
      token,
      request,
    });
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}