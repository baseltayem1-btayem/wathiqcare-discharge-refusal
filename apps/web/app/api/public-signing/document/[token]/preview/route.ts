import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/server/http";
import { getPublicSigningPreviewDocument } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const payload = await getPublicSigningPreviewDocument({ token });
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}