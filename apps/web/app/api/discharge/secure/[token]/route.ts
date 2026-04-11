import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { getPublicSecureLink } from "@/lib/server/secure-links";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { token } = await params;
    const payload = await getPublicSecureLink(token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}