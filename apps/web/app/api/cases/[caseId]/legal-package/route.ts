import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import {
  generateLegalPackageModule,
  getLegalPackageModule,
} from "@/lib/server/legal-package-module-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const result = await getLegalPackageModule(auth, caseId);

    return NextResponse.json({
      ...result,
      version: result.compatibility.version,
      generated_at: result.generated_at,
      download_url: result.compatibility.download_url,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const result = await generateLegalPackageModule(auth, caseId, request);

    return NextResponse.json({
      ...result,
      version: result.compatibility.version,
      generated_at: result.generated_at,
      download_url: result.compatibility.download_url,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
