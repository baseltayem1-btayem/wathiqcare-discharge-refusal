import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { generateCasePdfReport } from "@/lib/server/legal-case-pdf-service";

type RouteContext = {
  params: Promise<{ caseId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const { caseId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { mode?: "draft" | "final"; language?: "en" | "ar"; regenerate?: boolean }
      | null;

    const requestedFinal = body?.mode === "final";
    const trigger = body?.regenerate ? "manual_regenerate" : "manual_generate";

    const result = await generateCasePdfReport({
      auth,
      caseId,
      request,
      trigger,
      requestedFinal,
      language: body?.language === "ar" ? "ar" : "en",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          detail: error.message,
        },
        { status: error.status },
      );
    }
    return handleApiError(error);
  }
}
