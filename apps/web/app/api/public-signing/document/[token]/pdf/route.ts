import { NextResponse, type NextRequest } from "next/server";

import { handleApiError } from "@/lib/server/http";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;

    const publicContext = await getSigningTokenContext(token);

    const lang = request.nextUrl.searchParams.get("lang") || "bilingual";
    const copy = request.nextUrl.searchParams.get("copy") || "PATIENT_COPY";

    const targetUrl = new URL(
      `/api/modules/informed-consents/documents/${encodeURIComponent(publicContext.documentId)}/pdf`,
      request.nextUrl.origin,
    );

    targetUrl.searchParams.set("publicToken", token);
    targetUrl.searchParams.set("lang", lang);
    targetUrl.searchParams.set("copy", copy);

    return NextResponse.redirect(targetUrl);
  } catch (error) {
    return handleApiError(error);
  }
}
