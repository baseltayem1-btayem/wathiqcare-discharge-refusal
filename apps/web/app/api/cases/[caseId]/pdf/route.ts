import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getLatestCasePdf } from "@/lib/server/legal-case-pdf-service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const result = await getLatestCasePdf(auth, caseId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
