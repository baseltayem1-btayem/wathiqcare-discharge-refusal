import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { refreshLegalPackageSignatureStatus } from "@/lib/server/legal-package-module-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await params;
    const result = await refreshLegalPackageSignatureStatus(auth, caseId, request);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
