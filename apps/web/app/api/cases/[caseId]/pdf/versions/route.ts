import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { listCasePdfVersions } from "@/lib/server/legal-case-pdf-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const versions = await listCasePdfVersions(auth, caseId);
    return NextResponse.json({ versions });
  } catch (error) {
    return handleApiError(error);
  }
}
